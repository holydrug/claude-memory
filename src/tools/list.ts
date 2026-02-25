import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StorageBackend } from "../types.js";

export function registerListTool(server: McpServer, db: StorageBackend): void {
  server.tool(
    "memory_list_entities",
    "List all entities in the knowledge graph. Optionally filtered by name pattern. Use when user says: что в памяти, покажи всю память, list entities, what's in memory.",
    {
      pattern: z
        .string()
        .optional()
        .describe(
          "Optional filter pattern (case-insensitive contains match)"
        ),
    },
    async ({ pattern }) => {
      const entities = await db.listEntities(pattern);

      if (entities.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No entities found." }],
        };
      }

      const lines = [`Entities (${entities.length}):`];
      for (const e of entities) {
        lines.push(`  ${e.name} (${e.factCount} facts)`);
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    }
  );
}
