import {
  inferMatchCanonicalFromText,
  mergeMatchCanonical,
} from "../../src/domain/match-canonical";
import type { CandidateCard, JobCard } from "../../src/domain/types";
import { emptyCandidateCard, emptyJobCard } from "../../src/domain/types";
import type { EvalCandidate, EvalJob, EvalLabel, MatchingEvalDataset } from "../../src/domain/matching-eval/types";

function enrichCandidateCard(card: CandidateCard): CandidateCard {
  return mergeMatchCanonical(
    card,
    inferMatchCanonicalFromText({
      desiredRole: card.desiredRole,
      field: card.field,
      skills: card.skills,
      languages: card.languages,
    }) ?? {},
  );
}

function enrichJobCard(card: JobCard): JobCard {
  return mergeMatchCanonical(
    card,
    inferMatchCanonicalFromText({
      title: card.title,
      field: card.field,
      mustHaves: card.mustHaves,
      languages: card.requiredLanguages,
    }) ?? {},
  );
}

export function cand(id: string, patch: Partial<CandidateCard>): EvalCandidate {
  const card = enrichCandidateCard({ ...emptyCandidateCard(), flexibility: 5, ...patch });
  return { id, card };
}

export function job(id: string, patch: Partial<JobCard>): EvalJob {
  const card = enrichJobCard({ ...emptyJobCard(), flexibility: 5, ...patch });
  return { id, card };
}

export function lbl(
  jobId: string,
  candidateId: string,
  label: EvalLabel["label"],
  reason?: string,
): EvalLabel {
  return { jobId, candidateId, label, reason };
}

export function buildDataset(
  jobs: EvalJob[],
  candidates: EvalCandidate[],
  labels: EvalLabel[],
): MatchingEvalDataset {
  return {
    version: "2026-10-10-v1",
    description:
      "Offline Hebrew-first job/candidate matching eval set with human-style relevance labels.",
    jobs,
    candidates,
    labels,
  };
}
