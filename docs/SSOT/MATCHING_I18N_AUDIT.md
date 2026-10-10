# Matching i18n audit (HE ↔ EN)

## Rule vs semantic vs free text

| Field group | Rule overlap | Semantic role | Semantic skills | Semantic profile | Canonical EN (`match-canonical` / `skills-taxonomy`) |
|-------------|--------------|---------------|-----------------|------------------|------------------------------------------------------|
| desiredRole / title | ✓ | ✓ | | | `ROLE_ALIASES` |
| field / subField | ✓ | ✓ | | | `FIELD_ALIASES` |
| location | ✓ | | | | `LOCATION_ALIASES` |
| skills / mustHaves / techStack | ✓ | | ✓ | | `SKILL_ALIASES` + families |
| languages / requiredLanguages | ✓ | | | | `LANGUAGE_ALIASES` |
| seniority / seniorityLevel / experienceLevel | | ✓ | | | `SENIORITY_ALIASES` |
| personality / workStyle ↔ personalityFit / teamCulture | | | | ✓ | **No** — profile embeddings only (rule component 0) |
| summary / narrative / companyDescription | | | | ✓ | **No** — embeddings only |
| salary* | ✓ | | | | **No** — `salary-normalize` ILS/month overlap |
| education | | | | ✓ (via profile text) | `canonicalizeEducationToken` (reports; not in rule yet) |

Production rule path uses `enrichCandidateForRuleMatch` / `enrichJobForRuleMatch` before `scoreMatch`. Embeddings use `candidateForMatching` / `jobForMatching` for **role** and **skills** segments; **profile** segment keeps display-language free text.

## CI guard

- `eval/matching/cross-lang-consistency.test.ts` — 20 pairs × (`en` | `he` | `mixed`), \|Δ\| ≤ 0.05 for rule / semantic / hybrid bases, identical queue bit.
- `eval/matching/cross-lang-holdout.test.ts` — 15 frozen pairs (no alias tuning); pass rate logged only.
- `npm run ci:prompt-regression` gates on training set pass rate &lt; 100%; holdout is report-only.

## Prod coverage

```bash
# Read-only report (requires DATABASE_URL)
npx tsx scripts/report-match-canonical-coverage.ts

# Apply backfill + report after
npx tsx scripts/report-match-canonical-coverage.ts --apply
```

Critical-field coverage = cards with non-empty display values also have inferable `matchCanonical` entries for role, field, location, skills/mustHaves, languages.
