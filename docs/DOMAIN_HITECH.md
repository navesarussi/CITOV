# Domain-aware cards (hi-tech profile)

Additive optional fields and matching behavior — hospitality demo flows unchanged.

## Skills taxonomy

`src/domain/skills-taxonomy.ts` — HE/EN aliases (e.g. `JS`, `ג'אווה סקריפט` → `javascript`), skill→family (e.g. `react` → `frontend`). Wired into `matchCanonical.skills` and rule overlap via `skillsOverlap()`.

## Work domain

`src/domain/work-domain.ts` — detects `hospitality` | `technology` | `service` | `general`; domain field priorities for chat intake; built-in domain questions (hi-tech: seniority, stack, remote, GitHub, sub-domain, clearance); per-domain **rule component weights**, **hybrid 82/18** (technology), and **embedding segment weights** (higher skills weight for hi-tech).

## Hard filters

`src/domain/match-hard-filters.ts` — optional salary band hard filter (`job.salaryBandHardFilter` or `extras.salaryHardFilter`); reference NIS bands by role+seniority when job salary missing; optional clearance gate via `securityClearanceRequired`.

## Eval

Extra hi-tech pairs in `eval/matching/seed-*` (`j26`, `c51`, `c52`) and labels. Run `npm run eval:matching` for before/after tables.
