import { displayJobTitle } from "@/domain/admin-job-display";
import { isDemoUserId } from "@/domain/admin";
import type { MatchStatus, StoreData } from "@/domain/types";
import { scoreCandidateForJob, type MatchEmbeddingIndex } from "@/application/match-scoring";
import { readQueueThreshold } from "@/application/matching-config";

export type AdminMatchFilter = "queued" | "approved" | "rejected" | "below_threshold";

export type AdminMatchRow = {
  matchId: string;
  jobId: string;
  candidateId: string;
  jobOwnerId: string;
  jobTitle: string;
  employerName: string;
  candidateLabel: string;
  score: number;
  scorePercent: number;
  status: MatchStatus | "below_threshold";
  reason: string;
  topReasons: string[];
};

export function syntheticPairMatchId(jobId: string, candidateId: string): string {
  return `pair__${jobId}__${candidateId}`;
}

export function parseSyntheticPairMatchId(matchId: string): { jobId: string; candidateId: string } | null {
  if (!matchId.startsWith("pair__")) return null;
  const rest = matchId.slice(6);
  const sep = rest.indexOf("__");
  if (sep <= 0) return null;
  return { jobId: rest.slice(0, sep), candidateId: rest.slice(sep + 2) };
}

function userName(store: StoreData, userId: string): string {
  return store.users.find((u) => u.id === userId)?.name ?? userId;
}

function candidateLabel(store: StoreData, candidateId: string): string {
  const emp = store.employees.find((e) => e.userId === candidateId);
  const role = emp?.card.desiredRole?.trim() || "מועמד/ת";
  const tail = candidateId.length > 6 ? candidateId.slice(-4) : candidateId;
  return `${role} · #${tail}`;
}

function topReasonsFrom(reason: string): string[] {
  return reason
    .split(/[·•\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function resolveJob(store: StoreData, jobOwnerId: string, jobId: string) {
  const er = store.employers.find((e) => e.userId === jobOwnerId);
  const slot = er?.jobs?.find((j) => j.id === jobId);
  return slot ? { er, slot } : null;
}

function resolveCandidate(store: StoreData, candidateId: string) {
  return store.employees.find((e) => e.userId === candidateId) ?? null;
}

function matchesSearch(row: AdminMatchRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return (
    row.jobTitle.toLowerCase().includes(needle) ||
    row.employerName.toLowerCase().includes(needle) ||
    row.candidateLabel.toLowerCase().includes(needle) ||
    row.jobId.toLowerCase().includes(needle) ||
    row.candidateId.toLowerCase().includes(needle)
  );
}

function sortRows(rows: AdminMatchRow[], sort: "score_desc" | "score_asc"): AdminMatchRow[] {
  const out = [...rows];
  out.sort((a, b) => (sort === "score_asc" ? a.score - b.score : b.score - a.score));
  return out;
}

function rowsFromStoreMatches(
  store: StoreData,
  status: MatchStatus,
  jobId?: string,
  candidateId?: string,
): AdminMatchRow[] {
  return store.matches
    .filter((m) => m.status === status)
    .filter((m) => !jobId || m.jobId === jobId)
    .filter((m) => !candidateId || m.candidateId === candidateId)
    .filter((m) => !isDemoUserId(m.jobOwnerId) && !isDemoUserId(m.candidateId))
    .map((m) => {
      const job = resolveJob(store, m.jobOwnerId, m.jobId);
      return {
        matchId: m.id,
        jobId: m.jobId,
        candidateId: m.candidateId,
        jobOwnerId: m.jobOwnerId,
        jobTitle: job ? displayJobTitle(job.slot) : m.jobId,
        employerName: userName(store, m.jobOwnerId),
        candidateLabel: candidateLabel(store, m.candidateId),
        score: m.score,
        scorePercent: Math.round(m.score * 100),
        status: m.status,
        reason: m.reason,
        topReasons: topReasonsFrom(m.reason),
      };
    });
}

function belowThresholdRows(
  store: StoreData,
  index: MatchEmbeddingIndex | undefined,
  jobId?: string,
  candidateId?: string,
): AdminMatchRow[] {
  const threshold = readQueueThreshold(store.adminSettings);
  const hasQueuedOrDecided = (jid: string, cid: string) =>
    store.matches.some(
      (m) =>
        m.jobId === jid &&
        m.candidateId === cid &&
        (m.status === "queued" || m.status === "approved" || m.status === "rejected"),
    );

  const out: AdminMatchRow[] = [];

  if (jobId) {
    const owners = store.employers.filter((e) => e.jobs?.some((j) => j.id === jobId));
    const owner = owners[0];
    const slot = owner?.jobs?.find((j) => j.id === jobId);
    if (!owner || !slot) return [];
    for (const emp of store.employees) {
      if (isDemoUserId(emp.userId)) continue;
      if (hasQueuedOrDecided(jobId, emp.userId)) continue;
      const scored = scoreCandidateForJob({
        candidate: emp.card,
        job: slot.card,
        candidateId: emp.userId,
        jobId,
        index,
        adminSettings: store.adminSettings,
      });
      if (scored.score >= threshold) continue;
      out.push({
        matchId: syntheticPairMatchId(jobId, emp.userId),
        jobId,
        candidateId: emp.userId,
        jobOwnerId: owner.userId,
        jobTitle: displayJobTitle(slot),
        employerName: userName(store, owner.userId),
        candidateLabel: candidateLabel(store, emp.userId),
        score: scored.score,
        scorePercent: Math.round(scored.score * 100),
        status: "below_threshold",
        reason: scored.reason,
        topReasons: topReasonsFrom(scored.reason),
      });
    }
    return out;
  }

  if (candidateId) {
    const emp = resolveCandidate(store, candidateId);
    if (!emp || isDemoUserId(candidateId)) return [];
    for (const er of store.employers) {
      if (isDemoUserId(er.userId)) continue;
      for (const slot of er.jobs ?? []) {
        if (hasQueuedOrDecided(slot.id, candidateId)) continue;
        const scored = scoreCandidateForJob({
          candidate: emp.card,
          job: slot.card,
          candidateId,
          jobId: slot.id,
          index,
          adminSettings: store.adminSettings,
        });
        if (scored.score >= threshold) continue;
        out.push({
          matchId: syntheticPairMatchId(slot.id, candidateId),
          jobId: slot.id,
          candidateId,
          jobOwnerId: er.userId,
          jobTitle: displayJobTitle(slot),
          employerName: userName(store, er.userId),
          candidateLabel: candidateLabel(store, candidateId),
          score: scored.score,
          scorePercent: Math.round(scored.score * 100),
          status: "below_threshold",
          reason: scored.reason,
          topReasons: topReasonsFrom(scored.reason),
        });
      }
    }
    return out;
  }

  return [];
}

export function listAdminMatches(params: {
  store: StoreData;
  index?: MatchEmbeddingIndex;
  filter: AdminMatchFilter;
  search?: string;
  jobId?: string;
  candidateId?: string;
  page: number;
  pageSize: number;
  sort?: "score_desc" | "score_asc";
}): {
  rows: AdminMatchRow[];
  total: number;
  page: number;
  pageSize: number;
  hint?: string;
} {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(5, params.pageSize));
  const sort = params.sort ?? "score_desc";

  let all: AdminMatchRow[] = [];
  if (params.filter === "below_threshold") {
    if (!params.jobId && !params.candidateId) {
      return {
        rows: [],
        total: 0,
        page,
        pageSize,
        hint: "בחרו משרה או מועמד/ת כדי לחשב זוגות מתחת לסף",
      };
    }
    all = belowThresholdRows(params.store, params.index, params.jobId, params.candidateId);
  } else {
    all = rowsFromStoreMatches(
      params.store,
      params.filter,
      params.jobId,
      params.candidateId,
    );
  }

  if (params.search?.trim()) {
    all = all.filter((r) => matchesSearch(r, params.search!));
  }
  all = sortRows(all, sort);
  const total = all.length;
  const start = (page - 1) * pageSize;
  const rows = all.slice(start, start + pageSize);
  return { rows, total, page, pageSize };
}
