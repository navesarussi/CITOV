/**
 * Builds frozen LLM-judge *suggestions* for holdout pairs (offline heuristic from rule scores).
 * Replace with real judge output via future import when available.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { matchingEvalDataset } from "../eval/matching/dataset";
import { scoreMatch } from "../src/domain/matching";
import type { LlmJudgePairRecord, LlmJudgeVerdict } from "../src/domain/llm-judge";
import type { RelevanceLabel } from "../src/domain/matching-eval/types";

const PAIRS_PATH = join(process.cwd(), "eval/matching/labeling/holdout-v1.pairs.json");
const OUT_PATH = join(process.cwd(), "eval/matching/labeling/holdout-v1.judgments.json");

type HoldoutRow = {
  pair_id: string;
  job_id: string;
  candidate_id: string;
  bucket: string;
};

const jobMap = new Map(matchingEvalDataset.jobs.map((j) => [j.id, j.card]));
const candMap = new Map(matchingEvalDataset.candidates.map((c) => [c.id, c.card]));

function scoreToLabel(score: number): RelevanceLabel {
  if (score >= 0.58) return "good";
  if (score >= 0.38) return "acceptable";
  return "bad";
}

function reasonFor(bucket: string, label: RelevanceLabel): string {
  const base =
    bucket === "location"
      ? "התאמת מיקום ונסיעה"
      : bucket === "must-have-gap"
        ? "פער בדרישות חובה"
        : bucket === "cross-language"
          ? "הבדל שפה/ניסוח בין כרטיסים"
          : "השוואת כישורים ותפקיד";
  if (label === "good") return `${base} — נראה מתאים לפי הכרטיסים.`;
  if (label === "acceptable") return `${base} — חלקי; ייתכן שיש פשרה.`;
  return `${base} — לא נראה מתאים.`;
}

function verdict(label: RelevanceLabel, bucket: string, confidence: number): LlmJudgeVerdict {
  return { label, reasonHe: reasonFor(bucket, label), confidence };
}

const rows = JSON.parse(readFileSync(PAIRS_PATH, "utf8")) as HoldoutRow[];
const judgments: LlmJudgePairRecord[] = [];

for (const row of rows) {
  const job = jobMap.get(row.job_id);
  const cand = candMap.get(row.candidate_id);
  if (!job || !cand) continue;
  const rule = scoreMatch(cand, job);
  const labelA = scoreToLabel(rule);
  const labelB =
    rule >= 0.45 && rule <= 0.52
      ? labelA === "good"
        ? "acceptable"
        : labelA === "acceptable"
          ? "good"
          : labelA
      : labelA;
  const agree = labelA === labelB;
  const judgeA = verdict(labelA, row.bucket, agree ? 0.88 : 0.72);
  const judgeB = {
    ...verdict(labelB, row.bucket, agree ? 0.86 : 0.7),
    critiqueHe: agree ? "מסכים/ה עם שופט א׳." : "יש ספק — כדאי החלטת בעלים.",
  };
  judgments.push({
    jobId: row.job_id,
    candidateId: row.candidate_id,
    judgeA,
    judgeB,
    judgesAgree: agree,
    autoSkipped: agree && judgeA.confidence >= 0.85,
    auditSample: false,
    needsOwner: !agree || judgeA.confidence < 0.85,
    engineScore: rule,
    ruleScore: rule,
    hybridScore: rule,
    engineQueued: rule >= 0.42,
  });
}

writeFileSync(
  OUT_PATH,
  `${JSON.stringify(
    {
      version: "holdout-v1",
      description: "Frozen judge suggestions for holdout labeling (heuristic fixture; owner label is truth)",
      judgments,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Wrote ${judgments.length} holdout judgment suggestions to ${OUT_PATH}`);
