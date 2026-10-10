import { scoreMatch } from "../matching";
import {
  gainForLabel,
  isRelevantLabel,
  meanReciprocalRank,
  ndcgAtK,
  precisionAtK,
  recallAtK,
  reciprocalRank,
} from "./metrics";
import type {
  EvalLabel,
  EvalCandidate,
  EvalJob,
  MatcherDefinition,
  MatchingEvalDataset,
  RelevanceLabel,
} from "./types";
import { QUEUE_THRESHOLD } from "./types";

export type JobEvalMetrics = {
  jobId: string;
  jobTitle: string;
  precisionAt5: number;
  recallAt5: number;
  reciprocalRank: number;
  ndcgAt5: number;
  labeledRelevant: number;
};

export type ThresholdConfusion = {
  goodMissed: LabeledPairCase[];
  acceptableMissed: LabeledPairCase[];
  badQueued: LabeledPairCase[];
};

export type LabeledPairCase = {
  jobId: string;
  jobTitle: string;
  candidateId: string;
  desiredRole: string;
  label: RelevanceLabel;
  score: number;
  reason?: string;
};

export type MatcherEvalResult = {
  matcherId: string;
  matcherLabel: string;
  k: number;
  macroPrecisionAtK: number;
  macroRecallAtK: number;
  mrr: number;
  macroNdcgAtK: number;
  perJob: JobEvalMetrics[];
  threshold: number;
  confusion: ThresholdConfusion;
  worstJobs: JobEvalMetrics[];
  failureCategories: FailureCategorySummary[];
};

export type FailureCategorySummary = {
  category: string;
  count: number;
  examples: string[];
};

function labelMap(labels: EvalLabel[]): Map<string, RelevanceLabel> {
  const m = new Map<string, RelevanceLabel>();
  for (const l of labels) {
    m.set(`${l.jobId}:${l.candidateId}`, l.label);
  }
  return m;
}

function reasonMap(labels: EvalLabel[]): Map<string, string | undefined> {
  const m = new Map<string, string | undefined>();
  for (const l of labels) {
    m.set(`${l.jobId}:${l.candidateId}`, l.reason);
  }
  return m;
}

export function rankCandidatesForJob(
  job: EvalJob,
  candidates: EvalCandidate[],
  scoreFn: MatcherDefinition["score"],
): { candidateId: string; score: number }[] {
  return candidates
    .map((c) => ({
      candidateId: c.id,
      score: scoreFn(c.card, job.card, { candidateId: c.id, jobId: job.id }),
    }))
    .sort((a, b) => b.score - a.score);
}

export function evaluateMatcherOnDataset(
  dataset: MatchingEvalDataset,
  matcher: MatcherDefinition,
  k = 5,
  queueThreshold = QUEUE_THRESHOLD,
): MatcherEvalResult {
  const labels = labelMap(dataset.labels);
  const reasons = reasonMap(dataset.labels);
  const perJob: JobEvalMetrics[] = [];
  const confusion: ThresholdConfusion = {
    goodMissed: [],
    acceptableMissed: [],
    badQueued: [],
  };

  for (const job of dataset.jobs) {
    const ranked = rankCandidatesForJob(job, dataset.candidates, matcher.score);
    const rankedIds = ranked.map((r) => r.candidateId);

    const relevantIds = new Set<string>();
    for (const c of dataset.candidates) {
      const label = labels.get(`${job.id}:${c.id}`);
      if (isRelevantLabel(label)) relevantIds.add(c.id);
    }

    const isRelevant = (candidateId: string) => {
      const label = labels.get(`${job.id}:${candidateId}`);
      return isRelevantLabel(label);
    };

    const gains = rankedIds.map((id) =>
      gainForLabel(labels.get(`${job.id}:${id}`)),
    );

    perJob.push({
      jobId: job.id,
      jobTitle: job.card.title,
      precisionAt5: precisionAtK(rankedIds, isRelevant, k),
      recallAt5: recallAtK(rankedIds, relevantIds, k),
      reciprocalRank: reciprocalRank(rankedIds, relevantIds),
      ndcgAt5: ndcgAtK(gains, k),
      labeledRelevant: relevantIds.size,
    });

    for (const c of dataset.candidates) {
      const key = `${job.id}:${c.id}`;
      const label = labels.get(key);
      if (!label) continue;
      const score =
        ranked.find((r) => r.candidateId === c.id)?.score ??
        matcher.score(c.card, job.card, { candidateId: c.id, jobId: job.id });
      const queued = score >= queueThreshold;
      const base: LabeledPairCase = {
        jobId: job.id,
        jobTitle: job.card.title,
        candidateId: c.id,
        desiredRole: c.card.desiredRole,
        label,
        score,
        reason: reasons.get(key),
      };
      if (label === "good" && !queued) confusion.goodMissed.push(base);
      if (label === "acceptable" && !queued) confusion.acceptableMissed.push(base);
      if (label === "bad" && queued) confusion.badQueued.push(base);
    }
  }

  const macro = (pick: (j: JobEvalMetrics) => number) =>
    perJob.length === 0 ? 0 : perJob.reduce((a, j) => a + pick(j), 0) / perJob.length;

  const worstJobs = [...perJob]
    .filter((j) => j.labeledRelevant > 0)
    .sort((a, b) => a.ndcgAt5 - b.ndcgAt5 || a.recallAt5 - b.recallAt5)
    .slice(0, 8);

  return {
    matcherId: matcher.id,
    matcherLabel: matcher.label,
    k,
    macroPrecisionAtK: macro((j) => j.precisionAt5),
    macroRecallAtK: macro((j) => j.recallAt5),
    mrr: meanReciprocalRank(perJob.map((j) => j.reciprocalRank)),
    macroNdcgAtK: macro((j) => j.ndcgAt5),
    perJob,
    threshold: queueThreshold,
    confusion,
    worstJobs,
    failureCategories: summarizeFailureCategories(confusion),
  };
}

const CATEGORY_RULES: { category: string; test: (reason?: string) => boolean }[] = [
  { category: "synonym / cross-language role", test: (r) => !!r && /synonym|english|hebrew|waiter|מלצר|software engineer|מפתח/i.test(r) },
  { category: "related role (not same title)", test: (r) => !!r && /related role|bartender|ברמן/i.test(r) },
  { category: "must-have skill missing", test: (r) => !!r && /must-have|skill missing|דרישת חובה/i.test(r) },
  { category: "location mismatch", test: (r) => !!r && /location|מיקום|עיר/i.test(r) },
  { category: "salary mismatch", test: (r) => !!r && /salary|שכר/i.test(r) },
  { category: "seniority mismatch", test: (r) => !!r && /seniority|בכיר|junior|זוטר/i.test(r) },
  {
    category: "hebrew title morphology",
    test: (r) => !!r && /morphology|אח\/ות|gender|ניסוח/i.test(r),
  },
  { category: "false positive (weak overlap)", test: (r) => !!r && /false positive|overlap/i.test(r) },
];

export function summarizeFailureCategories(confusion: ThresholdConfusion): FailureCategorySummary[] {
  const allFailures = [
    ...confusion.goodMissed,
    ...confusion.badQueued,
  ];
  const counts = new Map<string, string[]>();
  const uncategorized: string[] = [];

  for (const f of allFailures) {
    let matched = false;
    for (const rule of CATEGORY_RULES) {
      if (rule.test(f.reason)) {
        const list = counts.get(rule.category) ?? [];
        list.push(formatFailureExample(f));
        counts.set(rule.category, list);
        matched = true;
        break;
      }
    }
    if (!matched) uncategorized.push(formatFailureExample(f));
  }

  const out: FailureCategorySummary[] = [...counts.entries()]
    .map(([category, examples]) => ({
      category,
      count: examples.length,
      examples: examples.slice(0, 3),
    }))
    .sort((a, b) => b.count - a.count);

  if (uncategorized.length > 0) {
    out.push({
      category: "other",
      count: uncategorized.length,
      examples: uncategorized.slice(0, 3),
    });
  }
  return out;
}

function formatFailureExample(f: LabeledPairCase): string {
  const scorePct = (f.score * 100).toFixed(1);
  return `${f.jobTitle} ↔ ${f.desiredRole} (${f.candidateId}, score=${scorePct}%, label=${f.label})`;
}

export const defaultRuleBasedMatcher: MatcherDefinition = {
  id: "rule-based-v1",
  label: "Current rule-based matcher (word overlap)",
  score: (candidate, job) => scoreMatch(candidate, job),
};
