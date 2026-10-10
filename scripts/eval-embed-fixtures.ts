import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  candidateEmbeddingTexts,
  jobEmbeddingTexts,
} from "../src/domain/card-embedding-text";
import { hasGeminiKey } from "../src/infrastructure/ai/gemini-client";
import {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  embedSegmentTexts,
  type EmbeddingGeneratorKind,
} from "../src/infrastructure/ai/embeddings";
import { matchingEvalDataset } from "../eval/matching/dataset";
import type { EvalEmbeddingFixture } from "../eval/matching/embed-fixture-types";
import { validateMatchingDataset } from "../eval/matching/validate-dataset";

async function main(): Promise<void> {
  validateMatchingDataset(matchingEvalDataset);
  const generator: EmbeddingGeneratorKind = hasGeminiKey()
    ? "gemini"
    : "pseudo-local-v1";
  if (generator === "pseudo-local-v1") {
    console.warn(
      "WARNING: GOOGLE_GENERATIVE_AI_API_KEY not set — writing pseudo-local-v1 fixture (not real semantics).",
    );
  }

  const entities: EvalEmbeddingFixture["entities"] = {};
  for (const c of matchingEvalDataset.candidates) {
    const texts = candidateEmbeddingTexts(c.card);
    const vectors = await embedSegmentTexts(texts, { generator });
    entities[`candidate:${c.id}`] = vectors;
  }
  for (const j of matchingEvalDataset.jobs) {
    const texts = jobEmbeddingTexts(j.card);
    const vectors = await embedSegmentTexts(texts, { generator });
    entities[`job:${j.id}`] = vectors;
  }

  const fixture: EvalEmbeddingFixture = {
    version: "2026-10-10-v1",
    datasetVersion: matchingEvalDataset.version,
    generator,
    model: generator === "gemini" ? DEFAULT_EMBEDDING_MODEL : "pseudo-local-v1",
    dimensions: EMBEDDING_DIMENSIONS,
    generatedAt: new Date().toISOString(),
    entities,
  };

  const dir = join(process.cwd(), "eval/matching/fixtures");
  mkdirSync(dir, { recursive: true });
  const file =
    generator === "gemini"
      ? join(dir, "embeddings.json")
      : join(dir, "embeddings.pseudo.fixture.json");
  writeFileSync(file, `${JSON.stringify(fixture)}\n`, "utf8");
  console.log(`Wrote ${file} (${Object.keys(entities).length} entities, ${generator})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
