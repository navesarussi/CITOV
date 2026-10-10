import { scoreMatch } from "@/domain/matching";
import { readQueueThreshold } from "@/application/matching-config";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "@/application/match-scoring";
import type { MatchScoreBreakdown } from "@/domain/match-score-breakdown";
import type { StoreData } from "@/domain/types";

export type SandboxPairEval = {
  jobId: string;
  candidateId: string;
  score: number;
  ruleScore: number;
  hybridScore: number;
  queued: boolean;
  degraded: boolean;
  breakdown: MatchScoreBreakdown;
};

export type SandboxSuspiciousPair = {
  jobId: string;
  candidateId: string;
  reasonHe: string;
  score: number;
};

export type SandboxFullEvalResult = {
  pairCount: number;
  threshold: number;
  queuedCount: number;
  degradedToRuleCount: number;
  ruleHybridDisagreementCount: number;
  scoreHistogram: { bucket: string; count: number }[];
  suspicious: SandboxSuspiciousPair[];
};

function scoreBucket(score: number): string {
  const b = Math.min(9, Math.floor(score * 10));
  return `${(b * 10).toFixed(0)}–${(b * 10 + 10).toFixed(0)}%`;
}

export function runSandboxFullEval(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
): SandboxFullEvalResult {
  const threshold = readQueueThreshold(store.adminSettings);
  const histogram = new Map<string, number>();
  let queuedCount = 0;
  let degradedToRuleCount = 0;
  let ruleHybridDisagreementCount = 0;
  const suspicious: SandboxSuspiciousPair[] = [];

  const jobs = store.employers.flatMap((e) => e.jobs.map((j) => ({ jobId: j.id, card: j.card })));
  const candidates = store.employees.map((e) => ({ id: e.userId, card: e.card }));
  let pairCount = 0;

  for (const job of jobs) {
    for (const cand of candidates) {
      pairCount += 1;
      const ruleScore = scoreMatch(cand.card, job.card);
      const scored = scoreCandidateForJob({
        candidate: cand.card,
        job: job.card,
        candidateId: cand.id,
        jobId: job.jobId,
        index,
        adminSettings: store.adminSettings,
        mode: "hybrid",
      });
      const hybridScore = scored.score;
      const b = scored.scoreBreakdown;
      if (scored.queued) queuedCount += 1;
      if (b.degraded || b.effectiveMode === "rule") degradedToRuleCount += 1;
      if (Math.abs(ruleScore - hybridScore) >= 0.18) ruleHybridDisagreementCount += 1;

      const bucket = scoreBucket(hybridScore);
      histogram.set(bucket, (histogram.get(bucket) ?? 0) + 1);

      const flags: string[] = [];
      if (b.hybrid?.roleBoostApplied) flags.push("role-boost");
      if (b.hybrid?.mustHaveLanguageGap) flags.push("פער שפה");
      if (scored.queued && (b.hybrid?.mustHaveOverlap ?? 1) < 1) {
        flags.push("must-have חלקי בתור");
      }
      if (scored.queued && b.rule.mustPenalty > 0.5) flags.push("must-have חלש");
      if (flags.length) {
        suspicious.push({
          jobId: job.jobId,
          candidateId: cand.id,
          reasonHe: flags.join(" · "),
          score: hybridScore,
        });
      }
    }
  }

  suspicious.sort((a, b) => b.score - a.score);

  return {
    pairCount,
    threshold,
    queuedCount,
    degradedToRuleCount,
    ruleHybridDisagreementCount,
    scoreHistogram: [...histogram.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([bucket, count]) => ({ bucket, count })),
    suspicious: suspicious.slice(0, 40),
  };
}
