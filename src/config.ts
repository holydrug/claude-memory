import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export interface Config {
  dbPath: string;
  modelCacheDir: string;
  embeddingProvider: "builtin" | "ollama";
  embeddingModel: string;
  embeddingDim: number;
  ollamaUrl: string;
  ollamaModel: string;
}

const DEFAULT_DIM = {
  builtin: 384,
  ollama: 768,
} as const;

export function getConfig(): Config {
  const dataDir =
    process.env["CLAUDE_MEMORY_DIR"] ?? join(homedir(), ".cache", "claude-memory");

  mkdirSync(dataDir, { recursive: true });

  const provider = (process.env["EMBEDDING_PROVIDER"] ?? "builtin") as Config["embeddingProvider"];
  if (provider !== "builtin" && provider !== "ollama") {
    throw new Error(`Unknown EMBEDDING_PROVIDER: "${provider}". Supported: builtin, ollama`);
  }

  const dimEnv = process.env["EMBEDDING_DIM"];
  const embeddingDim = dimEnv ? parseInt(dimEnv, 10) : DEFAULT_DIM[provider];

  return {
    dbPath: process.env["CLAUDE_MEMORY_DB"] ?? join(dataDir, "memory.db"),
    modelCacheDir: process.env["CLAUDE_MEMORY_MODEL_CACHE"] ?? join(dataDir, "models"),
    embeddingProvider: provider,
    embeddingModel: "Xenova/all-MiniLM-L6-v2",
    embeddingDim,
    ollamaUrl: process.env["OLLAMA_URL"] ?? "http://localhost:11434",
    ollamaModel: process.env["OLLAMA_MODEL"] ?? "nomic-embed-text",
  };
}
