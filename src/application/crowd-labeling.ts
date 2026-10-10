import { matchingEvalDataset } from "../../eval/matching/dataset";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import type { CandidateCard, JobCard } from "@/domain/types";
import { labeledPairKeys } from "@/infrastructure/db/match-labels";

export type CrowdPair = {
  jobId: string;
  candidateId: string;
  jobTitle: string;
  candidateRole: string;
  jobField: string;
  candidateField: string;
  jobLocation: string;
  candidateLocation: string;
  jobSkills: string[];
  candidateSkills: string[];
};

function stripPii(card: CandidateCard): Pick<
  CrowdPair,
  "candidateRole" | "candidateField" | "candidateLocation" | "candidateSkills"
> {
  return {
    candidateRole: card.desiredRole?.trim() || "—",
    candidateField: card.field?.trim() || "—",
    candidateLocation: card.location?.trim() || "—",
    candidateSkills: (card.skills ?? []).slice(0, 8),
  };
}

function stripJob(job: JobCard): Pick<
  CrowdPair,
  "jobTitle" | "jobField" | "jobLocation" | "jobSkills"
> {
  return {
    jobTitle: job.title?.trim() || "—",
    jobField: job.field?.trim() || "—",
    jobLocation: job.location?.trim() || "—",
    jobSkills: [...(job.mustHaves ?? []), ...(job.niceToHaves ?? [])].slice(0, 8),
  };
}

export async function nextCrowdLabelPair(labelerUserId: string): Promise<CrowdPair | null> {
  const labeled = await labeledPairKeys();
  const pool = matchingEvalDataset.labels.slice(0, 40);
  for (const l of pool) {
    const key = `${l.jobId}:${l.candidateId}`;
    if (labeled.has(key)) continue;
    const job = matchingEvalDataset.jobs.find((j) => j.id === l.jobId);
    const cand = matchingEvalDataset.candidates.find((c) => c.id === l.candidateId);
    if (!job || !cand) continue;
    void labelerUserId;
    return {
      jobId: l.jobId,
      candidateId: l.candidateId,
      ...stripJob(job.card),
      ...stripPii(cand.card),
    };
  }
  return null;
}

export type CrowdLabelInput = {
  jobId: string;
  candidateId: string;
  label: RelevanceLabel;
  note?: string;
};
