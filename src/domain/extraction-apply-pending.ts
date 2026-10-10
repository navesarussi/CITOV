import type { CandidateCvProfile, PendingInference } from "./types";
import type { ExtractedField } from "./extraction-evidence";

export function pushPendingConfirmations(
  cv: CandidateCvProfile,
  fields: ExtractedField[],
  now: string,
): void {
  for (const f of fields) {
    const fieldKey = f.fieldKey.trim();
    const value = f.value.trim();
    const evidence = f.evidence.trim();
    if (!fieldKey || !value) continue;
    const dup = cv.pendingInferences.some(
      (p) =>
        p.status === "pending" &&
        p.fieldKey === fieldKey &&
        p.value.toLowerCase() === value.toLowerCase(),
    );
    if (dup) continue;
    const row: PendingInference = {
      id: `confirm-${fieldKey}-${now}-${Math.random().toString(36).slice(2, 7)}`,
      fieldKey,
      value,
      evidence: evidence || "—",
      confidence: f.confidence === "medium" ? "medium" : "low",
      status: "pending",
      at: now,
    };
    cv.pendingInferences.push(row);
  }
}
