import neo4j, { type Driver, type Session } from "neo4j-driver";
import { getConfig } from "./config.js";
import type {
  StoreFact,
  SearchResult,
  GraphResult,
  EntityInfo,
  StorageBackend,
} from "./types.js";

const SCHEMA_QUERIES = [
  "CREATE CONSTRAINT entity_name IF NOT EXISTS FOR (e:Entity) REQUIRE e.name IS UNIQUE",
];

function vectorIndexQuery(indexName: string, label: string, dim: number): string {
  return `CREATE VECTOR INDEX ${indexName} IF NOT EXISTS
    FOR (n:${label}) ON (n.embedding)
    OPTIONS {indexConfig: {
      \`vector.dimensions\`: ${dim},
      \`vector.similarity_function\`: 'cosine'
    }}`;
}

async function ensureSchema(session: Session, dim: number): Promise<void> {
  for (const q of SCHEMA_QUERIES) {
    await session.run(q);
  }
  await session.run(vectorIndexQuery("entity_embedding", "Entity", dim));
  await session.run(vectorIndexQuery("fact_embedding", "Fact", dim));
  await session.run(
    "CREATE FULLTEXT INDEX fact_content IF NOT EXISTS FOR (f:Fact) ON EACH [f.content, f.context]",
  );
}

export function initNeo4j(): StorageBackend {
  const config = getConfig();
  const driver: Driver = neo4j.driver(
    config.neo4jUri,
    neo4j.auth.basic(config.neo4jUser, config.neo4jPassword),
  );

  let schemaReady = false;

  async function withSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
    const session = driver.session();
    try {
      if (!schemaReady) {
        await ensureSchema(session, config.embeddingDim);
        schemaReady = true;
      }
      return await fn(session);
    } finally {
      await session.close();
    }
  }

  async function findOrCreateEntity(name: string, embedding: Float32Array): Promise<number> {
    return withSession(async (session) => {
      const result = await session.run(
        `MERGE (e:Entity {name: $name})
         ON CREATE SET e.created_at = datetime(), e.embedding = $emb
         ON MATCH SET e.embedding = $emb
         RETURN id(e) AS id`,
        { name, emb: Array.from(embedding) },
      );
      const record = result.records[0];
      return record!.get("id").toNumber();
    });
  }

  async function storeFact(params: StoreFact): Promise<number> {
    return withSession(async (session) => {
      const result = await session.run(
        `MATCH (subj:Entity) WHERE id(subj) = $subjectId
         MATCH (obj:Entity) WHERE id(obj) = $objectId
         CREATE (f:Fact {
           predicate: $predicate,
           content: $content,
           context: $context,
           source: $source,
           embedding: $embedding,
           created_at: datetime()
         })
         CREATE (subj)-[:SUBJECT_OF]->(f)
         CREATE (f)-[:OBJECT_IS]->(obj)
         RETURN id(f) AS id`,
        {
          subjectId: neo4j.int(params.subjectId),
          objectId: neo4j.int(params.objectId),
          predicate: params.predicate,
          content: params.content,
          context: params.context,
          source: params.source,
          embedding: Array.from(params.embedding),
        },
      );
      const record = result.records[0];
      return record!.get("id").toNumber();
    });
  }

  async function searchFacts(embedding: Float32Array, limit: number): Promise<SearchResult[]> {
    return withSession(async (session) => {
      const result = await session.run(
        `CALL db.index.vector.queryNodes('fact_embedding', $limit, $embedding)
         YIELD node AS f, score
         MATCH (subj:Entity)-[:SUBJECT_OF]->(f)-[:OBJECT_IS]->(obj:Entity)
         RETURN subj.name AS subject, f.predicate AS predicate, obj.name AS object,
                f.content AS fact, f.context AS context, f.source AS source,
                score
         ORDER BY score DESC`,
        { limit: neo4j.int(limit), embedding: Array.from(embedding) },
      );

      return result.records.map((r) => ({
        subject: r.get("subject") as string,
        predicate: r.get("predicate") as string,
        object: r.get("object") as string,
        fact: r.get("fact") as string,
        context: r.get("context") as string,
        source: (r.get("source") as string) || "",
        score: r.get("score") as number,
      }));
    });
  }

  async function graphTraverse(
    entityName: string,
    depth: number,
  ): Promise<GraphResult | null> {
    return withSession(async (session) => {
      // Fuzzy find entity
      const matchResult = await session.run(
        `MATCH (e:Entity)
         WHERE toLower(e.name) CONTAINS toLower($name)
         RETURN e.name AS name
         ORDER BY size(e.name) ASC
         LIMIT 1`,
        { name: entityName },
      );

      if (matchResult.records.length === 0) return null;
      const matchedName = matchResult.records[0]!.get("name") as string;

      // Traverse graph
      const traverseResult = await session.run(
        `MATCH path = (start:Entity {name: $name})-[:SUBJECT_OF|OBJECT_IS*1..${depth * 2}]-(connected)
         WHERE connected:Entity OR connected:Fact
         WITH connected, length(path) AS dist
         ORDER BY dist
         WITH collect(DISTINCT connected) AS nodes
         UNWIND nodes AS n
         OPTIONAL MATCH (s:Entity)-[:SUBJECT_OF]->(n)-[:OBJECT_IS]->(o:Entity) WHERE n:Fact
         RETURN labels(n)[0] AS type, n.name AS entity_name,
                s.name AS subject, n.predicate AS predicate, o.name AS object,
                n.content AS fact`,
        { name: matchedName },
      );

      const entities: string[] = [];
      const facts: GraphResult["facts"] = [];

      for (const r of traverseResult.records) {
        const type = r.get("type") as string;
        if (type === "Entity") {
          const eName = r.get("entity_name") as string | null;
          if (eName && eName !== matchedName) entities.push(eName);
        } else if (type === "Fact") {
          const subject = r.get("subject") as string | null;
          if (subject) {
            facts.push({
              subject,
              predicate: r.get("predicate") as string,
              object: r.get("object") as string,
              fact: r.get("fact") as string,
            });
          }
        }
      }

      return { matchedName, entities, facts };
    });
  }

  async function listEntities(pattern?: string): Promise<EntityInfo[]> {
    return withSession(async (session) => {
      const query = pattern
        ? `MATCH (e:Entity)
           WHERE toLower(e.name) CONTAINS toLower($pattern)
           OPTIONAL MATCH (e)-[:SUBJECT_OF]->(f:Fact)
           RETURN e.name AS name, count(f) AS fact_count
           ORDER BY e.name`
        : `MATCH (e:Entity)
           OPTIONAL MATCH (e)-[:SUBJECT_OF]->(f:Fact)
           RETURN e.name AS name, count(f) AS fact_count
           ORDER BY e.name`;

      const result = await session.run(query, pattern ? { pattern } : {});

      return result.records.map((r) => ({
        name: r.get("name") as string,
        factCount: (r.get("fact_count") as neo4j.Integer).toNumber(),
      }));
    });
  }

  async function close(): Promise<void> {
    await driver.close();
  }

  return {
    findOrCreateEntity,
    storeFact,
    searchFacts,
    graphTraverse,
    listEntities,
    close,
  };
}
