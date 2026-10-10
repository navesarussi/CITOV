import { createHash } from "node:crypto";
import type { ErrorEvent } from "@sentry/core";
import { scrubSentryEvent } from "./sentry-scrub";

export function isSentryServerEnabled(): boolean {
  if (process.env.CF_WORKERS_BUILD === "1") return false;
  return Boolean(process.env.SENTRY_DSN?.trim());
}

export function hashUserIdForTelemetry(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

export async function captureServerException(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    userId?: string;
    role?: string;
  },
): Promise<void> {
  if (!isSentryServerEnabled()) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    if (context?.userId) {
      Sentry.setUser({ id: context.userId });
    }
    if (context?.role) {
      Sentry.setTag("role", context.role);
    }
    Sentry.captureException(error, {
      tags: context?.tags,
      extra: context?.extra,
    });
  } catch {
    // observability must never break the request path
  }
}

export function buildSentryInitOptions() {
  const release = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || undefined;
  return {
    dsn: process.env.SENTRY_DSN,
    enabled: isSentryServerEnabled(),
    tracesSampleRate: 0.1,
    release,
    beforeSend(event: ErrorEvent) {
      return scrubSentryEvent(event);
    },
  };
}
