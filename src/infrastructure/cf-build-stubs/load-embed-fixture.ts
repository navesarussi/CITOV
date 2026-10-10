import type { EvalEmbeddingFixture } from "../../../eval/matching/embed-fixture-types";

/** Workers build: skip multi-MiB embedding JSON (labeling uses DB + store on CF). */
export function resolveFixturePath(): string | null {
  return null;
}

export function loadEvalEmbeddingFixture(): EvalEmbeddingFixture | null {
  return null;
}
