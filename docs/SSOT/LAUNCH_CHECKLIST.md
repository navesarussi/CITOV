# Launch checklist — first friends + first recruiter

Status key: **🟢** ready in this PR / on main · **🟡** needs owner action after deploy · **🔴** blocked

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1 | On-platform contact (no phone/email in chat) | 🟢 | Prompts + PII strip + regression (`0.4.25+`) |
| 2 | Mutual identity reveal (candidate consent) | 🟢 | `candidate_consent_at` + CV gate + opportunities UI + E2E API |
| 3 | H3 delete-my-data (all user tables) | 🟢 | Embeddings, labels, sandbox judgments, rate limits, ai_usage, events scrub, cascade user |
| 4 | M1 security headers (CSP, nosniff, frame, referrer) | 🟢 | `next.config.ts` |
| 5 | M2 client events flood limit | 🟢 | Already on main (`client_events` bucket) |
| 6 | M3 patch fieldKey allow-list | 🟢 | Zod schema keys filtered before patch apply |
| 7 | M4 user/CV turn delimiters | 🟢 | `delimitUserTurn` in chat context |
| 8 | M5 admin audit log | 🟢 | `admin_audit_log` + prompts reset/update + employer verify |
| 9 | M6 RLS deny anon (migrations) | 🟡 | Apply `supabase/migrations/004_rls_deny_anon.sql` on Supabase |
| 10 | H2 size caps + DB rate limit | 🟢 | Verify in CI / `request-limits` + `user_rate_limit_windows` |
| 11 | H4 dependency upgrades | 🟡 | Run `npm audit` after merge; bump lockfile if green |
| 12 | Consent checkbox on landing | 🟢 | Terms + privacy links before Google / open enter |
| 13 | Privacy + terms (HE) | 🟢 | Expanded i18n bodies |
| 14 | E2E identity reveal flow | 🟢 | `e2e/identity-reveal.spec.ts` + `/api/e2e/reveal-flow` |
| 15 | Admin prompt reset after deploy | 🟡 | Owner: איפוס לברירת מחדל in admin prompts |
| 16 | `EMPLOYER_APPROVED_IDENTITY_REVEAL` in prod | 🟡 | Set `true` when ready for recruiter CV view |
| 17 | Google OAuth testers / consent screen | 🟡 | See `docs/SSOT/GO_LIVE.md` |
| 18 | Smoke: candidate CV → chat → employer approve → candidate consent | 🟡 | Manual with two Google accounts |

**Pre-noon Israel deploy:** merge this PR → Vercel prod → run rows 9, 11, 15–18.
