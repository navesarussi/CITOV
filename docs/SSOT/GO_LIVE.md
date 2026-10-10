# Go-live checklist — real users (not demo)

## Already done in code / infra

- [x] Supabase Postgres connected (`DATABASE_URL`)
- [x] Google Auth env vars on Vercel (`AUTH_GOOGLE_*`, `AUTH_SECRET`, `AUTH_URL`)
- [x] Demo mode **off** unless `ALLOW_DEMO=true`
- [x] Anonymous session creation disabled
- [x] API routes gated: actor must own the `userId` via Google session
- [x] Free-text `narrative` field on candidate + job cards
- [x] Chat calls Gemini **only server-side** via `/api/chat` + `GOOGLE_GENERATIVE_AI_API_KEY`
- [x] Production site: https://jobs-ai-snowy.vercel.app
- [x] AI health: `GET /api/health/ai` → `{ geminiConfigured, mode }`
- [x] Test/demo login isolated to **`/demo`** (not on `/` or `/for-employers`)
- [x] Three candidate card views: full (admin), candidate presentation, employer presentation
- [x] Approved jobs resolve the **matched** job card + show contact when filled

## Before first marketing users

**Do these yourself:** `docs/SSOT/HUMAN_ONLY.md` (OAuth, Vercel flags, smoke, invites).

### Ops (human)

1. Confirm Production deploy from `main` is Ready on Vercel
2. **Google OAuth** origins + redirects for `citov.tech` + Vercel app (see below)
3. **OAuth consent** — publish app, or add every tester email while in Testing
4. **Prod flags on Vercel**
   - `ALLOW_DEMO=false` (or unset)
   - Leave `ALLOW_TEST_LOGIN` unset (production code defaults **off**) or set `true` only if you need `/demo`. If Production still has `ALLOW_TEST_LOGIN=true`, remove/set false and redeploy
5. **Reset admin prompts** after this PR deploys so employer agent picks up contact collection from file
6. **Smoke the loop** with two Google accounts: candidate CV → chat → employer chat (+ contact) → approve → candidate sees job **with contact**
7. **Invite** 2 employers + 5–10 candidates using copy in `HUMAN_ONLY.md`

### Product / trust checklist

- [ ] Landing copy + legal pages (`/legal/*`) match the public brand
- [ ] Privacy / terms reviewed for real-user data (CV storage, chat)
- [ ] Admin prompts reset to latest file defaults after deploy if needed
- [ ] Cold-start: seed 1–2 real jobs + 1–2 candidates so first users are not staring at empty queues
- [ ] Support channel: `settings.report` mailto / inbox monitored

## Required: Gemini API key on Vercel (for human chat)

Without this, the UI shows **מצב מקומי** and uses heuristic fallback.

1. Open [Vercel → Project → Settings → Environment Variables](https://vercel.com/dashboard)
2. Add:
   - **Name:** `GOOGLE_GENERATIVE_AI_API_KEY`
   - **Value:** your Gemini API key (from [Google AI Studio](https://aistudio.google.com/apikey))
   - **Environments:** Production + Preview (+ Development if you use `vercel env pull`)
3. **Redeploy** Production (Deployments → … → Redeploy)
4. Verify: open `https://jobs-ai-snowy.vercel.app/api/health/ai` — expect `"geminiConfigured": true`

### CLI alternative (with a Vercel token)

```bash
export VERCEL_TOKEN=vercel_xxx   # https://vercel.com/account/tokens
export GEMINI_KEY='your-key'
npm run set-gemini-env
# then redeploy in the Vercel dashboard
```

## Sandbox labeling (test dataset)

After **#41–#43** are on Production:

1. **Seed** (from a machine with prod `DATABASE_URL`): `npm run seed:test-sandbox`
   - Or in admin: **דוח הרצה** (`/admin/sandbox-report`) → **הרץ seed + הערכה** (full 150×150 eval; may take minutes).
2. **Label:** admin labeling → enable **נתוני בדיקה**; labels use `source=test-run`.
3. **Verify isolation:** real candidate/employer queues must not show `sandbox-*` users or `is_test` matches (see `docs/eval/TEST_SANDBOX.md`).
4. Optional cron: set `CRON_SECRET` and hit `GET /api/cron/recover-degraded` on a schedule after resilience deploy.

## After deploy — prompts

- Default prompts live in `prompts/candidate/system-prompt.md` and `prompts/employer/system-prompt.md`
- Admin portal can override them live; use **איפוס לברירת מחדל** to pick up the latest file prompts
- Check `GET /api/health/ai` and chat badge (Gemini vs מצב מקומי)

## Required from human (Google Cloud OAuth)

Without these, “Sign in with Google” fails in production:

1. Open [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. OAuth 2.0 Client (Web) used for this app
3. **Authorized JavaScript origins**
   - `https://citov.tech`
   - `https://jobs-ai-snowy.vercel.app`
   - `http://localhost:3000` (local)
4. **Authorized redirect URIs**
   - `https://citov.tech/api/auth/callback/google`
   - `https://jobs-ai-snowy.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
5. OAuth consent screen
   - If status is **Testing**: add every real tester email under Test users
   - Or publish the app for broader access

## Security notes

- Never commit API keys to git (`.env*` is gitignored except `.env.example`)
- Rotate any key that was pasted in chat
- Gemini key is read only in server code (`src/infrastructure/ai/intake.ts`) — never sent to the browser
- Public landings must not expose test login; use `/demo` only

## Local demo (dev only)

```bash
ALLOW_TEST_LOGIN=true
# optional seed-demo API bypass:
ALLOW_DEMO=false
```

in `.env.local` — open **`/demo`** for test sign-in. Never set `ALLOW_DEMO=true` on Vercel production for real users.
