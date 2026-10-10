import type { ChatMessage, JobCard } from "./types";

/** Client workspace for one employer job (card + chat already loaded). */
export type EmployerJobWorkspace = {
  id: string;
  name?: string;
  title?: string;
  field?: string;
  card: JobCard;
  chat: ChatMessage[];
};

export function workspaceSummaries(workspaces: EmployerJobWorkspace[]) {
  return workspaces.map((j) => ({
    id: j.id,
    name: j.name ?? "",
    title: j.title ?? j.card.title,
    field: j.field ?? j.card.field,
  }));
}

/** Instant local switch when slots were hydrated from /api/me. */
export function pickJobWorkspace(
  workspaces: EmployerJobWorkspace[],
  jobId: string,
): EmployerJobWorkspace | null {
  return workspaces.find((j) => j.id === jobId) ?? null;
}

export function upsertJobWorkspace(
  workspaces: EmployerJobWorkspace[],
  jobId: string,
  patch: { card?: JobCard; chat?: ChatMessage[]; name?: string },
): EmployerJobWorkspace[] {
  return workspaces.map((j) => {
    if (j.id !== jobId) return j;
    const card = patch.card ?? j.card;
    const name =
      patch.name !== undefined ? patch.name.trim() || undefined : j.name;
    return {
      ...j,
      name,
      card,
      chat: patch.chat ?? j.chat,
      title: card.title,
      field: card.field,
    };
  });
}

export function parseJobWorkspaces(raw: unknown): EmployerJobWorkspace[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((j): j is Record<string, unknown> => Boolean(j) && typeof j === "object")
    .map((j) => ({
      id: String(j.id ?? ""),
      name: typeof j.name === "string" ? j.name : undefined,
      title: typeof j.title === "string" ? j.title : undefined,
      field: typeof j.field === "string" ? j.field : undefined,
      card: (j.card as JobCard) ?? ({} as JobCard),
      chat: Array.isArray(j.chat) ? (j.chat as ChatMessage[]) : [],
    }))
    .filter((j) => j.id);
}
