import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EvalEmbeddingFixture } from "./embed-fixture-types";

export function resolveFixturePath(): string | null {
  const root = join(process.cwd(), "eval/matching/fixtures");
  const primary = join(root, "embeddings.json");
  if (existsSync(primary)) return primary;
  const fallback = join(root, "embeddings.fixture.json");
  if (existsSync(fallback)) return fallback;
  return null;
}

export function loadEvalEmbeddingFixture(): EvalEmbeddingFixture | null {
  const path = resolveFixturePath();
  if (!path) return null;
  return JSON.parse(readFileSync(path, "utf8")) as EvalEmbeddingFixture;
}
