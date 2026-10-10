# Deploy CITOV to Cloudflare Workers (parallel to Vercel)

Vercel remains the primary path (`npm run build` / Git deploy). Cloudflare uses **OpenNext** (`@opennextjs/cloudflare`) and does **not** change Vercel config unless `CF_WORKERS_BUILD=1` (set only by `cf:*` scripts).

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
# Build OpenNext worker + static assets (Next standalone + bundle diet)
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
export CLOUDFLARE_API_TOKEN="..."   # Workers Scripts Edit
export CLOUDFLARE_ACCOUNT_ID="..."  # dash.cloudflare.com → right sidebar
npm run cf:deploy
# or:
npx wrangler deploy
```

Login alternative: `npx wrangler login` (stores OAuth; token not required on that machine).

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
| **`readFileSync`** prompts / eval JSON | Prompts still read at runtime; eval fixtures stripped from CF bundle (see below) |
| **`unpdf` / `mammoth`** | **Stubbed on CF** — PDF/DOCX upload returns empty/unsupported; use Vercel for full CV parsing |
| **Admin demo seed** | CF build uses empty eval dataset stub — `seed-demo` on Workers seeds no eval cards unless you deploy via Vercel |
| **Bundle size** | See below — tuned for Workers Free **~3 MiB gzip** script limit |
| **Next.js 16.2.10** | `@opennextjs/cloudflare@1.19.0` (peer `>=16.2.3`); newer OpenNext requires Next ≥16.3.8 |

## Bundle size (Workers Free)

After `npm run cf:build`, check upload size:

```bash
npx wrangler deploy --dry-run
# Optional: explode bundle for analysis
npx wrangler deploy --dry-run --outdir /tmp/cf-bundle-out
# OpenNext esbuild metafile (after build):
#   .open-next/server-functions/default/handler.mjs.meta.json
```

**Baseline (pre-diet):** ~**3829 KiB gzip** (~3.74 MiB) — over Free tier.

**Current (CF bundle diet):** ~**2913 KiB gzip** (~2.84 MiB) — **under the 3 MiB Free limit** (target ≤2.8 MiB is ~46 KiB tighter; see levers below if you need more headroom).

### What the CF diet removes or stubs

| Cut | Mechanism |
|-----|-----------|
| **@vercel/og + resvg/yoga WASM** (~900+ KiB gzip) | `scripts/cf-patch-turbopack-runtime.mjs` stubs Turbopack `@vercel/og` imports; `next.config` aliases og modules |
| **`mammoth` / `unpdf` + deps** (~200+ KiB gzip) | Resolve aliases → `src/infrastructure/cf-build-stubs/*` |
| **Eval seed cards + 2 MiB embedding fixture** | `@/application/eval-*` boundary modules aliased to stubs when `CF_WORKERS_BUILD=1` |
| **Trace noise** | `outputFileTracingExcludes` for `eval/fixtures`, `scripts/`, `e2e/`, `docs/` |
| **Image optimizer** | `images.unoptimized: true` on CF build only |

Vercel `npm run build` does **not** set `CF_WORKERS_BUILD` and keeps full eval, CV parsers, and OG stack.

### `cf:build` pipeline

1. `CF_WORKERS_BUILD=1 npm run build` (standalone output)
2. `node scripts/cf-patch-turbopack-runtime.mjs`
3. `opennextjs-cloudflare build --skipNextBuild`

Static assets are served via **Assets** binding (not counted in the script gzip limit the same way).

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
- `next.config.ts` — CF-only aliases when `CF_WORKERS_BUILD=1`
- `src/infrastructure/cf-build-stubs/` — Worker bundle stubs
- `scripts/cf-patch-turbopack-runtime.mjs` — OG/WASM strip
- `public/_headers` — long-cache `_next/static` (Cloudflare Assets)
