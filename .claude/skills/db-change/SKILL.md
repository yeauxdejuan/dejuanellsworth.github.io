---
name: db-change
description: Safe flow for any database change on the Thanksgiving app's hosted Supabase project - schema, RLS policy, function, trigger, cron job or grant. Inspect first, write a migration file, test locally, rehearse on the real project inside a transaction that rolls back, apply once after the owner says go, verify read-only, update the README. Use when the owner types /db-change, or asks to add or change a table, column, policy, function or migration for the Thanksgiving app, or before any Supabase apply_migration call in this repo. Not for read-only questions about the data and not for frontend-only changes.
---

# /db-change: production database, family data, no staging

Why: there is one hosted Supabase project and it is production. The local test database is not the
same as hosted Supabase: `20261109190000_self_claim.sql` passed locally and failed in production (hosted
Supabase does not let the `postgres` role set `session_replication_role`); PR #33 fixed it. This flow
catches that class of bug before the family does.

General Supabase and Postgres guidance: the `supabase` and `supabase-postgres-best-practices` skills.
This skill adds only the rules of this project.

## Steps (stop where marked; the owner says go)
1. **Inspect (read-only).** List the tables and policies the change touches, list applied migrations
   (compare with `ellsworth-thanksgiving-2026/migrations/`), read the security advisors and recent API
   and Postgres logs. Say what exists today.
2. **Explain the plan.** What changes, which rows and roles it touches, what a member would notice, how
   to undo it. One concrete analogy for the tricky part. **Stop: owner approves the design.**
3. **Write the migration file** `migrations/<UTC yyyymmddhhmmss>_<name>.sql`:
   - Additive and idempotent where possible. One transaction (`begin; … commit;`), short `lock_timeout`.
   - New function: fixed empty `search_path`; private logic in `ellsworth_private`, never exposed.
   - New table: RLS on, explicit grants, member check through the existing membership function.
   - No family data, names or secrets in the file. The repo is public.
4. **Test locally.** Add cases to `tests/database.mjs`, then `npm run test:db` in `tests/`.
5. **Rehearse on the real project, rolled back.** Run the migration body with `execute_sql` wrapped in
   `begin; … rollback;` plus a few assertions. This proves that hosted roles and extensions accept it.
   Things that differ from local: role privileges, `session_replication_role`, `pg_cron`, `pg_net`,
   Storage and Auth schemas. Report the result.
6. **Stop: owner says "apply".** Then `apply_migration` once, with the same name as the file.
7. **Verify (read-only).** The object exists, grants and RLS are right, advisors show nothing new, the
   API answers. For a behavior change, run one real call path inside `begin; … rollback;`.
8. **Record.** README: "Installed <date>, do not replay". `tests/QA.md`: what was checked and what was
   not. Then the PR. Frontend that depends on the change merges only after step 7.

## Rules
- Never rerun `supabase-setup.sql` or an applied migration. Never disable RLS. Never make the photo
  bucket public.
- Fix forward. Do not drop tables or columns that hold family data as a "rollback".
- Do not copy production rows into the repo, tests, logs or chat. Counts and IDs only.
- Secrets (webhook URL, service key) live only in Supabase or GitHub secrets. Report a location, never
  a value.
- A change during the event week (Nov 23-27): say so and ask twice.
