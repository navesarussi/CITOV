import { createHash } from "node:crypto";
import { estimateCostUsd, resolveGeminiPricingKey } from "@/domain/ai-pricing";
import type { AiTokenUsage } from "@/infrastructure/ai/schemas";
import { isLangfuseEnabled } from "./langfuse-env";

export type GeminiCallType =
  | "chat_reply_employee_stream"
  | "chat_reply_employer_stream"
  | "chat_patch_employee"
  | "chat_patch_employer"
  | "chat_intake_employee"
  | "chat_intake_employer"
  | "cv_welcome_reply"
  | "cv_extraction_pass_a"
  | "cv_extraction_pass_b"
  | "job_import_extraction"
  | "embedding"
  | "llm_judge_a"
  | "llm_judge_b"
  | "match_reason_enrich"
  | "translate_fields";

export type GeminiTelemetryContext = {
  callType: GeminiCallType;
  model?: string;
  userId?: string;
  sessionId?: string;
  promptBundleVersion?: string;
  /** Redacted summary only — never raw CV/chat. */
  inputSummary?: string;
};

function hashUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export function redactTelemetryText(text: string, max = 160): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function estimateUsageCostUsd(model: string, usage?: AiTokenUsage): number | undefined {
  if (!usage) return undefined;
  const key = resolveGeminiPricingKey(model);
  return estimateCostUsd(
    key,
    usage.promptTokens,
    usage.completionTokens,
    usage.cachedPromptTokens ?? 0,
  );
}

/** Attach Langfuse-compatible AI SDK v6 telemetry when keys are configured. */
export function withGeminiTelemetry<T extends Record<string, unknown>>(
  options: T,
  ctx: GeminiTelemetryContext,
): T {
  if (!isLangfuseEnabled()) return options;
  const metadata: Record<string, string | number | boolean | undefined> = {
    callType: ctx.callType,
    model: ctx.model,
    promptBundleVersion: ctx.promptBundleVersion ?? "unknown",
    sessionId: ctx.sessionId,
    userId: ctx.userId ? hashUserId(ctx.userId) : undefined,
    inputSummary: ctx.inputSummary,
  };
  return {
    ...options,
    experimental_telemetry: {
      isEnabled: true,
      functionId: ctx.callType,
      metadata,
    },
  };
}
