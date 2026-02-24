import { pipeline, env } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import { getConfig } from "./config.js";
import type { EmbedFn } from "./types.js";

export async function initEmbeddings(): Promise<EmbedFn> {
  const config = getConfig();

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
