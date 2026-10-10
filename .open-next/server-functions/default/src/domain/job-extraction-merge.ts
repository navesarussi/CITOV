import type { JobCard, JobImportMeta, JobSlot, PendingInference } from "./types";
import { JOB_INFERENCE_FIELD_KEYS } from "./cv-inference-field-keys";
import { gateExtractedFields, type ExtractedField } from "./extraction-evidence";
import { applyJobPatch } from "@/application/chat-turn";
import type { JobPatch } from "@/infrastructure/ai/schemas";

export type JobExtractionPayload = {
  patch: Record<string, unknown>;
  extractedFields?: ExtractedField[];
  sourceText: string;
};

export function mergeGatedJobExtraction(
  slot: JobSlot,
  payload: JobExtractionPayload,
  now: string,
): { slot: JobSlot; pending: PendingInference[] } {
  const gated = gateExtractedFields({
    sourceText: payload.sourceText,
    patch: payload.patch,
    extractedFields: payload.extractedFields,
    allowedFieldKeys: JOB_INFERENCE_FIELD_KEYS,
  });
  const card = applyJobPatch(slot.card, gated.acceptedPatch as JobPatch);
  const importMeta: JobImportMeta = {
    pendingConfirmations: [...(slot.importMeta?.pendingConfirmations ?? [])],
  };
  for (const f of gated.pendingConfirmations) {
    const fieldKey = f.fieldKey.trim();
    const value = f.value.trim();
    if (!fieldKey || !value) continue;
    const dup = importMeta.pendingConfirmations.some(
      (p) =>
        p.status === "pending" &&
        p.fieldKey === fieldKey &&
        p.value.toLowerCase() === value.toLowerCase(),
    );
    if (dup) continue;
    importMeta.pendingConfirmations.push({
      id: `job-confirm-${fieldKey}-${now}`,
      fieldKey,
      value,
      evidence: f.evidence.trim() || "—",
      confidence: f.confidence === "medium" ? "medium" : "low",
      status: "pending",
      at: now,
    });
  }
  return {
    slot: { ...slot, card, importMeta },
    pending: importMeta.pendingConfirmations.filter((p) => p.status === "pending"),
  };
}

export function resolveJobImportConfirmationsFromPatch(
  slot: JobSlot,
  patch: Partial<JobCard>,
): JobSlot {
  const pending = slot.importMeta?.pendingConfirmations;
  if (!pending?.length) return slot;
  const updated = pending.map((p) => {
    if (p.status !== "pending") return p;
    const raw = (patch as Record<string, unknown>)[p.fieldKey];
    if (raw === undefined) return p;
    const chosen = Array.isArray(raw) ? raw.join(", ") : String(raw).trim();
    if (!chosen) return p;
    if (chosen.toLowerCase() === p.value.toLowerCase()) {
      return { ...p, status: "accepted" as const };
    }
    return { ...p, status: "rejected" as const };
  });
  return {
    ...slot,
    importMeta: { pendingConfirmations: updated },
  };
}
