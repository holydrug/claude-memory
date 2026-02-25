import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export interface Config {
  storageProvider: "sqlite" | "neo4j";
  dbPath: string;
  modelCacheDir: string;
  embeddingProvider: "builtin" | "ollama";
  embeddingModel: string;
  embeddingDim: number;
  ollamaUrl: string;
  ollamaModel: string;
  neo4jUri: string;
  neo4jUser: string;
  neo4jPassword: string;
}

const DEFAULT_DIM = {
  builtin: 384,
  ollama: 768,
} as const;

export function getConfig(): Config {
  const dataDir =
    process.env["CLAUDE_MEMORY_DIR"] ?? join(homedir(), ".cache", "claude-memory");

  mkdirSync(dataDir, { recursive: true });

  const storageProvider = (process.env["STORAGE_PROVIDER"] ?? "sqlite") as Config["storageProvider"];
  if (storageProvider !== "sqlite" && storageProvider !== "neo4j") {
    throw new Error(`Unknown STORAGE_PROVIDER: "${storageProvider}". Supported: sqlite, neo4j`);
  }

  const provider = (process.env["EMBEDDING_PROVIDER"] ?? "builtin") as Config["embeddingProvider"];
  if (provider !== "builtin" && provider !== "ollama") {
    throw new Error(`Unknown EMBEDDING_PROVIDER: "${provider}". Supported: builtin, ollama`);
  }

  const dimEnv = process.env["EMBEDDING_DIM"];
  const embeddingDim = dimEnv ? parseInt(dimEnv, 10) : DEFAULT_DIM[provider];

  return {
    storageProvider,
    dbPath: process.env["CLAUDE_MEMORY_DB"] ?? join(dataDir, "memory.db"),
    modelCacheDir: process.env["CLAUDE_MEMORY_MODEL_CACHE"] ?? join(dataDir, "models"),
    embeddingProvider: provider,
    embeddingModel: "Xenova/all-MiniLM-L6-v2",
    embeddingDim,
    ollamaUrl: process.env["OLLAMA_URL"] ?? "http://localhost:11434",
    ollamaModel: process.env["OLLAMA_MODEL"] ?? "nomic-embed-text",
    neo4jUri: process.env["NEO4J_URI"] ?? "bolt://localhost:7687",
    neo4jUser: process.env["NEO4J_USER"] ?? "neo4j",
    neo4jPassword: process.env["NEO4J_PASSWORD"] ?? "memory_pass_2024",
  };
}
