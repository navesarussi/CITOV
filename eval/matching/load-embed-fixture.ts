import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { EvalEmbeddingFixture } from "./embed-fixture-types";

export function resolveFixturePath(): string | null {
  const root = join(process.cwd(), "eval/matching/fixtures");
  const local = join(root, "embeddings.json");
  if (existsSync(local)) return local;
  const gemini = join(root, "embeddings.fixture.json");
  if (existsSync(gemini)) return gemini;
  const pseudo = join(root, "embeddings.pseudo.fixture.json");
  if (existsSync(pseudo)) return pseudo;
  return null;
}

export function loadEvalEmbeddingFixture(): EvalEmbeddingFixture | null {
  const path = resolveFixturePath();
  if (!path) return null;
  return JSON.parse(readFileSync(path, "utf8")) as EvalEmbeddingFixture;
}
