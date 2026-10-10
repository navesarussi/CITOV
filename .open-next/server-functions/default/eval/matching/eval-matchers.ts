import { scoreFromBase, scoreMatch } from "../../src/domain/matching";
import { DEFAULT_COSINE_FLOOR } from "../../src/domain/matching-calibration";
import {
  buildSemanticOptions,
  computeHybridBaseFit,
  computeSemanticMatchBase,
  computeSemanticSimilarity,
  DEFAULT_HYBRID_WEIGHTS,
  mustHaveOverlapRatio,
  type SegmentVectors,
} from "../../src/domain/semantic-matching";
import { cosineToUnitFit } from "../../src/domain/vector-similarity";
import type { MatcherDefinition } from "../../src/domain/matching-eval/types";
import { computeBaseFit } from "../../src/domain/matching";
import { readHybridWeightsForPair } from "../../src/application/matching-config";
import type { CandidateCard, JobCard } from "../../src/domain/types";
import type { EvalEmbeddingFixture } from "./embed-fixture-types";

const LEGACY_HYBRID = { semantic: 0.55, rule: 0.45 };

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

function legacySemanticBase(
  candidate: CandidateCard,
  job: JobCard,
  cVec: SegmentVectors,
  jVec: SegmentVectors,
): number {
  const opts = buildSemanticOptions(candidate, job);
  const raw = computeSemanticSimilarity(cVec, jVec, undefined, {
    candidate: opts.candidateTexts!,
    job: opts.jobTexts!,
  });
  const sem = cosineToUnitFit(raw);
  return Math.max(0, Math.min(1, sem - (1 - mustHaveOverlapRatio(candidate, job)) * 0.12));
}

function legacyHybridBase(
  candidate: CandidateCard,
  job: JobCard,
  cVec: SegmentVectors,
  jVec: SegmentVectors,
): number {
  const rule = computeBaseFit(candidate, job);
  const sem = legacySemanticBase(candidate, job, cVec, jVec);
  return (LEGACY_HYBRID.semantic * sem + LEGACY_HYBRID.rule * rule) / 1;
}

function scoreLegacy(
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
  const base =
    mode === "semantic"
      ? legacySemanticBase(candidate, job, cVec, jVec)
      : legacyHybridBase(candidate, job, cVec, jVec);
  return scoreFromBase(base, candidate, job);
}

function scoreCalibrated(
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
  const opts = buildSemanticOptions(candidate, job);
  const base =
    mode === "semantic"
      ? computeSemanticMatchBase(candidate, job, cVec, jVec, opts)
      : computeHybridBaseFit(
          candidate,
          job,
          cVec,
          jVec,
          readHybridWeightsForPair(candidate, job),
          opts,
        );
  return scoreFromBase(base, candidate, job);
}

export function createEvalMatcherDefinitions(
  fixture: EvalEmbeddingFixture,
): MatcherDefinition[] {
  const index = buildFixtureIndex(fixture);
  const model =
    fixture.generator === "gemini"
      ? fixture.model
      : `${fixture.generator} (fallback — not real semantics)`;
  return [
    {
      id: "semantic-legacy-v1",
      label: `Semantic pre-calibration (c+1)/2 · ${model}`,
      score: (c, j, m) =>
        scoreLegacy(m?.candidateId ?? "", m?.jobId ?? "", c, j, index, "semantic"),
    },
    {
      id: "hybrid-legacy-v1",
      label: `Hybrid 55/45 pre-calibration · ${model}`,
      score: (c, j, m) =>
        scoreLegacy(m?.candidateId ?? "", m?.jobId ?? "", c, j, index, "hybrid"),
    },
    {
      id: "semantic-v1",
      label: `Semantic calibrated floor=${DEFAULT_COSINE_FLOOR} · ${model}`,
      score: (c, j, m) =>
        scoreCalibrated(m?.candidateId ?? "", m?.jobId ?? "", c, j, index, "semantic"),
    },
    {
      id: "hybrid-calibrated-v1",
      label: `Hybrid 80/20 calibrated (production) · ${model}`,
      score: (c, j, m) =>
        scoreCalibrated(m?.candidateId ?? "", m?.jobId ?? "", c, j, index, "hybrid"),
    },
  ];
}
