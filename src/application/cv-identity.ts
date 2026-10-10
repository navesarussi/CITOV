import { mergeCvIntoEmployee, type CvPatchInput } from "@/domain/cv-merge";
import {
  clearIdentityStaging,
  createOtherPersonProfile,
  emptyCardForNewProfile,
  ensureProfilePack,
  getIdentityStaging,
  replaceEmployee,
  setIdentityStaging,
  type IdentityStaging,
} from "@/domain/candidate-profiles";
import {
  extractCvPersonName,
  firstNameFromFullName,
  namesLikelySamePerson,
} from "@/domain/person-name";
import type { CandidateDocument, EmployeeRecord, StoreData } from "@/domain/types";
import { applyCvExtraction } from "./chat";

export function cvPersonNameFromExtraction(
  extraction: CvPatchInput,
  document: CandidateDocument,
): string | null {
  const subject = (extraction.patch as { subjectFullName?: string }).subjectFullName;
  return extractCvPersonName({
    subjectFullName: subject,
    summary: extraction.patch.summary,
    workHistory: extraction.workHistory,
    fileName: document.fileName,
  });
}

export function shouldStageIdentityMismatch(
  accountFullName: string,
  cvPersonName: string | null,
): boolean {
  if (!cvPersonName?.trim()) return false;
  return !namesLikelySamePerson(accountFullName, cvPersonName);
}

export function stageCvForIdentityCheck(
  store: StoreData,
  userId: string,
  staging: IdentityStaging,
): StoreData {
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) return store;
  let next = ensureProfilePack(emp, firstNameFromFullName(store.users.find((u) => u.id === userId)?.name ?? "") ?? "אני");
  next = setIdentityStaging(next, staging);
  return {
    ...store,
    employees: replaceEmployee(store.employees, next),
  };
}

export function commitStagedCvToSelf(store: StoreData, userId: string): StoreData {
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) return store;
  const staging = getIdentityStaging(emp);
  if (!staging) return store;
  const applied = applyCvExtraction(store, userId, staging.extraction, staging.analyzedDocument);
  let nextEmp = applied.store.employees.find((e) => e.userId === userId)!;
  nextEmp = clearIdentityStaging(nextEmp);
  return {
    ...applied.store,
    employees: replaceEmployee(applied.store.employees, nextEmp),
  };
}

export function commitStagedCvToOtherProfile(
  store: StoreData,
  userId: string,
  cvPersonName: string,
): StoreData {
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) return store;
  const staging = getIdentityStaging(emp);
  if (!staging) return store;

  let base = clearIdentityStaging(ensureProfilePack(emp));
  let withOther = createOtherPersonProfile(base, cvPersonName, emptyCardForNewProfile());
  const merged = mergeCvIntoEmployee(withOther, staging.extraction, staging.analyzedDocument);
  return {
    ...store,
    employees: replaceEmployee(store.employees, merged.employee),
  };
}

export function detectIdentityResolution(message: string): "self" | "other" | null {
  const m = message.trim().toLowerCase();
  if (!m) return null;
  if (
    /^(כן|שלי|עבורי|זה שלי|זה אני|mine|my cv|for me|yes)/.test(m) ||
    /הקו"ח שלי|קו"ח שלי/.test(m)
  ) {
    return "self";
  }
  if (
    /(מישהו אחר|של אחר|בשם|מגייס|משפחה|other|someone else|on behalf|not mine)/.test(m)
  ) {
    return "other";
  }
  return null;
}

export function tryResolveIdentityFromMessage(
  store: StoreData,
  userId: string,
  message: string,
): StoreData | null {
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp || !getIdentityStaging(emp)) return null;
  const resolution = detectIdentityResolution(message);
  if (!resolution) return null;
  const staging = getIdentityStaging(emp)!;
  if (resolution === "self") return commitStagedCvToSelf(store, userId);
  return commitStagedCvToOtherProfile(store, userId, staging.cvPersonName);
}
