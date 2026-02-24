import { homedir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

export interface Config {
  dbPath: string;
  modelCacheDir: string;
  embeddingModel: string;
  embeddingDim: number;
}

export function getConfig(): Config {
  const dataDir =
    process.env["CLAUDE_MEMORY_DIR"] ?? join(homedir(), ".cache", "claude-memory");

  mkdirSync(dataDir, { recursive: true });

  return {
    dbPath: process.env["CLAUDE_MEMORY_DB"] ?? join(dataDir, "memory.db"),
    modelCacheDir: process.env["CLAUDE_MEMORY_MODEL_CACHE"] ?? join(dataDir, "models"),
    embeddingModel: "Xenova/all-MiniLM-L6-v2",
    embeddingDim: 384,
  };
}
