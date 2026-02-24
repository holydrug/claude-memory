import { pipeline, env } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { getConfig, type Config } from "./config.js";
import type { EmbedFn } from "./types.js";

export async function initEmbeddings(): Promise<EmbedFn> {
  const config = getConfig();

  if (config.embeddingProvider === "ollama") {
    return initOllamaEmbeddings(config);
  }

  return initBuiltinEmbeddings(config);
}

async function initBuiltinEmbeddings(config: Config): Promise<EmbedFn> {
  env.cacheDir = config.modelCacheDir;
  env.allowRemoteModels = true;

  console.error("[claude-memory] Loading embedding model...");

  const extractor: FeatureExtractionPipeline = await pipeline(
    "feature-extraction",
    config.embeddingModel,
    { dtype: "fp32" }
  );

  console.error("[claude-memory] Model ready.");

  return async (text: string): Promise<Float32Array> => {
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });
    return new Float32Array(output.data as Float64Array);
  };
}

async function initOllamaEmbeddings(config: Config): Promise<EmbedFn> {
  const baseUrl = config.ollamaUrl.replace(/\/+$/, "");
  const model = config.ollamaModel;

  console.error(
    `[claude-memory] Using Ollama embeddings: ${baseUrl} / ${model} (dim=${config.embeddingDim})`
  );

  // Verify connectivity with a test embedding
  try {
    const test = await ollamaEmbed(baseUrl, model, "connection test");
    if (test.length !== config.embeddingDim) {
      throw new Error(
        `Ollama model "${model}" returned dim=${test.length}, but EMBEDDING_DIM=${config.embeddingDim}. ` +
        `Set EMBEDDING_DIM=${test.length} to match.`
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("EMBEDDING_DIM")) throw err;
    throw new Error(
      `Cannot connect to Ollama at ${baseUrl}: ${err instanceof Error ? err.message : err}. ` +
      `Make sure Ollama is running and the model "${model}" is pulled.`
    );
  }

  console.error("[claude-memory] Ollama connection verified.");

  return async (text: string): Promise<Float32Array> => {
    return ollamaEmbed(baseUrl, model, text);
  };
}

async function ollamaEmbed(
  baseUrl: string,
  model: string,
  text: string,
): Promise<Float32Array> {
  const resp = await fetch(`${baseUrl}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, input: text }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Ollama API error ${resp.status}: ${body}`);
  }

  const json = (await resp.json()) as { embeddings?: number[][] };

  if (!json.embeddings || !json.embeddings[0]) {
    throw new Error("Ollama returned empty embeddings");
  }

  return new Float32Array(json.embeddings[0]);
}
