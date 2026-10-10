import type { JobSlot, MatchStatus, StoreData } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeOpaqueId(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (UUID_RE.test(v)) return true;
  if (v === v.toLowerCase() && v.includes("-") && v.length > 20) return true;
  return false;
}

export function displayJobTitle(job: JobSlot, fallback = "משרה ללא כותרת"): string {
  const title = job.card.title?.trim();
  if (title) return title;
  const name = job.name?.trim();
  if (name && !looksLikeOpaqueId(name) && name !== job.id) return name;
  return fallback;
}

export function jobMatchCounts(
  store: StoreData,
  employerId: string,
  jobId: string,
): Record<MatchStatus, number> {
  const out: Record<MatchStatus, number> = {
    queued: 0,
    approved: 0,
    rejected: 0,
  };
  for (const m of store.matches) {
    if (m.jobId !== jobId) continue;
    if (m.jobOwnerId !== employerId) continue;
    out[m.status] += 1;
  }
  return out;
}
