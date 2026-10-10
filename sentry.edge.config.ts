import * as Sentry from "@sentry/nextjs";
import { buildSentryInitOptions } from "@/infrastructure/observability/sentry-server";

Sentry.init({
  ...buildSentryInitOptions(),
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
});
