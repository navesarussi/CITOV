import type {
  CandidateCard,
  CandidateCvProfile,
  EvidenceConfidence,
  PendingInference,
} from "./types";
import { openReliabilityNote } from "./reliability";

export type CvInference = {
  fieldKey: string;
  value: string;
  evidence: string;
  confidence: EvidenceConfidence;
};

function isEmptyCardValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return false;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function norm(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean).join(", ");
  return String(v).trim();
}

/** Apply policy C inferences onto card + pending list. */
export function applyInferences(
  card: CandidateCard,
  cv: CandidateCvProfile,
  inferences: CvInference[],
  now: string,
  documentId: string,
  openConflict: (
    cv: CandidateCvProfile,
    fieldKey: string,
    existingValue: string,
    existingSource: "cv" | "chat" | "user",
    cvValue: string,
    now: string,
  ) => void,
): { card: CandidateCard; fieldsUpdated: number } {
  let next = card;
  let fieldsUpdated = 0;

  for (const inf of inferences) {
    const fieldKey = inf.fieldKey.trim();
    const value = inf.value.trim();
    const evidence = inf.evidence.trim();
    if (!fieldKey || !value || !evidence) continue;
    if (fieldKey === "flexibility" || fieldKey === "extras") continue;

    if (inf.confidence === "low") {
      const dup = cv.pendingInferences.some(
        (p) =>
          p.status === "pending" &&
          p.fieldKey === fieldKey &&
          p.value.toLowerCase() === value.toLowerCase(),
      );
      if (!dup) {
        const row: PendingInference = {
          id: `inf-${fieldKey}-${now}`,
          fieldKey,
          value,
          evidence,
          confidence: "low",
          status: "pending",
          at: now,
        };
        cv.pendingInferences.push(row);
      }
      continue;
    }

    const prevVal = (next as Record<string, unknown>)[fieldKey];
    if (isEmptyCardValue(prevVal)) {
      next = { ...next, [fieldKey]: value } as CandidateCard;
      fieldsUpdated += 1;
      cv.fieldEvidence.push({
        fieldKey,
        value,
        source: "cv",
        confidence: inf.confidence,
        at: now,
        documentId,
      });
      continue;
    }

    if (norm(prevVal) === norm(value)) {
      cv.fieldEvidence.push({
        fieldKey,
        value,
        source: "cv",
        confidence: inf.confidence,
        at: now,
        documentId,
      });
      continue;
    }

    openConflict(cv, fieldKey, norm(prevVal), "chat", norm(value), now);
    cv.reliability = openReliabilityNote(cv.reliability, {
      kind: "cv_vs_chat",
      fieldKey,
      summary: `CV inference (${inf.confidence}): "${value}" vs card: "${norm(prevVal)}" — evidence: ${evidence}`,
    }, now);
    cv.fieldEvidence.push({
      fieldKey,
      value,
      source: "cv",
      confidence: inf.confidence,
      at: now,
      documentId,
    });
  }

  return { card: next, fieldsUpdated };
}
