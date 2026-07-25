import {
  candidateEngagement,
  employerEngagement,
  jobEngagement,
} from "@/domain/admin-engagement";
import { isDemoUserId } from "@/domain/admin";
import type {
  CandidateCard,
  ChatMessage,
  JobCard,
  MatchStatus,
  StoreData,
} from "@/domain/types";

export type AdminMatchSummary = {
  id: string;
  jobOwnerId: string;
  jobId: string;
  candidateId: string;
  score: number;
  scorePercent: number;
  reason: string;
  status: MatchStatus;
};

export type AdminCandidateSummary = {
  userId: string;
  name: string;
  email: string | null;
  knowledgePercent: number;
  userMessageCount: number;
  flexibility: number;
  hasCv: boolean;
};

export type AdminCandidateDetail = AdminCandidateSummary & {
  card: CandidateCard;
  chat: ChatMessage[];
  matches: AdminMatchSummary[];
  cvDocuments: { id: string; fileName: string; uploadedAt: string; byteSize: number }[];
};

export type AdminJobSummary = {
  jobId: string;
  title: string;
  knowledgePercent: number;
  userMessageCount: number;
  flexibility: number;
};

export type AdminEmployerSummary = {
  userId: string;
  name: string;
  email: string | null;
  jobCount: number;
  avgUserMessages: number;
  avgKnowledgePercent: number;
};

export type AdminEmployerDetail = AdminEmployerSummary & {
  jobs: AdminJobSummary[];
};

export type AdminJobDetail = AdminJobSummary & {
  employerId: string;
  employerName: string;
  card: JobCard;
  chat: ChatMessage[];
  matches: AdminMatchSummary[];
};

function mapMatch(m: StoreData["matches"][number]): AdminMatchSummary {
  return {
    id: m.id,
    jobOwnerId: m.jobOwnerId,
    jobId: m.jobId,
    candidateId: m.candidateId,
    score: m.score,
    scorePercent: Math.round(m.score * 100),
    reason: m.reason,
    status: m.status,
  };
}

function userName(store: StoreData, userId: string): string {
  return store.users.find((u) => u.id === userId)?.name ?? userId;
}

function userEmail(store: StoreData, userId: string): string | null {
  return store.users.find((u) => u.id === userId)?.email ?? null;
}

export function listAdminCandidates(store: StoreData): AdminCandidateSummary[] {
  return store.employees
    .filter((e) => !isDemoUserId(e.userId))
    .map((emp) => {
      const eng = candidateEngagement(emp);
      return {
        userId: emp.userId,
        name: userName(store, emp.userId),
        email: userEmail(store, emp.userId),
        knowledgePercent: eng.knowledgePercent,
        userMessageCount: eng.userMessageCount,
        flexibility: eng.flexibility,
        hasCv: (emp.cv?.documents?.length ?? 0) > 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export function getAdminCandidateDetail(
  store: StoreData,
  userId: string,
): AdminCandidateDetail | null {
  if (isDemoUserId(userId)) return null;
  const emp = store.employees.find((e) => e.userId === userId);
  if (!emp) return null;
  const eng = candidateEngagement(emp);
  return {
    userId: emp.userId,
    name: userName(store, emp.userId),
    email: userEmail(store, emp.userId),
    knowledgePercent: eng.knowledgePercent,
    userMessageCount: eng.userMessageCount,
    flexibility: eng.flexibility,
    hasCv: (emp.cv?.documents?.length ?? 0) > 0,
    card: emp.card,
    chat: emp.chat,
    matches: store.matches.filter((m) => m.candidateId === userId).map(mapMatch),
    cvDocuments: (emp.cv?.documents ?? []).map((d) => ({
      id: d.id,
      fileName: d.fileName,
      uploadedAt: d.uploadedAt,
      byteSize: d.byteSize,
    })),
  };
}

export function listAdminEmployers(store: StoreData): AdminEmployerSummary[] {
  return store.employers
    .filter((e) => !isDemoUserId(e.userId))
    .map((er) => {
      const eng = employerEngagement(er);
      return {
        userId: er.userId,
        name: userName(store, er.userId),
        email: userEmail(store, er.userId),
        jobCount: eng.jobCount,
        avgUserMessages: eng.avgUserMessages,
        avgKnowledgePercent: eng.avgKnowledgePercent,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export function getAdminEmployerDetail(
  store: StoreData,
  userId: string,
): AdminEmployerDetail | null {
  if (isDemoUserId(userId)) return null;
  const er = store.employers.find((e) => e.userId === userId);
  if (!er) return null;
  const eng = employerEngagement(er);
  return {
    userId: er.userId,
    name: userName(store, er.userId),
    email: userEmail(store, er.userId),
    jobCount: eng.jobCount,
    avgUserMessages: eng.avgUserMessages,
    avgKnowledgePercent: eng.avgKnowledgePercent,
    jobs: (er.jobs ?? []).map((j) => {
      const je = jobEngagement(j);
      return {
        jobId: j.id,
        title: j.name?.trim() || j.card.title || j.id,
        knowledgePercent: je.knowledgePercent,
        userMessageCount: je.userMessageCount,
        flexibility: je.flexibility,
      };
    }),
  };
}

export function getAdminJobDetail(
  store: StoreData,
  employerId: string,
  jobId: string,
): AdminJobDetail | null {
  if (isDemoUserId(employerId)) return null;
  const er = store.employers.find((e) => e.userId === employerId);
  if (!er) return null;
  const job = (er.jobs ?? []).find((j) => j.id === jobId);
  if (!job) return null;
  const je = jobEngagement(job);
  return {
    jobId: job.id,
    title: job.name?.trim() || job.card.title || job.id,
    knowledgePercent: je.knowledgePercent,
    userMessageCount: je.userMessageCount,
    flexibility: je.flexibility,
    employerId,
    employerName: userName(store, employerId),
    card: job.card,
    chat: job.chat,
    matches: store.matches
      .filter((m) => m.jobOwnerId === employerId && m.jobId === jobId)
      .map(mapMatch),
  };
}
