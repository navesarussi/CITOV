import { buildMatchScoreBreakdown } from "@/application/match-score-detail";
import { breakdownWaterfallHe } from "@/application/match-explain-waterfall";
import { explainMatchPair } from "@/application/match-pair-explain";
import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { MatchScoreBreakdown } from "@/domain/match-score-breakdown";
import type { CandidateCard, JobCard, Match, StoreData } from "@/domain/types";
import type { SegmentVectors } from "@/domain/semantic-matching";
import type { MatchEmbeddingIndex } from "./match-scoring";

export function resolveMatchPairCards(
  store: StoreData,
  match: Match,
): { candidate: CandidateCard; job: JobCard; vectors?: { candidate: SegmentVectors; job: SegmentVectors } } | null {
  const emp = store.employees.find((e) => e.userId === match.candidateId);
  const raw = store.employers.find((e) => e.userId === match.jobOwnerId);
  if (!emp || !raw) return null;
  const employer = normalizeEmployerRecord(raw);
  const job = employer.jobs.find((j) => j.id === match.jobId) ?? employer.jobs[0];
  if (!job) return null;
  return { candidate: emp.card, job: job.card };
}

export function explainStoredOrLiveMatch(params: {
  store: StoreData;
  match: Match;
  index?: MatchEmbeddingIndex;
}): {
  breakdown: MatchScoreBreakdown;
  waterfall: ReturnType<typeof breakdownWaterfallHe>;
  legacy: ReturnType<typeof explainMatchPair>;
  candidate: CandidateCard;
  job: JobCard;
} | null {
  const cards = resolveMatchPairCards(params.store, params.match);
  if (!cards) return null;
  const cVec = params.index?.candidate.get(params.match.candidateId);
  const jVec = params.index?.job.get(params.match.jobId);
  const vectors =
    cVec && jVec ? { candidate: cVec, job: jVec } : undefined;
  const breakdown =
    params.match.scoreBreakdown ??
    buildMatchScoreBreakdown({
      candidate: cards.candidate,
      job: cards.job,
      vectors,
      adminSettings: params.store.adminSettings,
    });
  return {
    breakdown,
    waterfall: breakdownWaterfallHe(breakdown),
    legacy: explainMatchPair({
      candidate: cards.candidate,
      job: cards.job,
      candidateId: params.match.candidateId,
      jobId: params.match.jobId,
      vectors,
      adminSettings: params.store.adminSettings,
    }),
    candidate: cards.candidate,
    job: cards.job,
  };
}
