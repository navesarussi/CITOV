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

export type JudgeBatchResult = {
  judgeA: Map<number, { label: RelevanceLabel; reasonHe: string; confidence: number }>;
  judgeB: Map<
    number,
    { label: RelevanceLabel; reasonHe: string; confidence: number; critiqueHe: string }
  >;
  usage: AiTokenUsage[];
};

export async function runTwoJudgeBatch(
  pairs: JudgeBatchPair[],
  judgeAOutputs?: Map<number, { label: RelevanceLabel; reasonHe: string; confidence: number }>,
): Promise<JudgeBatchResult> {
  if (!hasGeminiKey() || !pairs.length) {
    return { judgeA: new Map(), judgeB: new Map(), usage: [] };
  }
  const usage: AiTokenUsage[] = [];
  const judgeA = new Map<number, { label: RelevanceLabel; reasonHe: string; confidence: number }>();
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
      generateObject({
        model: getGeminiModel(),
        temperature: 0.2,
        schema: judgeASchema,
        system: systemA,
        prompt: userA,
      }),
    );
    const u = extractGeminiUsage(uA);
    if (u) usage.push(u);
    for (const row of object.pairs) {
      judgeA.set(row.pairIndex, {
        label: row.label,
        reasonHe: row.reasonHe,
        confidence: row.confidence,
      });
    }
  }

  const systemB = loadPrompt("match-judge-b.md");
  const userB = pairs
    .map((p) => {
      const a = judgeA.get(p.pairIndex);
      return `[pairIndex=${p.pairIndex}]\nCards:\n${cardBlock(p.job, p.candidate)}\n\nJudge A: label=${a?.label ?? "?"} confidence=${a?.confidence ?? 0} reason=${a?.reasonHe ?? ""}`;
    })
    .join("\n\n---\n\n");

  const modelB = process.env.GEMINI_JUDGE_B_MODEL?.trim() || "gemini-2.5-pro";
  const { object: objectB, usage: uB } = await callGeminiWithRetry(() =>
    generateObject({
      model: getGeminiModel(modelB),
      temperature: 0.25,
      schema: judgeBSchema,
      system: systemB,
      prompt: userB,
    }),
  );
  const u2 = extractGeminiUsage(uB);
  if (u2) usage.push(u2);

  const judgeB = new Map<
    number,
    { label: RelevanceLabel; reasonHe: string; confidence: number; critiqueHe: string }
  >();
  for (const row of objectB.pairs) {
    judgeB.set(row.pairIndex, {
      label: row.label,
      reasonHe: row.reasonHe,
      confidence: row.confidence,
      critiqueHe: row.critiqueHe,
    });
  }

  return { judgeA, judgeB, usage };
}
