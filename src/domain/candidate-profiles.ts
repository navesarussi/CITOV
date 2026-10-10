import { randomUUID } from "crypto";
import type {
  CandidateCard,
  CandidateCvProfile,
  CandidateDocument,
  ChatMessage,
  EmployeeRecord,
} from "./types";
import { emptyCandidateCard, emptyCvProfile } from "./types";
import type { CvPatchInput } from "./cv-merge";

export type CandidateProfileSlot = {
  id: string;
  label: string;
  kind: "self" | "other";
  card: CandidateCard;
  chat: ChatMessage[];
  pendingFieldQuestionIds: string[];
};

export type CandidateProfilePack = {
  activeProfileId: string;
  profiles: CandidateProfileSlot[];
};

export type IdentityStaging = {
  cvPersonName: string;
  documentId: string;
  extraction: CvPatchInput;
  analyzedDocument: CandidateDocument;
};

function readPack(cv?: CandidateCvProfile): CandidateProfilePack | undefined {
  const raw = (cv as { profilePack?: CandidateProfilePack } | undefined)?.profilePack;
  if (!raw?.profiles?.length) return undefined;
  return raw;
}

function writePack(cv: CandidateCvProfile, pack: CandidateProfilePack): CandidateCvProfile {
  return { ...cv, profilePack: pack } as CandidateCvProfile;
}

export function ensureProfilePack(emp: EmployeeRecord, accountLabel = "אני"): EmployeeRecord {
  const existing = readPack(emp.cv);
  if (existing) return syncActiveToLegacy(emp, existing);
  const selfId = "self";
  const pack: CandidateProfilePack = {
    activeProfileId: selfId,
    profiles: [
      {
        id: selfId,
        label: accountLabel,
        kind: "self",
        card: emp.card,
        chat: emp.chat,
        pendingFieldQuestionIds: emp.pendingFieldQuestionIds,
      },
    ],
  };
  const cv = writePack(emp.cv ?? emptyCvProfile(), pack);
  return syncActiveToLegacy({ ...emp, cv }, pack);
}

function syncActiveToLegacy(emp: EmployeeRecord, pack: CandidateProfilePack): EmployeeRecord {
  const active =
    pack.profiles.find((p) => p.id === pack.activeProfileId) ?? pack.profiles[0]!;
  return {
    ...emp,
    card: active.card,
    chat: active.chat,
    pendingFieldQuestionIds: active.pendingFieldQuestionIds,
    cv: emp.cv,
  };
}

export function persistActiveProfile(emp: EmployeeRecord): EmployeeRecord {
  const pack = readPack(emp.cv) ?? ensureProfilePack(emp).cv?.profilePack;
  if (!pack) return emp;
  const nextProfiles = pack.profiles.map((p) =>
    p.id === pack.activeProfileId
      ? {
          ...p,
          card: emp.card,
          chat: emp.chat,
          pendingFieldQuestionIds: emp.pendingFieldQuestionIds,
        }
      : p,
  );
  const nextPack = { ...pack, profiles: nextProfiles };
  const cv = writePack(emp.cv ?? emptyCvProfile(), nextPack);
  return { ...emp, cv };
}

export function listCandidateProfiles(emp: EmployeeRecord): CandidateProfileSlot[] {
  const normalized = ensureProfilePack(emp);
  const pack = readPack(normalized.cv);
  return pack?.profiles ?? [];
}

export function switchActiveProfile(emp: EmployeeRecord, profileId: string): EmployeeRecord {
  const withPersist = persistActiveProfile(emp);
  const pack = readPack(withPersist.cv);
  if (!pack?.profiles.some((p) => p.id === profileId)) return withPersist;
  const nextPack = { ...pack, activeProfileId: profileId };
  const cv = writePack(withPersist.cv ?? emptyCvProfile(), nextPack);
  return syncActiveToLegacy({ ...withPersist, cv }, nextPack);
}

export function createOtherPersonProfile(
  emp: EmployeeRecord,
  label: string,
  card: CandidateCard,
  chat: ChatMessage[] = [],
): EmployeeRecord {
  const base = persistActiveProfile(emp);
  const pack = readPack(base.cv) ?? ensureProfilePack(base).cv!.profilePack!;
  const id = `other-${randomUUID().slice(0, 8)}`;
  const nextPack: CandidateProfilePack = {
    activeProfileId: id,
    profiles: [
      ...pack.profiles,
      {
        id,
        label,
        kind: "other",
        card,
        chat,
        pendingFieldQuestionIds: [],
      },
    ],
  };
  const cv = writePack(base.cv ?? emptyCvProfile(), nextPack);
  return syncActiveToLegacy({ ...base, cv }, nextPack);
}

export function setIdentityStaging(
  emp: EmployeeRecord,
  staging: IdentityStaging | undefined,
): EmployeeRecord {
  const cv = { ...(emp.cv ?? emptyCvProfile()), identityStaging: staging } as CandidateCvProfile;
  return { ...emp, cv };
}

export function getIdentityStaging(emp: EmployeeRecord): IdentityStaging | undefined {
  return (emp.cv as { identityStaging?: IdentityStaging } | undefined)?.identityStaging;
}

export function clearIdentityStaging(emp: EmployeeRecord): EmployeeRecord {
  if (!emp.cv?.identityStaging) return emp;
  const { identityStaging: _, ...rest } = emp.cv as CandidateCvProfile & {
    identityStaging?: IdentityStaging;
  };
  return { ...emp, cv: rest as CandidateCvProfile };
}

export function replaceEmployee(employees: EmployeeRecord[], next: EmployeeRecord): EmployeeRecord[] {
  return employees.map((e) => (e.userId === next.userId ? next : e));
}

export function emptyCardForNewProfile(): CandidateCard {
  return { ...emptyCandidateCard(), flexibility: 5 };
}
