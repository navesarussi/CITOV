import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { LlmJudgePairRecord } from "@/domain/llm-judge";

const JUDGMENTS_PATH = join(process.cwd(), "eval/matching/labeling/holdout-v1.judgments.json");

export type HoldoutJudgmentsFile = {
  version: string;
  description: string;
  judgments: LlmJudgePairRecord[];
};

let cache: Map<string, LlmJudgePairRecord> | null = null;

export function holdoutJudgmentByPair(jobId: string, candidateId: string): LlmJudgePairRecord | null {
  const map = loadHoldoutJudgmentsMap();
  return map.get(`${jobId}:${candidateId}`) ?? null;
}

export function loadHoldoutJudgmentsMap(): Map<string, LlmJudgePairRecord> {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = JSON.parse(readFileSync(JUDGMENTS_PATH, "utf8")) as HoldoutJudgmentsFile;
    for (const j of raw.judgments ?? []) {
      cache.set(`${j.jobId}:${j.candidateId}`, j);
    }
  } catch {
    // fixture optional until generated
  }
  return cache;
}

export function holdoutJudgmentCount(): number {
  return loadHoldoutJudgmentsMap().size;
}
