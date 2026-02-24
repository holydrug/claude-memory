#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { initDb } from "./db.js";
import { initEmbeddings } from "./embeddings.js";
import { registerStoreTool } from "./tools/store.js";
import { registerSearchTool } from "./tools/search.js";
import { registerGraphTool } from "./tools/graph.js";
import { registerListTool } from "./tools/list.js";

// CLI subcommands
const command = process.argv[2];

if (command === "init") {
  const { runInit } = await import("./init.js");
  await runInit();
  process.exit(0);
}

if (command === "version" || command === "--version" || command === "-v") {
  console.log("claude-memory 0.1.0");
  process.exit(0);
}

if (command === "help" || command === "--help" || command === "-h") {
  console.log(`claude-memory — Semantic memory MCP server for Claude Code

Usage:
  claude-memory          Start MCP server (stdio transport)
  claude-memory init     Add to ~/.claude.json and activate
  claude-memory version  Show version

Environment variables:
  CLAUDE_MEMORY_DIR          Data directory (default: ~/.cache/claude-memory)
  CLAUDE_MEMORY_DB           SQLite database path
  CLAUDE_MEMORY_MODEL_CACHE  Embedding model cache directory
`);
  process.exit(0);
}

// MCP Server mode
const server = new McpServer({
  name: "semantic-memory",
  version: "0.1.0",
});

const db = initDb();
const embed = await initEmbeddings();

registerStoreTool(server, db, embed);
registerSearchTool(server, db, embed);
registerGraphTool(server, db);
registerListTool(server, db);

const transport = new StdioServerTransport();
await server.connect(transport);

// Graceful shutdown
process.on("SIGINT", () => {
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  db.close();
  process.exit(0);
});
