import { scoreHybridMatch, scoreMatch, scoreSemanticMatch } from "../../src/domain/matching-scorers";
import type { MatcherDefinition } from "../../src/domain/matching-eval/types";
import type { SegmentVectors } from "../../src/domain/semantic-matching";
import { DEFAULT_HYBRID_WEIGHTS } from "../../src/domain/semantic-matching";
import type { CandidateCard, JobCard } from "../../src/domain/types";
import type { EvalEmbeddingFixture } from "./embed-fixture-types";

export function buildFixtureIndex(fixture: EvalEmbeddingFixture): {
  candidate: Map<string, SegmentVectors>;
  job: Map<string, SegmentVectors>;
} {
  const candidate = new Map<string, SegmentVectors>();
  const job = new Map<string, SegmentVectors>();
  for (const [key, segments] of Object.entries(fixture.entities)) {
    if (key.startsWith("candidate:")) {
      candidate.set(key.slice("candidate:".length), segments as SegmentVectors);
    } else if (key.startsWith("job:")) {
      job.set(key.slice("job:".length), segments as SegmentVectors);
    }
  }
  return { candidate, job };
}

function scoreFromFixture(
  candidateId: string,
  jobId: string,
  candidate: CandidateCard,
  job: JobCard,
  index: ReturnType<typeof buildFixtureIndex>,
  mode: "semantic" | "hybrid",
): number {
  const cVec = index.candidate.get(candidateId);
  const jVec = index.job.get(jobId);
  if (!cVec || !jVec) return scoreMatch(candidate, job);
  if (mode === "semantic") return scoreSemanticMatch(candidate, job, cVec, jVec);
  return scoreHybridMatch(candidate, job, cVec, jVec, DEFAULT_HYBRID_WEIGHTS);
}

export function createEvalMatcherDefinitions(
  fixture: EvalEmbeddingFixture,
): MatcherDefinition[] {
  const index = buildFixtureIndex(fixture);
  const genNote =
    fixture.generator === "gemini"
      ? fixture.model
      : `${fixture.generator} — run npm run eval:embed-fixtures with GOOGLE_GENERATIVE_AI_API_KEY`;
  return [
    {
      id: "semantic-v1",
      label: `Semantic (${genNote})`,
      score: (candidate, job, meta) =>
        scoreFromFixture(meta?.candidateId ?? "", meta?.jobId ?? "", candidate, job, index, "semantic"),
    },
    {
      id: "hybrid-v1",
      label: `Hybrid 55/45 semantic+rule (${genNote})`,
      score: (candidate, job, meta) =>
        scoreFromFixture(meta?.candidateId ?? "", meta?.jobId ?? "", candidate, job, index, "hybrid"),
    },
  ];
}
