import {
  defaultRuleBasedMatcher,
  evaluateMatcherOnDataset,
} from "@/domain/matching-eval/evaluate";
import type { EvalLabel, MatchingEvalDataset, RelevanceLabel } from "@/domain/matching-eval/types";
import type { StoreData } from "@/domain/types";
import { readQueueThreshold } from "./matching-config";
import type { MatchEmbeddingIndex } from "./match-scoring";
import { buildDatasetFromDbLabels, productionHybridMatcher } from "./admin-labeling";
import { resolveLabelingPair } from "./labeling-pair-resolve";
import { explainMatchPair } from "./match-pair-explain";

export type LabelCounts = Record<RelevanceLabel, number>;

export type DisagreementRow = {
  jobId: string;
  candidateId: string;
  jobTitle: string;
  candidateTitle: string;
  humanLabel: RelevanceLabel;
  systemQueued: boolean;
  ruleScore: number;
  hybridScore: number;
  note?: string;
};

export type ThresholdSweepRow = {
  threshold: number;
  precisionAt5: number;
  recallAt5: number;
  goodMissed: number;
  badQueued: number;
};

export function countLabels(labels: EvalLabel[]): LabelCounts {
  const out: LabelCounts = { good: 0, acceptable: 0, bad: 0 };
  for (const l of labels) out[l.label] += 1;
  return out;
}

function humanPositive(label: RelevanceLabel): boolean {
  return label === "good" || label === "acceptable";
}

export function buildDisagreements(
  store: StoreData,
  dataset: MatchingEvalDataset,
  index: MatchEmbeddingIndex | undefined,
): DisagreementRow[] {
  const threshold = readQueueThreshold(store.adminSettings);
  const rows: DisagreementRow[] = [];
  for (const l of dataset.labels) {
    const resolved = resolveLabelingPair(store, l.jobId, l.candidateId);
    if (!resolved) continue;
    const cVec = index?.candidate.get(l.candidateId) ?? index?.candidate.get(`seed-${l.candidateId}`);
    const jVec = index?.job.get(l.jobId);
    const ex = explainMatchPair({
      candidate: resolved.candidate,
      job: resolved.job,
      candidateId: l.candidateId,
      jobId: l.jobId,
      vectors: cVec && jVec ? { candidate: cVec, job: jVec } : undefined,
      adminSettings: store.adminSettings,
    });
    const systemQueued = ex.hybridQueued;
    const humanPos = humanPositive(l.label);
    if (systemQueued !== humanPos) {
      rows.push({
        jobId: l.jobId,
        candidateId: l.candidateId,
        jobTitle: resolved.job.title?.trim() || l.jobId,
        candidateTitle: resolved.candidate.desiredRole?.trim() || l.candidateId,
        humanLabel: l.label,
        systemQueued,
        ruleScore: ex.ruleScore,
        hybridScore: ex.hybridScore,
        note: l.reason,
      });
    }
  }
  return rows.slice(0, 12);
}

export function agreementRate(
  store: StoreData,
  dataset: MatchingEvalDataset,
  index: MatchEmbeddingIndex | undefined,
): number {
  if (!dataset.labels.length) return 0;
  const disagreements = buildDisagreements(store, dataset, index);
  return 1 - disagreements.length / dataset.labels.length;
}

export function sweepThresholds(
  dataset: MatchingEvalDataset,
  index: MatchEmbeddingIndex | undefined,
): ThresholdSweepRow[] {
  const matcher = productionHybridMatcher(index);
  const steps: ThresholdSweepRow[] = [];
  for (let t = 0.25; t <= 0.85; t += 0.05) {
    const r = evaluateMatcherOnDataset(dataset, matcher, 5, Math.round(t * 100) / 100);
    steps.push({
      threshold: r.threshold,
      precisionAt5: r.macroPrecisionAtK,
      recallAt5: r.macroRecallAtK,
      goodMissed: r.confusion.goodMissed.length,
      badQueued: r.confusion.badQueued.length,
    });
  }
  return steps;
}

export type ThresholdApplyPreview = {
  currentThreshold: number;
  newThreshold: number;
  labeledPairs: number;
  queuedBefore: number;
  queuedAfter: number;
  agreementBefore: number;
  agreementAfter: number;
};

export function previewThresholdApply(
  store: StoreData,
  dataset: MatchingEvalDataset,
  index: MatchEmbeddingIndex | undefined,
  newThreshold: number,
): ThresholdApplyPreview {
  const currentThreshold = readQueueThreshold(store.adminSettings);
  let queuedBefore = 0;
  let queuedAfter = 0;
  let agreeBefore = 0;
  let agreeAfter = 0;
  for (const l of dataset.labels) {
    const resolved = resolveLabelingPair(store, l.jobId, l.candidateId);
    if (!resolved) continue;
    const cVec = index?.candidate.get(l.candidateId) ?? index?.candidate.get(`seed-${l.candidateId}`);
    const jVec = index?.job.get(l.jobId);
    const ex = explainMatchPair({
      candidate: resolved.candidate,
      job: resolved.job,
      candidateId: l.candidateId,
      jobId: l.jobId,
      vectors: cVec && jVec ? { candidate: cVec, job: jVec } : undefined,
      adminSettings: store.adminSettings,
    });
    const humanPos = humanPositive(l.label);
    const before = ex.hybridScore >= currentThreshold;
    const after = ex.hybridScore >= newThreshold;
    if (before) queuedBefore += 1;
    if (after) queuedAfter += 1;
    if (before === humanPos) agreeBefore += 1;
    if (after === humanPos) agreeAfter += 1;
  }
  const n = dataset.labels.length || 1;
  return {
    currentThreshold,
    newThreshold,
    labeledPairs: dataset.labels.length,
    queuedBefore,
    queuedAfter,
    agreementBefore: Math.round((agreeBefore / n) * 100),
    agreementAfter: Math.round((agreeAfter / n) * 100),
  };
}

export function pickSuggestedThreshold(steps: ThresholdSweepRow[]): ThresholdSweepRow | null {
  if (!steps.length) return null;
  let best = steps[0]!;
  let bestScore = -1;
  for (const s of steps) {
    const score = s.precisionAt5 * 0.55 + s.recallAt5 * 0.35 - s.badQueued * 0.02 - s.goodMissed * 0.01;
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return best;
}

export async function extendedLiveMetrics(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
) {
  const base = await import("./admin-labeling").then((m) => m.liveLabelingMetrics(store, index));
  const dataset = await buildDatasetFromDbLabels(store);
  const minRequired = 3;
  if (!dataset) {
    return {
      ...base,
      minRequired,
      labelCounts: { good: 0, acceptable: 0, bad: 0 } as LabelCounts,
      agreementRate: 0,
      disagreements: [] as DisagreementRow[],
      thresholdSweep: [] as ThresholdSweepRow[],
      suggestedThreshold: null as number | null,
      queueThreshold: readQueueThreshold(store.adminSettings),
    };
  }
  const labelCounts = countLabels(dataset.labels);
  const disagreements = buildDisagreements(store, dataset, index);
  const agreement = agreementRate(store, dataset, index);
  const thresholdSweep = base.ready ? sweepThresholds(dataset, index) : [];
  const suggested = base.ready ? pickSuggestedThreshold(thresholdSweep) : null;
  return {
    ...base,
    minRequired,
    labelCounts,
    agreementRate: agreement,
    disagreements,
    thresholdSweep,
    suggestedThreshold: suggested?.threshold ?? null,
    queueThreshold: readQueueThreshold(store.adminSettings),
  };
}
