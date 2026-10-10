import { normalizeEmployerRecord } from "@/domain/employer-jobs";
import type { ChatMessage, StoreData } from "@/domain/types";

export type ChatConversationContext = "employee" | "employer";

export type PersistedChatRow = {
  id: string;
  ownerUserId: string;
  conversationContext: ChatConversationContext;
  jobId: string | null;
  role: ChatMessage["role"];
  content: string;
  createdAt: string;
};

export type RawChatRow = {
  id: string;
  owner_user_id: string;
  conversation_context?: string | null;
  job_id?: string | null;
  role: string;
  content: string;
  created_at: Date | string;
};

function toChatMessage(row: { id: string; role: string; content: string; created_at: Date | string }): ChatMessage {
  return {
    id: row.id,
    role: row.role as ChatMessage["role"],
    content: row.content,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function chatRowsFromStore(store: StoreData): PersistedChatRow[] {
  const rows: PersistedChatRow[] = [];
  for (const emp of store.employees) {
    for (const msg of emp.chat) {
      rows.push({
        id: msg.id,
        ownerUserId: emp.userId,
        conversationContext: "employee",
        jobId: null,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
      });
    }
  }
  for (const raw of store.employers) {
    const employer = normalizeEmployerRecord(raw);
    for (const job of employer.jobs) {
      for (const msg of job.chat) {
        rows.push({
          id: msg.id,
          ownerUserId: employer.userId,
          conversationContext: "employer",
          jobId: job.id,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt,
        });
      }
    }
  }
  return rows;
}

export function applyChatRowsToStore(store: StoreData, rows: RawChatRow[]): StoreData {
  const employeeChats = new Map<string, ChatMessage[]>();
  const employerJobChats = new Map<string, ChatMessage[]>();

  for (const row of rows) {
    const context = row.conversation_context === "employer" ? "employer" : "employee";
    const message = toChatMessage(row);
    if (context === "employee") {
      const list = employeeChats.get(row.owner_user_id) ?? [];
      list.push(message);
      employeeChats.set(row.owner_user_id, list);
      continue;
    }
    const jobId = row.job_id?.trim() || row.owner_user_id;
    const key = `${row.owner_user_id}:${jobId}`;
    const list = employerJobChats.get(key) ?? [];
    list.push(message);
    employerJobChats.set(key, list);
  }

  return {
    ...store,
    employees: store.employees.map((emp) => ({
      ...emp,
      chat: employeeChats.get(emp.userId) ?? [],
    })),
    employers: store.employers.map((raw) => {
      const normalized = normalizeEmployerRecord(raw);
      const jobs = normalized.jobs.map((job) => ({
        ...job,
        chat: employerJobChats.get(`${normalized.userId}:${job.id}`) ?? [],
      }));
      return normalizeEmployerRecord({
        userId: normalized.userId,
        card: normalized.card,
        chat: employerJobChats.get(`${normalized.userId}:${normalized.activeJobId}`) ?? [],
        jobs,
        activeJobId: normalized.activeJobId,
      });
    }),
  };
}
