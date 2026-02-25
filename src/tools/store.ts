import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageBackend, EmbedFn } from "../types.js";
import type { Config } from "../config.js";
import { buildDescription } from "../triggers.js";

export function registerStoreTool(
  server: McpServer,
  db: StorageBackend,
  embed: EmbedFn,
  config: Config
): void {
  server.tool(
    "memory_store",
    buildDescription("store", config.triggersStore),
    {
      subject: z
        .string()
        .describe("Subject entity in English (e.g. 'billing-service')"),
      predicate: z
        .string()
        .describe(
          "Relationship verb in English (e.g. 'uses', 'depends_on', 'has_pattern')"
        ),
      object: z
        .string()
        .describe("Object entity in English (e.g. 'PostgreSQL 16')"),
      fact: z.string().describe("Full fact description (any language)"),
      context: z.string().describe("Source context or snippet"),
      source: z
        .string()
        .optional()
        .describe("Source file path or URL (optional)"),
    },
    async ({ subject, predicate, object, fact, context, source }) => {
      const [subjectEmb, objectEmb, factEmb] = await Promise.all([
        embed(subject),
        embed(object),
        embed(fact),
      ]);

      const subjectId = await db.findOrCreateEntity(subject, subjectEmb);
      const objectId = await db.findOrCreateEntity(object, objectEmb);

      await db.storeFact({
        subjectId,
        predicate,
        objectId,
        content: fact,
        context,
        source: source ?? "",
        embedding: factEmb,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Stored: [${subject}] -[${predicate}]-> [${object}]\nFact: ${fact}`,
          },
        ],
      };
    }
  );
}
