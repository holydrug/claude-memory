import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageBackend } from "../types.js";

export function registerGraphTool(server: McpServer, db: StorageBackend): void {
  server.tool(
    "memory_graph",
    "Explore the knowledge graph around an entity. Returns connected facts and entities. Use when user says: покажи граф, что связано с, graph, connections.",
    {
      entity: z
        .string()
        .describe("Entity name to explore (fuzzy match supported)"),
      depth: z
        .number()
        .int()
        .min(1)
        .max(5)
        .optional()
        .describe("Traversal depth (default 2)"),
    },
    async ({ entity, depth }) => {
      const result = await db.graphTraverse(entity, depth ?? 2);

      if (!result) {
        return {
          content: [
            { type: "text" as const, text: `Entity '${entity}' not found.` },
          ],
        };
      }

      const lines = [`Graph around: ${result.matchedName}`];

      lines.push(
        `\nConnected entities (${result.entities.length}): ${result.entities.sort().join(", ") || "none"}`
      );

      lines.push(`\nFacts (${result.facts.length}):`);
      for (const f of result.facts) {
        lines.push(
          `  [${f.subject}] -[${f.predicate}]-> [${f.object}]: ${f.fact}`
        );
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
