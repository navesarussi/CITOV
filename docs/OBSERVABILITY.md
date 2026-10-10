# Observability (Sentry + Langfuse)

Production uses **Sentry** for errors/performance and **Langfuse** for Gemini (Vercel AI SDK) traces. Both are **no-op** when env keys are missing.

## Environment variables

| Variable | Where | Purpose |
|----------|--------|---------|
| `SENTRY_DSN` | Server | Sentry ingest (Node/edge server) |
| `NEXT_PUBLIC_SENTRY_DSN` | Client | Browser errors |
| `SENTRY_ORG` | Build | Source map upload org (`kc-z0`) |
| `SENTRY_PROJECT` | Build | Source map upload project (`citov`) |
| `SENTRY_AUTH_TOKEN` | Build (CI/Vercel) | Upload source maps; **omit locally** — build still succeeds |
| `LANGFUSE_PUBLIC_KEY` | Server | Langfuse OTEL export |
| `LANGFUSE_SECRET_KEY` | Server | Langfuse OTEL export |
| `LANGFUSE_BASEURL` or `LANGFUSE_BASE_URL` | Server | Default `https://cloud.langfuse.com` |

Release tag: `NEXT_PUBLIC_APP_VERSION` (package version).

## What is traced in Langfuse

Every Gemini call via the AI SDK uses `experimental_telemetry` when Langfuse keys are set:

| `callType` | Feature |
|------------|---------|
| `chat_reply_employee_stream` / `chat_reply_employer_stream` | Streaming chat reply |
| `chat_patch_employee` / `chat_patch_employer` | Parallel structured patch extraction |
| `chat_intake_employee` / `chat_intake_employer` | Legacy combined intake |
| `cv_welcome_reply` | Post-CV welcome message |
| `cv_extraction_pass_a` / `cv_extraction_pass_b` | CV facts + inference passes |
| `job_import_extraction` | Job description import |
| `embedding` | `embedMany` batch |
| `llm_judge_a` / `llm_judge_b` | Sandbox LLM judges |
| `match_reason_enrich` | Optional match reason polish |
| `translate_fields` | Card display translation |

Metadata on spans: `callType`, `model`, `promptBundleVersion` (when known), hashed `userId`, `sessionId`, redacted `inputSummary` (no raw CV/chat). Token usage is captured by the AI SDK OTEL instrumentation; cost can be derived in Langfuse from tokens + our pricing table.

**PII:** CV text and chat bodies are **not** sent in telemetry metadata; Sentry events are scrubbed in `beforeSend` (`src/infrastructure/observability/sentry-scrub.ts`).

**Flush:** API routes wrapped with `withApiLogging` call `after()` → `langfuseSpanProcessor.forceFlush()` so serverless does not drop spans.

## What Sentry captures

- Unhandled API errors via `fail()` and `withApiLogging`
- Gemini hard failures (`gemini-client`) and heuristic fallbacks (intake, CV, job import, chat stream)
- React root errors via `src/app/global-error.tsx`
- Performance: `tracesSampleRate: 0.1`
- User: **internal id only** (+ `role` tag when set); `sendDefaultPii: false`

## How to view

- **Admin → Monitoring** — links to Sentry project and Langfuse (when env is configured).
- **Sentry:** `https://<SENTRY_ORG>.sentry.io/projects/<SENTRY_PROJECT>/`
- **Langfuse:** project traces at your `LANGFUSE_BASEURL` dashboard (filter by `callType` in metadata).

## Cloudflare Workers

Observability init is skipped when `CF_WORKERS_BUILD=1`. Sentry/Langfuse use dynamic import and are not registered on the CF worker path; re-measure `wrangler deploy --dry-run` after merging CF bundle diet + this PR (expect little change if CF build flag is unchanged).
