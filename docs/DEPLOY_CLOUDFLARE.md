# Deploy CITOV to Cloudflare Workers (parallel to Vercel)

Vercel remains the primary path. Cloudflare uses OpenNext when the `cursor/cloudflare-deploy` branch (or equivalent) is merged. This doc lists **shared secrets** for Workers preview/prod.

## Environment variables (Workers + Vercel parity)

Set the same values in Cloudflare Workers → Settings → Variables (or `.dev.vars` locally) as on Vercel unless noted.

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes (prod) | Supabase pooler URI |
| `AUTH_SECRET` | Yes | Same as Vercel |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | If Google login | Update OAuth redirect to Workers host |
| `AUTH_URL` | Yes | Public Workers origin |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes (AI) | |
| `NEXT_PUBLIC_SUPABASE_URL` | If client uses Supabase | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | If client uses Supabase | |
| `GOOGLE_AUTH_ENABLED` | Optional | |
| `ALLOW_DEMO` / `ALLOW_TEST_LOGIN` | Optional | |
| `MATCHING_*` / `MATCH_*` | Optional | |
| **Sentry** | | |
| `SENTRY_DSN` | Optional | Server error reporting (skipped on `CF_WORKERS_BUILD=1`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Not used on static assets-only paths |
| `SENTRY_ORG` | Build-only | Source maps (Vercel CI) |
| `SENTRY_PROJECT` | Build-only | |
| `SENTRY_AUTH_TOKEN` | Build-only | |
| **Langfuse** | | |
| `LANGFUSE_PUBLIC_KEY` | Optional | Gemini tracing (skipped on CF worker build) |
| `LANGFUSE_SECRET_KEY` | Optional | |
| `LANGFUSE_BASEURL` / `LANGFUSE_BASE_URL` | Optional | Default `https://cloud.langfuse.com` |

See [OBSERVABILITY.md](./OBSERVABILITY.md) for tracing details.

## Commands (when CF path is enabled)

```bash
npm run cf:build
npx wrangler deploy --dry-run   # check gzip script size
npm run cf:deploy
```

Keep Workers gzip under the Free **~3 MiB** limit; observability SDKs should remain disabled on the CF build via `CF_WORKERS_BUILD=1`.
