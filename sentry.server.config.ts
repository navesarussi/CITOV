import * as Sentry from "@sentry/nextjs";
import { buildSentryInitOptions } from "@/infrastructure/observability/sentry-server";

Sentry.init(buildSentryInitOptions());
