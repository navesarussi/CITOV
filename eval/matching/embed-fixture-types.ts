import type { EmbeddingSegment } from "../../src/domain/card-embedding-text";

export type FixtureEntityKey = `candidate:${string}` | `job:${string}`;

export type EvalEmbeddingFixture = {
  version: string;
  datasetVersion: string;
  generator: "gemini" | "pseudo-local-v1";
  model: string;
  dimensions: number;
  generatedAt: string;
  /** Segment vectors keyed by candidate:id or job:id */
  entities: Record<string, Partial<Record<EmbeddingSegment, number[]>>>;
};
