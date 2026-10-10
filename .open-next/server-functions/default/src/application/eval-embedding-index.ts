import { loadEvalEmbeddingFixture } from "@/application/eval-embed-fixture";
import type { MatchEmbeddingIndex } from "./match-scoring";
import type { SegmentVectors } from "@/domain/semantic-matching";

function fixtureToMaps(): MatchEmbeddingIndex {
  const fixture = loadEvalEmbeddingFixture();
  const candidate = new Map<string, SegmentVectors>();
  const job = new Map<string, SegmentVectors>();
  if (!fixture?.entities) return { candidate, job };
  for (const [key, vec] of Object.entries(fixture.entities)) {
    if (key.startsWith("candidate:")) {
      candidate.set(key.slice("candidate:".length), vec);
    } else if (key.startsWith("job:")) {
      job.set(key.slice("job:".length), vec);
    }
  }
  return { candidate, job };
}

/** DB index + eval fixture vectors keyed by eval ids (c11, j22, …). */
export function mergeEvalFixtureIntoIndex(base: MatchEmbeddingIndex): MatchEmbeddingIndex {
  const fx = fixtureToMaps();
  const candidate = new Map(base.candidate);
  const job = new Map(base.job);
  for (const [id, vec] of fx.candidate) {
    if (!candidate.has(id)) candidate.set(id, vec);
    const seedId = `seed-${id}`;
    if (!candidate.has(seedId)) candidate.set(seedId, vec);
  }
  for (const [id, vec] of fx.job) {
    if (!job.has(id)) job.set(id, vec);
  }
  return { candidate, job };
}

export function evalFixtureIndexOnly(): MatchEmbeddingIndex {
  return fixtureToMaps();
}
