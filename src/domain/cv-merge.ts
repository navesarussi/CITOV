import type {
  CandidateCard,
  CandidateCvProfile,
  CandidateDocument,
  EducationHistoryEntry,
  EmployeeRecord,
  EvidenceConfidence,
  FieldConflict,
  FieldEvidence,
  UnmappedFact,
  WorkHistoryEntry,
} from "./types";
import { emptyCvProfile, emptyReliability } from "./types";
import { applyInferences, type CvInference } from "./cv-inference-merge";
import { openReliabilityNote, recomputeReliability, resolveReliabilityNotesForField } from "./reliability";

export type CvPatchInput = {
  patch: Partial<CandidateCard> & {
    skills?: string[];
    softSkills?: string[];
    languages?: string[];
    extras?: Record<string, string>;
    experienceYears?: number | null;
    flexibility?: number;
  };
  workHistory?: WorkHistoryEntry[];
  educationHistory?: EducationHistoryEntry[];
  unmappedFacts?: UnmappedFact[];
  fieldConfidence?: Record<string, EvidenceConfidence>;
  inferences?: CvInference[];
};

export type CvImportSummary = {
  fieldsUpdated: number;
  rolesFound: number;
  educationFound: number;
  conflictsPending: number;
  unmappedCount: number;
  fileName: string;
};

const ARRAY_KEYS = ["skills", "softSkills", "languages"] as const;
const SKIP_KEYS = new Set(["flexibility", "extras", "workHistory", "educationHistory"]);

function norm(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") {
      return v
        .map((row) => JSON.stringify(row))
        .join("|");
    }
    return v.map(String).map((s) => s.trim()).filter(Boolean).join(", ");
  }
  return String(v).trim();
}

function isEmptyCardValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (typeof v === "number") return false;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function unionStrings(a: string[], b: string[]): string[] {
  const seen = new Set(a.map((s) => s.trim().toLowerCase()).filter(Boolean));
  const out = [...a];
  for (const item of b) {
    const t = item.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function workKey(w: WorkHistoryEntry): string {
  return [w.company, w.title, w.startDate ?? "", w.endDate ?? ""]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

function eduKey(e: EducationHistoryEntry): string {
  return [e.institution, e.degreeOrProgram, e.startDate ?? "", e.endDate ?? ""]
    .map((s) => s.trim().toLowerCase())
    .join("|");
}

function appendUniqueWork(
  existing: WorkHistoryEntry[],
  incoming: WorkHistoryEntry[],
): WorkHistoryEntry[] {
  const seen = new Set(existing.map(workKey));
  const out = [...existing];
  for (const row of incoming) {
    if (!row.company?.trim() && !row.title?.trim()) continue;
    const k = workKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

function appendUniqueEdu(
  existing: EducationHistoryEntry[],
  incoming: EducationHistoryEntry[],
): EducationHistoryEntry[] {
  const seen = new Set(existing.map(eduKey));
  const out = [...existing];
  for (const row of incoming) {
    if (!row.institution?.trim() && !row.degreeOrProgram?.trim()) continue;
    const k = eduKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}

function pendingConflicts(cv: CandidateCvProfile): FieldConflict[] {
  return cv.conflicts.filter((c) => c.status === "pending");
}

function openConflict(
  cv: CandidateCvProfile,
  fieldKey: string,
  existingValue: string,
  existingSource: FieldEvidence["source"],
  cvValue: string,
  now: string,
): void {
  const pending = cv.conflicts.find((c) => c.fieldKey === fieldKey && c.status === "pending");
  if (pending) {
    const hasCv = pending.values.some((v) => v.source === "cv" && v.value === cvValue);
    if (!hasCv) pending.values.push({ value: cvValue, source: "cv", at: now });
    return;
  }
  cv.conflicts.push({
    id: `conflict-${fieldKey}-${now}`,
    fieldKey,
    values: [
      { value: existingValue, source: existingSource, at: now },
      { value: cvValue, source: "cv", at: now },
    ],
    status: "pending",
  });
  cv.reliability = openReliabilityNote(
    cv.reliability,
    {
      kind: existingSource === "chat" ? "cv_vs_chat" : "cv_vs_chat",
      fieldKey,
      summary: `Conflict on ${fieldKey}: existing (${existingSource}) "${existingValue}" vs cv "${cvValue}"`,
    },
    now,
  );
}

/** Merge CV extraction into employee card + cv profile without silent overwrites. */
export function mergeCvIntoEmployee(
  emp: EmployeeRecord,
  input: CvPatchInput,
  document: CandidateDocument,
  now = new Date().toISOString(),
): { employee: EmployeeRecord; summary: CvImportSummary } {
  const prior = emp.cv;
  const cv: CandidateCvProfile = {
    ...emptyCvProfile(),
    ...(prior ?? {}),
    workHistory: [...(prior?.workHistory ?? [])],
    educationHistory: [...(prior?.educationHistory ?? [])],
    unmappedFacts: [...(prior?.unmappedFacts ?? [])],
    fieldEvidence: [...(prior?.fieldEvidence ?? [])],
    conflicts: [...(prior?.conflicts ?? [])],
    documents: [...(prior?.documents ?? [])],
    pendingInferences: [...(prior?.pendingInferences ?? [])],
    reliability: prior?.reliability ?? emptyReliability(now),
  };

  let card: CandidateCard = {
    ...emp.card,
    workHistory: [...(emp.card.workHistory ?? [])],
    educationHistory: [...(emp.card.educationHistory ?? [])],
  };
  let fieldsUpdated = 0;
  const patch = input.patch ?? {};
  const confidence = input.fieldConfidence ?? {};

  for (const key of ARRAY_KEYS) {
    const incoming = patch[key];
    if (!incoming?.length) continue;
    const prev = card[key] ?? [];
    const merged = unionStrings(prev, incoming);
    if (merged.length !== prev.length) fieldsUpdated += 1;
    card = { ...card, [key]: merged };
    for (const item of incoming) {
      cv.fieldEvidence.push({
        fieldKey: key,
        value: item,
        source: "cv",
        confidence: confidence[key],
        at: now,
        documentId: document.id,
      });
    }
  }

  for (const [key, raw] of Object.entries(patch)) {
    if (ARRAY_KEYS.includes(key as (typeof ARRAY_KEYS)[number])) continue;
    if (SKIP_KEYS.has(key)) continue;
    if (raw === undefined) continue;
    if (key === "extras" && raw && typeof raw === "object") {
      const extras = { ...card.extras };
      let changed = false;
      for (const [ek, ev] of Object.entries(raw as Record<string, string>)) {
        if (!ev?.trim()) continue;
        if (!extras[ek]) {
          extras[ek] = ev;
          changed = true;
          fieldsUpdated += 1;
        } else if (norm(extras[ek]) !== norm(ev)) {
          openConflict(cv, ek, norm(extras[ek]), "chat", norm(ev), now);
        }
        cv.fieldEvidence.push({
          fieldKey: `extras.${ek}`,
          value: ev,
          source: "cv",
          at: now,
          documentId: document.id,
        });
      }
      if (changed) card = { ...card, extras };
      continue;
    }

    const fieldKey = key as keyof CandidateCard;
    const nextVal = raw;
    const prevVal = card[fieldKey];
    const nextNorm = norm(nextVal);
    if (!nextNorm && nextVal !== 0 && nextVal !== null) continue;

    if (isEmptyCardValue(prevVal)) {
      card = { ...card, [fieldKey]: nextVal } as CandidateCard;
      fieldsUpdated += 1;
      cv.fieldEvidence.push({
        fieldKey,
        value: nextNorm,
        source: "cv",
        confidence: confidence[fieldKey],
        at: now,
        documentId: document.id,
      });
      continue;
    }

    if (norm(prevVal) === nextNorm) {
      cv.fieldEvidence.push({
        fieldKey,
        value: nextNorm,
        source: "cv",
        confidence: confidence[fieldKey],
        at: now,
        documentId: document.id,
      });
      continue;
    }

    openConflict(cv, fieldKey, norm(prevVal), "chat", nextNorm, now);
    cv.fieldEvidence.push({
      fieldKey,
      value: nextNorm,
      source: "cv",
      confidence: confidence[fieldKey],
      at: now,
      documentId: document.id,
    });
  }

  const inferred = applyInferences(
    card,
    cv,
    input.inferences ?? [],
    now,
    document.id,
    openConflict,
  );
  card = inferred.card;
  fieldsUpdated += inferred.fieldsUpdated;

  const beforeRoles = cv.workHistory.length;
  cv.workHistory = appendUniqueWork(cv.workHistory, input.workHistory ?? []);
  const rolesAdded = cv.workHistory.length - beforeRoles;

  const beforeEdu = cv.educationHistory.length;
  cv.educationHistory = appendUniqueEdu(cv.educationHistory, input.educationHistory ?? []);
  const eduAdded = cv.educationHistory.length - beforeEdu;

  card = {
    ...card,
    workHistory: appendUniqueWork(card.workHistory ?? [], cv.workHistory),
    educationHistory: appendUniqueEdu(card.educationHistory ?? [], cv.educationHistory),
  };

  for (const fact of input.unmappedFacts ?? []) {
    if (!fact.label?.trim() || !fact.value?.trim()) continue;
    const dup = cv.unmappedFacts.some(
      (f) =>
        f.label.trim().toLowerCase() === fact.label.trim().toLowerCase() &&
        f.value.trim().toLowerCase() === fact.value.trim().toLowerCase(),
    );
    if (!dup) cv.unmappedFacts.push(fact);
    const extrasKey = fact.label.trim();
    if (extrasKey && !card.extras[extrasKey]) {
      card = { ...card, extras: { ...card.extras, [extrasKey]: fact.value.trim() } };
      fieldsUpdated += 1;
    }
  }

  cv.documents = [...cv.documents.filter((d) => d.id !== document.id), document];
  cv.reliability = recomputeReliability({
    conflicts: cv.conflicts,
    pendingInferences: cv.pendingInferences,
    notes: cv.reliability.notes,
    now,
  });

  const summary: CvImportSummary = {
    fieldsUpdated,
    rolesFound: rolesAdded,
    educationFound: eduAdded,
    conflictsPending: pendingConflicts(cv).length,
    unmappedCount: (input.unmappedFacts ?? []).length,
    fileName: document.fileName,
  };

  return {
    employee: { ...emp, card, cv },
    summary,
  };
}

/** When a patch sets a field to one of the conflict values, mark it resolved. */
export function resolveConflictsFromPatch(
  cv: CandidateCvProfile | undefined,
  patch: Partial<CandidateCard>,
  now = new Date().toISOString(),
): CandidateCvProfile | undefined {
  if (!cv) return cv;
  if (!cv.conflicts.length && !cv.pendingInferences?.length) return cv;

  const conflicts = (cv.conflicts ?? []).map((c) => {
    if (c.status !== "pending") return c;
    const raw = (patch as Record<string, unknown>)[c.fieldKey];
    if (raw === undefined) return c;
    const chosen = norm(raw);
    if (!chosen) return c;
    const match = c.values.find((v) => v.value === chosen);
    if (!match) return c;
    return { ...c, status: "resolved" as const, resolvedValue: chosen };
  });

  const evidence: FieldEvidence[] = [...cv.fieldEvidence];
  let reliability = cv.reliability ?? emptyReliability(now);
  for (const c of conflicts) {
    if (c.status === "resolved" && c.resolvedValue) {
      evidence.push({
        fieldKey: c.fieldKey,
        value: c.resolvedValue,
        source: "chat",
        at: now,
      });
      reliability = resolveReliabilityNotesForField(reliability, c.fieldKey, now);
    }
  }

  reliability = recomputeReliability({
    conflicts,
    pendingInferences: cv.pendingInferences ?? [],
    notes: reliability.notes,
    now,
  });

  return { ...cv, conflicts, fieldEvidence: evidence, reliability };
}

export function resolvePendingInferencesFromPatch(
  cv: CandidateCvProfile | undefined,
  patch: Partial<CandidateCard>,
  now = new Date().toISOString(),
): CandidateCvProfile | undefined {
  if (!cv?.pendingInferences?.length) return cv;
  const pendingInferences = cv.pendingInferences.map((p) => {
    if (p.status !== "pending") return p;
    const raw = (patch as Record<string, unknown>)[p.fieldKey];
    if (raw === undefined) return p;
    const chosen = norm(raw);
    if (!chosen) return p;
    if (chosen.toLowerCase() === p.value.toLowerCase()) {
      return { ...p, status: "accepted" as const };
    }
    return { ...p, status: "rejected" as const };
  });
  const reliability = recomputeReliability({
    conflicts: cv.conflicts,
    pendingInferences,
    notes: cv.reliability?.notes ?? [],
    now,
  });
  return { ...cv, pendingInferences, reliability };
}

export function formatPendingConflictsForPrompt(cv?: CandidateCvProfile): string {
  const pending = (cv?.conflicts ?? []).filter((c) => c.status === "pending");
  if (!pending.length) return "";
  return pending
    .map((c) => {
      const opts = c.values.map((v) => `${v.source}: "${v.value}"`).join(" | ");
      return `- ${c.fieldKey}: ${opts}`;
    })
    .join("\n");
}

export function formatPendingInferencesForPrompt(cv?: CandidateCvProfile): string {
  const pending = (cv?.pendingInferences ?? []).filter((p) => p.status === "pending");
  if (!pending.length) return "";
  return pending
    .map((p) => `- ${p.fieldKey}: "${p.value}" (רמז מהקו״ח: ${p.evidence})`)
    .join("\n");
}

export function formatOpenReliabilityNotesForPrompt(cv?: CandidateCvProfile): string {
  const open = (cv?.reliability?.notes ?? []).filter((n) => n.status === "open");
  if (!open.length) return "";
  return open.map((n) => `- ${n.fieldKey ?? n.kind}: ${n.summary}`).join("\n");
}

/** Open a chat_internal conflict when chat patch differs from card. */
export function openChatConflictOnCard(
  cv: CandidateCvProfile,
  fieldKey: string,
  existingValue: string,
  newValue: string,
  now: string,
): CandidateCvProfile {
  const next: CandidateCvProfile = {
    ...cv,
    conflicts: [...cv.conflicts],
    reliability: cv.reliability ?? emptyReliability(now),
  };
  const pending = next.conflicts.find((c) => c.fieldKey === fieldKey && c.status === "pending");
  if (pending) {
    const has = pending.values.some((v) => v.source === "chat" && v.value === newValue);
    if (!has) pending.values.push({ value: newValue, source: "chat", at: now });
  } else {
    next.conflicts.push({
      id: `conflict-${fieldKey}-${now}`,
      fieldKey,
      values: [
        { value: existingValue, source: "chat", at: now },
        { value: newValue, source: "chat", at: now },
      ],
      status: "pending",
    });
  }
  next.reliability = openReliabilityNote(
    next.reliability,
    {
      kind: "chat_internal",
      fieldKey,
      summary: `Chat inconsistency on ${fieldKey}: "${existingValue}" vs "${newValue}"`,
    },
    now,
  );
  next.reliability = recomputeReliability({
    conflicts: next.conflicts,
    pendingInferences: next.pendingInferences,
    notes: next.reliability.notes,
    now,
  });
  return next;
}
