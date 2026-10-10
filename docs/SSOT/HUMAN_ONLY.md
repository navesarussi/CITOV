# What only you (human) can do — first users

PR #22 (marketing readiness) is **already merged** to `main`.  
Do the steps below — nothing else blocks inviting first employers + candidates.

## 1) Confirm Production deploy (1 minute)

1. Open Vercel → Deployments  
2. Confirm latest Production deploy from `main` is **Ready**  
3. Open https://citov.tech — should load

## 2) Google OAuth — so real people can sign in (5–10 minutes)

Open: https://console.cloud.google.com/apis/credentials

### A. OAuth client (Web)

**Authorized JavaScript origins**
- `https://citov.tech`
- `https://jobs-ai-snowy.vercel.app`
- `http://localhost:3000` (local only)

**Authorized redirect URIs**
- `https://citov.tech/api/auth/callback/google`
- `https://jobs-ai-snowy.vercel.app/api/auth/callback/google`
- `http://localhost:3000/api/auth/callback/google`

### B. OAuth consent screen

- If status is **Testing**: add every first-user Gmail under **Test users**  
  **or**
- Click **Publish app** for open access

Without this, Google sign-in fails for anyone not on the test list.

## 3) Vercel Production flags (2 minutes)

Open: Vercel → Project → Settings → Environment Variables → **Production**

| Variable | Value | Why |
|---|---|---|
| `ALLOW_DEMO` | `false` or unset | No seed-demo API bypass |
| `ALLOW_TEST_LOGIN` | **unset** or `false` | After latest code: production defaults **off**. If Vercel still has `true`, change/remove it and redeploy |
| Gemini + Google Auth | already set ✅ | Verified live earlier |

Then **Redeploy** Production if you changed any env var.

Optional internal demo only: set `ALLOW_TEST_LOGIN=true` (enables `/demo` only, not public landings).

## 4) Reset admin prompts (1 minute) — after prompt bundle lands

1. Sign in as admin → https://citov.tech/admin  
2. Click **איפוס לברירת מחדל** so employer/candidate agents pick up on-platform contact policy from file prompts

## 5) Smoke the full loop yourself (10 minutes)

Use **two different Google accounts** on https://citov.tech

1. **Employer** → https://citov.tech/for-employers → Google → chat: describe one real job (agent must **not** ask for phone/email)  
2. **Candidate** → https://citov.tech → Google → upload CV → short chat  
3. Employer → Candidates tab → approve  
4. Candidate → jobs tab → sees matched job; contact stays **on-platform** until mutual approval

If any step fails, note exactly where (login / chat / empty queue / no contact) before inviting others.

## 6) Invite first users (same day)

Start small: **2 employers + 5–10 candidates** matched to those jobs.

### WhatsApp / SMS — employer

```
היי, אני משיק את CITOV — שידוך עובדים דרך שיחה (בלי חיפוש).
אשמח שתנסו 10 דקות עם משרה אחת אמיתית:

https://citov.tech/for-employers

1) התחברות עם Google
2) תיאור המשרה בשיחה
3) חשוב: שם + טלפון ליצירת קשר (כדי שמועמד מאושר יוכל להתקשר)

אני מלווה אישית — תכתבו לי אם משהו נתקע.
```

### WhatsApp / SMS — candidate

```
היי, אשמח שתנסו את CITOV — מציאת עבודה דרך שיחה קצרה (בלי לחפש משרות).

https://citov.tech

1) Google
2) העלאת קו״ח
3) כמה הודעות עם הסוכן

אם מעסיק יאשר אתכם — תראו את המשרה + טלפון ליצירת קשר.
תגידו לי אם משהו לא ברור.
```

## 7) After first invites — your only ongoing job

- Answer stuck users the same day  
- Do not collect phone/email in chat — contact is on-platform after approval  
- Tell the agent what broke (screenshots / “failed at step X”) — code fixes continue in parallel  

---

## Already done for you (no action)

- PR #22 merged (demo on `/demo`, three card views, contact handoff after approve)  
- Gemini configured in production  
- Google Auth env present on Vercel  
- Site up: https://citov.tech  
- Employer/candidate prompts enforce on-platform contact only (reset admin prompts after deploy)  
- Production defaults: test login off unless explicitly `ALLOW_TEST_LOGIN=true`  
