import type { ErrorEvent as SentryEvent } from "@sentry/core";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d[\d\s\-().]{7,}\d)/g;

const SENSITIVE_KEY =
  /email|phone|password|token|secret|authorization|cookie|cv|resume|chat|message|content|prompt|body/i;

function redactString(value: string, maxLen = 120): string {
  let s = value.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[phone]");
  if (s.length > maxLen) s = `${s.slice(0, maxLen)}…[truncated]`;
  return s;
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[max-depth]";
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map((v) => scrubValue(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) {
        out[k] = typeof v === "string" ? redactString(v, 80) : "[redacted]";
      } else {
        out[k] = scrubValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
}

/** Strip CV/chat/email/phone from Sentry error events before upload. */
export function scrubSentryEvent(event: SentryEvent): SentryEvent | null {
  if (event.type && event.type !== "error") return event;
  if (event.message) {
    event.message = redactString(event.message, 500);
  }
  if (event.request?.headers) {
    event.request.headers = scrubValue(event.request.headers) as Record<string, string>;
  }
  if (event.request?.data) {
    event.request.data = scrubValue(event.request.data);
  }
  if (event.extra) {
    event.extra = scrubValue(event.extra) as Record<string, unknown>;
  }
  if (event.contexts) {
    event.contexts = scrubValue(event.contexts) as SentryEvent["contexts"];
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: b.message ? redactString(b.message, 300) : b.message,
      data: b.data ? (scrubValue(b.data) as Record<string, unknown>) : b.data,
    }));
  }
  if (event.user) {
    event.user = { id: event.user.id, username: event.user.username };
  }
  return event;
}
