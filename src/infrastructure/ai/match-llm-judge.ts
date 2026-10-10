/**
 * שני שופטי Gemini ל-batch בארגז בדיקות: א׳ מתייג, ב׳ רואה את א׳ + ביקורת עצמאית.
 * מודל ב׳: GEMINI_JUDGE_B_MODEL (ברירת מחדל gemini-2.5-pro).
 */
import { generateObject } from "ai";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { RelevanceLabel } from "@/domain/matching-eval/types";
import type { CandidateCard, JobCard } from "@/domain/types";
import { callGeminiWithRetry, getGeminiModel, hasGeminiKey } from "./gemini-client";
import { withGeminiTelemetry } from "@/infrastructure/observability/gemini-telemetry";
import { extractGeminiUsage } from "./usage-extract";
import type { AiTokenUsage } from "./schemas";

const verdictSchema = z.object({
  label: z.enum(["good", "acceptable", "bad"]),
  reasonHe: z.string(),
  confidence: z.number().min(0).max(1),
});

const judgeASchema = z.object({
  pairs: z.array(
    z.object({
      pairIndex: z.number().int(),
      label: verdictSchema.shape.label,
      reasonHe: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

const judgeBSchema = z.object({
  pairs: z.array(
    z.object({
      pairIndex: z.number().int(),
      label: verdictSchema.shape.label,
      reasonHe: z.string(),
      confidence: z.number().min(0).max(1),
      critiqueHe: z.string(),
    }),
  ),
});

function loadPrompt(name: string): string {
  return readFileSync(join(process.cwd(), "prompts/eval", name), "utf8");
}

function cardBlock(job: JobCard, candidate: CandidateCard): string {
  return JSON.stringify(
    {
      job: {
        title: job.title,
        field: job.field,
        location: job.location,
        mustHaves: job.mustHaves,
        niceToHaves: job.niceToHaves,
        requiredLanguages: job.requiredLanguages,
        summary: job.summary,
        toolsRequired: job.toolsRequired,
      },
      candidate: {
        desiredRole: candidate.desiredRole,
        field: candidate.field,
        location: candidate.location,
        skills: candidate.skills,
        languages: candidate.languages,
        hebrewLevel: candidate.hebrewLevel,
        englishLevel: candidate.englishLevel,
        summary: candidate.summary,
      },
    },
    null,
    0,
  );
}

export type JudgeBatchPair = {
  pairIndex: number;
  jobId: string;
  candidateId: string;
  job: JobCard;
  candidate: CandidateCard;
};

export type JudgeUsageEntry = { usage: AiTokenUsage; model: string };

export type JudgeBatchResult = {
  judgeA: Map<number, { label: RelevanceLabel; reasonHe: string; confidence: number }>;
  judgeB: Map<
    number,
    { label: RelevanceLabel; reasonHe: string; confidence: number; critiqueHe: string }
  >;
  usage: JudgeUsageEntry[];
};

export async function runTwoJudgeBatch(
  pairs: JudgeBatchPair[],
  judgeAOutputs?: Map<number, { label: RelevanceLabel; reasonHe: string; confidence: number }>,
): Promise<JudgeBatchResult> {
  if (!hasGeminiKey() || !pairs.length) {
    return { judgeA: new Map(), judgeB: new Map(), usage: [] };
  }
  const usage: JudgeUsageEntry[] = [];
  const judgeA = new Map<number, { label: RelevanceLabel; reasonHe: string; confidence: number }>();
  const modelA = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  if (judgeAOutputs) {
    for (const [k, v] of judgeAOutputs) judgeA.set(k, v);
  } else {
    const systemA = loadPrompt("match-judge-a.md");
    const userA = pairs
      .map(
        (p) =>
          `[pairIndex=${p.pairIndex} jobId=${p.jobId} candidateId=${p.candidateId}]\n${cardBlock(p.job, p.candidate)}`,
      )
      .join("\n\n---\n\n");
    const { object, usage: uA } = await callGeminiWithRetry(() =>
      generateObject(
        withGeminiTelemetry(
          {
            model: getGeminiModel(modelA),
            temperature: 0.2,
            schema: judgeASchema,
            system: systemA,
            prompt: userA,
          },
          { callType: "llm_judge_a", model: modelA, inputSummary: `pairs=${pairs.length}` },
        ),
      ),
    );
    const u = extractGeminiUsage(uA);
    if (u) usage.push({ usage: u, model: modelA });
    for (const row of object.pairs) {
      judgeA.set(row.pairIndex, {
        label: row.label,
        reasonHe: row.reasonHe,
        confidence: row.confidence,
      });
    }
  }

  const modelB = process.env.GEMINI_JUDGE_B_MODEL?.trim() || "gemini-2.5-pro";
  const userBBlind = pairs
    .map(
      (p) =>
        `[pairIndex=${p.pairIndex} jobId=${p.jobId} candidateId=${p.candidateId}]\n${cardBlock(p.job, p.candidate)}`,
    )
    .join("\n\n---\n\n");

  const { object: blindB, usage: uBlind } = await callGeminiWithRetry(() =>
    generateObject(
      withGeminiTelemetry(
        {
          model: getGeminiModel(modelB),
          temperature: 0.25,
          schema: judgeASchema,
          system: loadPrompt("match-judge-b-blind.md"),
          prompt: userBBlind,
        },
        { callType: "llm_judge_b", model: modelB, inputSummary: `pairs=${pairs.length} blind` },
      ),
    ),
  );
  const uBlindParsed = extractGeminiUsage(uBlind);
  if (uBlindParsed) usage.push({ usage: uBlindParsed, model: modelB });

  const judgeB = new Map<
    number,
    { label: RelevanceLabel; reasonHe: string; confidence: number; critiqueHe: string }
  >();
  for (const row of blindB.pairs) {
    judgeB.set(row.pairIndex, {
      label: row.label,
      reasonHe: row.reasonHe,
      confidence: row.confidence,
      critiqueHe: "",
    });
  }

  const critiqueSchema = z.object({
    pairs: z.array(
      z.object({
        pairIndex: z.number().int(),
        critiqueHe: z.string(),
      }),
    ),
  });
  const userCritique = pairs
    .map((p) => {
      const a = judgeA.get(p.pairIndex);
      const b = judgeB.get(p.pairIndex);
      return `[pairIndex=${p.pairIndex}]\nCards:\n${cardBlock(p.job, p.candidate)}\n\nJudge A: label=${a?.label ?? "?"} confidence=${a?.confidence ?? 0} reason=${a?.reasonHe ?? ""}\n\nYour verdict (already locked): label=${b?.label ?? "?"} confidence=${b?.confidence ?? 0} reason=${b?.reasonHe ?? ""}`;
    })
    .join("\n\n---\n\n");

  const { object: critiqueB, usage: uCrit } = await callGeminiWithRetry(() =>
    generateObject(
      withGeminiTelemetry(
        {
          model: getGeminiModel(modelB),
          temperature: 0.2,
          schema: critiqueSchema,
          system: loadPrompt("match-judge-b.md"),
          prompt: userCritique,
        },
        { callType: "llm_judge_b", model: modelB, inputSummary: `pairs=${pairs.length} critique` },
      ),
    ),
  );
  const uCritParsed = extractGeminiUsage(uCrit);
  if (uCritParsed) usage.push({ usage: uCritParsed, model: modelB });
  for (const row of critiqueB.pairs) {
    const prev = judgeB.get(row.pairIndex);
    if (prev) judgeB.set(row.pairIndex, { ...prev, critiqueHe: row.critiqueHe });
  }

  return { judgeA, judgeB, usage };
}
