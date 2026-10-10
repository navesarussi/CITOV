import { randomUUID } from "crypto";
import type { AppEventKind, AppEventSeverity, GroupedIssue, IssueStatus } from "@/domain/app-event";
import { eventFingerprint } from "@/domain/app-event";
import { notifyOwnerCriticalIssue } from "@/infrastructure/owner-alert";
import { ensureSchema } from "./schema";
import { getPool } from "./pool";

export type RecordAppEventInput = {
  kind: AppEventKind;
  severity?: AppEventSeverity;
  route?: string | null;
  statusCode?: number | null;
  message: string;
  stack?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  meta?: Record<string, unknown> | null;
  durationMs?: number | null;
};

export async function recordAppEvent(input: RecordAppEventInput): Promise<void> {
  if (shouldUseMemoryEvents()) {
    const row = toRow(input);
    memoryEvents.unshift(row);
    memoryEvents.splice(500);
    if ((input.severity ?? "info") === "critical") {
      void notifyOwnerCriticalIssue({
        fingerprint: row.fingerprint,
        message: input.message,
        route: input.route,
      });
    }
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  const fingerprint = eventFingerprint({
    kind: input.kind,
    route: input.route,
    message: input.message,
  });
  await pool.query(
    `insert into app_events
      (id, kind, severity, route, status_code, message, stack, user_id, user_email, meta, duration_ms, fingerprint, issue_status, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,'open', now())`,
    [
      randomUUID(),
      input.kind,
      input.severity ?? "info",
      input.route ?? null,
      input.statusCode ?? null,
      input.message.slice(0, 4000),
      input.stack?.slice(0, 8000) ?? null,
      input.userId ?? null,
      input.userEmail ?? null,
      input.meta ? JSON.stringify(input.meta) : null,
      input.durationMs ?? null,
      fingerprint,
    ],
  );
  if ((input.severity ?? "info") === "critical") {
    void notifyOwnerCriticalIssue({
      fingerprint,
      message: input.message,
      route: input.route,
    });
  }
}

/** Fire-and-forget — never throw to callers. */
export function recordAppEventSafe(input: RecordAppEventInput): void {
  void recordAppEvent(input).catch((err) => console.error("recordAppEvent failed", err));
}

type Row = {
  id: string;
  kind: AppEventKind;
  severity: AppEventSeverity;
  route: string | null;
  status_code: number | null;
  message: string;
  stack: string | null;
  user_id: string | null;
  user_email: string | null;
  meta: unknown;
  duration_ms: number | null;
  fingerprint: string;
  issue_status: IssueStatus;
  created_at: Date;
};

function shouldUseMemoryEvents(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.DATABASE_URL?.trim();
}

const memoryEvents: Row[] = [];

function toRow(input: RecordAppEventInput): Row {
  return {
    id: randomUUID(),
    kind: input.kind,
    severity: input.severity ?? "info",
    route: input.route ?? null,
    status_code: input.statusCode ?? null,
    message: input.message,
    stack: input.stack ?? null,
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    meta: input.meta ?? null,
    duration_ms: input.durationMs ?? null,
    fingerprint: eventFingerprint({
      kind: input.kind,
      route: input.route,
      message: input.message,
    }),
    issue_status: "open",
    created_at: new Date(),
  };
}

export async function listGroupedIssues(limit = 40): Promise<GroupedIssue[]> {
  if (shouldUseMemoryEvents()) {
    const map = new Map<string, GroupedIssue>();
    for (const r of memoryEvents) {
      const hit = map.get(r.fingerprint);
      if (!hit) {
        map.set(r.fingerprint, {
          fingerprint: r.fingerprint,
          kind: r.kind,
          route: r.route,
          message: r.message,
          severity: r.severity,
          count: 1,
          firstSeen: r.created_at.toISOString(),
          lastSeen: r.created_at.toISOString(),
          issueStatus: r.issue_status,
        });
      } else {
        hit.count += 1;
        hit.lastSeen = r.created_at.toISOString();
        if (r.severity === "critical") hit.severity = "critical";
      }
    }
    return [...map.values()].slice(0, limit);
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{
    fingerprint: string;
    kind: AppEventKind;
    route: string | null;
    message: string;
    severity: AppEventSeverity;
    count: string;
    first_seen: Date;
    last_seen: Date;
    issue_status: IssueStatus;
  }>(
    `select fingerprint, kind, route, max(message) as message,
            max(severity) as severity, count(*)::text as count,
            min(created_at) as first_seen, max(created_at) as last_seen,
            max(issue_status) as issue_status
     from app_events
     group by fingerprint, kind, route
     order by max(created_at) desc
     limit $1`,
    [limit],
  );
  return r.rows.map((row) => ({
    fingerprint: row.fingerprint,
    kind: row.kind,
    route: row.route,
    message: row.message,
    severity: row.severity,
    count: Number(row.count),
    firstSeen: row.first_seen.toISOString(),
    lastSeen: row.last_seen.toISOString(),
    issueStatus: row.issue_status,
  }));
}

export async function setIssueStatus(fingerprint: string, status: IssueStatus): Promise<void> {
  if (shouldUseMemoryEvents()) {
    for (const e of memoryEvents) {
      if (e.fingerprint === fingerprint) e.issue_status = status;
    }
    return;
  }
  await ensureSchema();
  const pool = await getPool();
  await pool.query(`update app_events set issue_status = $2 where fingerprint = $1`, [
    fingerprint,
    status,
  ]);
}

export async function routeLatencyStats(sinceHours = 24): Promise<
  { route: string; p50: number; p95: number; count: number }[]
> {
  if (shouldUseMemoryEvents()) {
    return [];
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{ route: string; p50: number; p95: number; count: string }>(
    `select route,
            percentile_cont(0.5) within group (order by duration_ms)::float as p50,
            percentile_cont(0.95) within group (order by duration_ms)::float as p95,
            count(*)::text as count
     from app_events
     where kind = 'slow_request'
       and route is not null
       and created_at >= now() - ($1::text || ' hours')::interval
     group by route
     order by p95 desc nulls last
     limit 30`,
    [sinceHours],
  );
  return r.rows.map((row) => ({
    route: row.route,
    p50: Math.round(row.p50 ?? 0),
    p95: Math.round(row.p95 ?? 0),
    count: Number(row.count),
  }));
}

export async function latestE2eRun(): Promise<Record<string, unknown> | null> {
  if (shouldUseMemoryEvents()) {
    const hit = memoryEvents.find((e) => e.kind === "e2e_run");
    return hit?.meta as Record<string, unknown> | null;
  }
  await ensureSchema();
  const pool = await getPool();
  const r = await pool.query<{ meta: unknown; created_at: Date }>(
    `select meta, created_at from app_events
     where kind = 'e2e_run'
     order by created_at desc limit 1`,
  );
  const row = r.rows[0];
  if (!row) return null;
  return {
    ...(row.meta as Record<string, unknown>),
    recordedAt: row.created_at.toISOString(),
  };
}
