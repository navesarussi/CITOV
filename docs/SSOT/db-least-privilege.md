# Postgres least-privilege plan (app role)

**Status:** documentation for owner-coordinated rotation — not applied automatically by the agent.

## Goal

Separate the runtime app user from schema-migration / admin DDL so a compromised app cannot drop tables or read unrelated tenants.

## Recommended roles

| Role | Purpose |
|------|---------|
| `citov_migrator` | CI / manual migrations only (`CREATE`, `ALTER`, extensions). Not in Vercel env. |
| `citov_app` | Production `DATABASE_URL` — `SELECT`/`INSERT`/`UPDATE`/`DELETE` on app tables only; no `TRUNCATE` on `app_users`; no `DROP`. |

## Grants (sketch)

After migrations, as superuser:

```sql
create role citov_app login password '…';
grant connect on database postgres to citov_app;
grant usage on schema public to citov_app;
grant select, insert, update, delete on all tables in schema public to citov_app;
grant usage, select on all sequences in schema public to citov_app;
alter default privileges in schema public grant select, insert, update, delete on tables to citov_app;
revoke all on schema public from public;
```

Adjust for Supabase: use dashboard “restricted” pooler user; disable direct `postgres` superuser in Vercel.

## Rotation

1. Create `citov_app_v2` with same grants.
2. Update Vercel `DATABASE_URL` to v2; redeploy; smoke `/api/health/db?detail=1` (admin).
3. Revoke v1 after 24h.

## Related hardening (already in app)

- Full `writeNormalizedStore` blocked unless `ALLOW_FULL_STORE_WRITE=1` (maintenance scripts only).
- Deletes of `app_users` rows blocked on full-store persist.
