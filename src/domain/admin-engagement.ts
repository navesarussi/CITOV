import { candidateRows, jobRows, knowledgePercent } from "@/domain/card-progress";
import { isDemoUserId } from "@/domain/admin";
import type {
  CandidateCard,
  ChatMessage,
  EmployeeRecord,
  EmployerRecord,
  JobCard,
  JobSlot,
  StoreData,
} from "@/domain/types";

export function countUserMessages(chat: ChatMessage[]): number {
  return chat.filter((m) => m.role === "user").length;
}

export function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function candidateKnowledgePercent(card: CandidateCard): number {
  return knowledgePercent(candidateRows(card));
}

export function jobKnowledgePercent(card: JobCard): number {
  return knowledgePercent(jobRows(card));
}

export function candidateEngagement(emp: EmployeeRecord) {
  return {
    knowledgePercent: candidateKnowledgePercent(emp.card),
    userMessageCount: countUserMessages(emp.chat),
    flexibility: emp.card.flexibility,
  };
}

export function jobEngagement(job: JobSlot) {
  return {
    knowledgePercent: jobKnowledgePercent(job.card),
    userMessageCount: countUserMessages(job.chat),
    flexibility: job.card.flexibility,
  };
}

export function employerEngagement(er: EmployerRecord) {
  const jobs = er.jobs ?? [];
  const msgs = jobs.map((j) => countUserMessages(j.chat));
  const knowledge = jobs.map((j) => jobKnowledgePercent(j.card));
  return {
    jobCount: jobs.length,
    avgUserMessages: mean(msgs),
    avgKnowledgePercent: mean(knowledge),
  };
}

export function storeEngagementStats(store: StoreData) {
  const employees = store.employees.filter((e) => !isDemoUserId(e.userId));
  const employers = store.employers.filter((e) => !isDemoUserId(e.userId));
  const jobs = employers.flatMap((e) => e.jobs ?? []);

  return {
    avgCandidateKnowledgePercent: mean(employees.map((e) => candidateKnowledgePercent(e.card))),
    avgJobKnowledgePercent: mean(jobs.map((j) => jobKnowledgePercent(j.card))),
    avgCandidateUserMessages: mean(employees.map((e) => countUserMessages(e.chat))),
    avgEmployerUserMessages: mean(employers.map((e) => employerEngagement(e).avgUserMessages)),
  };
}
