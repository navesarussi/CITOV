# Deploy CITOV to Cloudflare Workers (parallel to Vercel)

Vercel remains the primary path (`npm run build` / Git deploy). Cloudflare uses **OpenNext** (`@opennextjs/cloudflare`) and does **not** change Vercel config.

## Prerequisites

- Node 20+
- [Cloudflare account](https://dash.cloudflare.com/) + **Account ID**
- API token with **Workers Scripts Edit** (and **Account Settings Read**): [Create token](https://dash.cloudflare.com/profile/api-tokens) → template *Edit Cloudflare Workers*
- Same secrets as Vercel (see below)

## One-time local setup

```bash
npm ci
# Optional: copy secrets for `wrangler dev` / preview
cp .env.example .dev.vars   # wrangler loads .dev.vars (gitignored)
```

Set in `.dev.vars` (or Cloudflare dashboard → Workers → citov → Settings → Variables):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes (prod) | Supabase pooler URI (`*.pooler.supabase.com:6543`). Uses `pg` + **`nodejs_compat`**. |
| `AUTH_SECRET` | Yes | Same as Vercel |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | If Google login | Add OAuth redirect: `https://<your-workers-host>/api/auth/callback/google` |
| `AUTH_URL` | Yes | Public origin, e.g. `https://citov.your-subdomain.workers.dev` or custom domain |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes (AI features) | |
| `NEXT_PUBLIC_SUPABASE_URL` | If client uses Supabase | |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | If client uses Supabase | |
| `GOOGLE_AUTH_ENABLED` | Optional | |
| `ALLOW_DEMO` / `ALLOW_TEST_LOGIN` | Optional | Match Vercel policy |
| `MATCHING_*` / `MATCH_*` | Optional | Same defaults as Vercel |

`NEXT_PUBLIC_*` vars from `next.config.ts` (app version/build id) are injected at **Next build** time; for CF run `cf:build` with the same env you use on Vercel.

## Commands

```bash
# Build OpenNext worker + static assets (runs `next build` internally)
npm run cf:build

# Local smoke (after build)
npm run cf:preview
# or: npx wrangler dev

# Deploy (uses CLOUDFLARE_API_TOKEN + account from wrangler login or env)
export CLOUDFLARE_API_TOKEN="..."
export CLOUDFLARE_ACCOUNT_ID="..."
npm run cf:deploy
```

Wrangler also accepts:

```bash
npx wrangler deploy --env=""   # uses wrangler.jsonc `name`: citov
```

## Custom domain

Workers & Pages → citov → **Triggers** → Add route / custom domain. Update `AUTH_URL` and Google OAuth redirect URLs to match.

## Postgres on Workers

- App uses **`pg`** (`src/infrastructure/db/pool.ts`) over **TCP** to Supabase Supavisor (`6543`).
- **`nodejs_compat`** is enabled in `wrangler.jsonc` (required for `pg`, `dns`, `fs` in prompts/CV libs).
- **Verify on first deploy:** `GET /api/health/db` should return OK.
- **Optional:** [Hyperdrive](https://developers.cloudflare.com/hyperdrive/) — uncomment binding in `wrangler.jsonc` and point `DATABASE_URL` at the Hyperdrive connection string.

## Known compatibility notes

| Area | Status |
|------|--------|
| `export const runtime = "nodejs"` routes | OK with `nodejs_compat` |
| `next/server` **`after()`** (chat, CV, flexibility) | Relies on OpenNext/Workers async context; smoke-test deferred work after deploy |
| **`readFileSync`** prompts / eval JSON | Bundled at build time if paths resolve; admin-only paths may fail if files missing from bundle — prefer env/DB on Workers |
| **`unpdf` / `mammoth`** | Listed in `serverExternalPackages`; test CV upload on preview |
| **Bundle size** | Workers Free **~3 MiB compressed** script limit — run `wrangler deploy` dry-run / dashboard after build (see PR report) |
| **Next.js 16.2.10** | `@opennextjs/cloudflare@1.19.0` (peer `>=16.2.3`); newer OpenNext requires Next ≥16.3.8 |

## Bundle size (Workers Free)

After `npm run cf:build`, check upload size:

```bash
npx wrangler deploy --dry-run
```

Example (2026-10-10, main @ v0.4.24): **~3829 KiB gzip (~3.74 MiB)** — **above Workers Free ~3 MiB compressed script limit**. Paid Workers or bundle trimming (drop dev/e2e routes from prod, lazy-load `mammoth`/`unpdf`, Hyperdrive-only DB) may be required.

Static assets are served via **Assets** binding (not counted in the script limit the same way).

## Smoke test (local)

```bash
npm run cf:build
npx wrangler dev --port 8787
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/
# Expect 200 on `/` when `.dev.vars` / `.env.local` has minimal auth vars
```

## CI

Do not replace Vercel Git integration. Use CF deploy manually or a separate workflow with `CLOUDFLARE_API_TOKEN` until quota/recovery.

## Files

- `wrangler.jsonc` — Worker entry `.open-next/worker.js`, assets, `nodejs_compat`
- `open-next.config.ts` — OpenNext Cloudflare adapter config
- `public/_headers` — long-cache `_next/static` (Cloudflare Assets)
