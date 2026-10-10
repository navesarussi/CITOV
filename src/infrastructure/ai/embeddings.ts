import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embedMany } from "ai";
import type { EmbeddingSegment } from "@/domain/card-embedding-text";
import { isSegmentNonempty } from "@/domain/card-embedding-text";
import { logAiUsageSafe } from "@/infrastructure/db/ai-usage";
import { callGeminiWithRetry, getGeminiApiKeys, hasGeminiKey } from "./gemini-client";
import { extractGeminiUsage } from "./usage-extract";

export const DEFAULT_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001";

export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 768);

export type EmbeddingGeneratorKind = "gemini" | "pseudo-local-v1";

function googleEmbedProvider() {
  const keys = getGeminiApiKeys();
  if (!keys.length) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  return createGoogleGenerativeAI({ apiKey: keys[0] });
}

/** Deterministic local vectors — NOT semantic; for CI only. */
export function pseudoEmbedText(text: string, dimensions = EMBEDDING_DIMENSIONS): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return vec;
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % dimensions;
    vec[idx] += 1;
  }
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

export async function embedTexts(
  texts: string[],
  opts?: { modelId?: string; generator?: EmbeddingGeneratorKind; userId?: string },
): Promise<{ vectors: number[][]; generator: EmbeddingGeneratorKind; model: string }> {
  const modelId = opts?.modelId ?? DEFAULT_EMBEDDING_MODEL;
  const forcePseudo = opts?.generator === "pseudo-local-v1";
  if (!forcePseudo && hasGeminiKey()) {
    const google = googleEmbedProvider();
    const started = Date.now();
    const result = await callGeminiWithRetry(() =>
      embedMany({
        model: google.embedding(modelId),
        values: texts,
        providerOptions: {
          google: {
            outputDimensionality: EMBEDDING_DIMENSIONS,
            taskType: "SEMANTIC_SIMILARITY",
          },
        },
      }),
    );
    const promptTokens = result.usage?.tokens ?? texts.join("").length / 4;
    logAiUsageSafe({
      type: "embedding",
      usage: extractGeminiUsage({
        inputTokens: Math.round(promptTokens),
        outputTokens: 0,
      }),
      userId: opts?.userId,
      model: modelId,
      latencyMs: Date.now() - started,
    });
    return {
      vectors: result.embeddings.map((e) => [...e]),
      generator: "gemini",
      model: modelId,
    };
  }
  return {
    vectors: texts.map((t) => pseudoEmbedText(t)),
    generator: "pseudo-local-v1",
    model: "pseudo-local-v1",
  };
}

export async function embedSegmentTexts(
  segments: Record<EmbeddingSegment, string>,
  opts?: { modelId?: string; generator?: EmbeddingGeneratorKind; userId?: string },
): Promise<Partial<Record<EmbeddingSegment, number[]>>> {
  const order: EmbeddingSegment[] = ["role", "skills", "profile"];
  const active = order.filter((k) => isSegmentNonempty(segments[k]));
  if (active.length === 0) return {};
  const texts = active.map((k) => segments[k].trim());
  const { vectors } = await embedTexts(texts, opts);
  const out: Partial<Record<EmbeddingSegment, number[]>> = {};
  active.forEach((k, i) => {
    out[k] = vectors[i];
  });
  return out;
}
