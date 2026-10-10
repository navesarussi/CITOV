# Role-boost rule (hybrid)

When `MATCHING_ROLE_BOOST` is not `false`, hybrid blending applies a floor when:

- calibrated role cosine ≥ 0.35, and
- rule title `textScore` < 0.2

Formula: `blend = min(0.88, max(blend, 0.42 + 0.55 * roleCalibrated))` when must-have overlap ≥ 0.34 (or job has no must-haves).

## Evaluation

Run:

```bash
npm test -- eval/matching/role-boost-eval.test.ts
```

The test compares `bad_queued` on the labeled holdout with boost on vs off. Boost stays enabled by default if holdout `bad_queued` does not increase by more than one pair vs disabled.

Disable in production: `MATCHING_ROLE_BOOST=false`.
