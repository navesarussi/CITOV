import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/infrastructure/observability/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 0.1,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  beforeSend(event) {
    return scrubSentryEvent(event);
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
