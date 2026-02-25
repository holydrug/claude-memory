#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { getConfig } from "./config.js";
import { initDb, sqliteBackend } from "./db.js";
import { initNeo4j } from "./neo4j.js";
import { initEmbeddings } from "./embeddings.js";
import { registerStoreTool } from "./tools/store.js";
import { registerSearchTool } from "./tools/search.js";
import { registerGraphTool } from "./tools/graph.js";
import { registerListTool } from "./tools/list.js";
import type { StorageBackend } from "./types.js";

// CLI subcommands
const command = process.argv[2];

if (command === "init") {
  const { runInit } = await import("./init.js");
  await runInit();
  process.exit(0);
}

if (command === "version" || command === "--version" || command === "-v") {
  console.log("semantic-memory-mcp 0.3.0");
  process.exit(0);
}

if (command === "help" || command === "--help" || command === "-h") {
  console.log(`semantic-memory-mcp — Semantic memory MCP server for Claude Code

Usage:
  semantic-memory-mcp          Start MCP server (stdio transport)
  semantic-memory-mcp init     Add to ~/.claude.json and activate
  semantic-memory-mcp version  Show version

Environment variables:
  STORAGE_PROVIDER           "sqlite" (default) or "neo4j"
  CLAUDE_MEMORY_DIR          Data directory (default: ~/.cache/claude-memory)
  CLAUDE_MEMORY_DB           SQLite database path
  CLAUDE_MEMORY_MODEL_CACHE  Embedding model cache directory

  EMBEDDING_PROVIDER         "builtin" (default) or "ollama"
  EMBEDDING_DIM              Embedding dimension (default: 384 for builtin, 768 for ollama)

  OLLAMA_URL                 Ollama API endpoint (default: http://localhost:11434)
  OLLAMA_MODEL               Ollama embedding model (default: nomic-embed-text)

  NEO4J_URI                  Neo4j bolt URI (default: bolt://localhost:7687)
  NEO4J_USER                 Neo4j username (default: neo4j)
  NEO4J_PASSWORD             Neo4j password (default: memory_pass_2024)

  MEMORY_TRIGGERS_STORE      Extra trigger words for memory_store (comma-separated)
  MEMORY_TRIGGERS_SEARCH     Extra trigger words for memory_search (comma-separated)
  MEMORY_TRIGGERS_GRAPH      Extra trigger words for memory_graph (comma-separated)
  MEMORY_TRIGGERS_LIST       Extra trigger words for memory_list_entities (comma-separated)
`);
  process.exit(0);
}

// MCP Server mode
const server = new McpServer({
  name: "semantic-memory",
  version: "0.3.0",
});

const config = getConfig();

let backend: StorageBackend;
if (config.storageProvider === "neo4j") {
  console.error("[claude-memory] Using Neo4j storage backend");
  backend = initNeo4j();
} else {
  console.error("[claude-memory] Using SQLite storage backend");
  backend = sqliteBackend(initDb());
}

const embed = await initEmbeddings();

registerStoreTool(server, backend, embed, config);
registerSearchTool(server, backend, embed, config);
registerGraphTool(server, backend, config);
registerListTool(server, backend, config);

const transport = new StdioServerTransport();
await server.connect(transport);

// Graceful shutdown
const shutdown = async () => {
  await backend.close();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
