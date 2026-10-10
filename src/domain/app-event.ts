export type AppEventKind =
  | "api_error"
  | "client_error"
  | "user_feedback"
  | "ai_failure"
  | "ai_retry"
  | "ai_budget"
  | "slow_request"
  | "e2e_run"
  | "match_rebuild"
  | "sandbox_run_report";

export type AppEventSeverity = "info" | "warn" | "critical";

export type IssueStatus = "open" | "resolved";

export type AppEventRecord = {
  id: string;
  kind: AppEventKind;
  severity: AppEventSeverity;
  route: string | null;
  statusCode: number | null;
  message: string;
  stack: string | null;
  userId: string | null;
  userEmail: string | null;
  meta: Record<string, unknown> | null;
  durationMs: number | null;
  fingerprint: string;
  issueStatus: IssueStatus;
  createdAt: string;
};

export type GroupedIssue = {
  fingerprint: string;
  kind: AppEventKind;
  route: string | null;
  message: string;
  severity: AppEventSeverity;
  count: number;
  firstSeen: string;
  lastSeen: string;
  issueStatus: IssueStatus;
};

export function eventFingerprint(parts: {
  kind: AppEventKind;
  route?: string | null;
  message: string;
}): string {
  const base = `${parts.kind}|${parts.route ?? ""}|${parts.message.slice(0, 240)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return `fp_${h.toString(16)}`;
}
