# dejuanellsworth.github.io

Public repo, served by GitHub Pages from `main`. Two independent things live here:
- Repo root: the personal site and old practice files. Leave them alone unless asked.
- `ellsworth-thanksgiving-2026/`: the family Thanksgiving app (active until Nov 26, 2026).

This repo is PUBLIC. Never commit: the family code, the event address, family names or data, exported
rows, webhook URLs, service keys. Only the Supabase publishable key belongs in the frontend.

## Thanksgiving app: architecture
- Static page: `index.html` + `assets/family-features.{js,css}`. Vanilla HTML/CSS/JS, no build step.
- Backend: one hosted Supabase project (Postgres + anonymous auth + private Storage). The browser talks
  to it with the publishable key; RLS and `ellsworth_private` functions do the access control.
- Identity: one anonymous account per browser, joined with the family code. iOS deletes site storage
  after 7 days without a visit → the member gets a new account (README "Lost identity after 7 days").
- Alerts: database cron → Discord (activity summary and API health). Details: `DISCORD.md`.
- Deploy: merge to `main` → Pages publishes in about a minute. There is no staging site.

## Rules for changes
- Frontend asset changed → update its `?v=` value in `index.html` (README "Reloading after a release").
- Database change → use the `/db-change` skill (`.claude/skills/db-change`). Never rerun
  `supabase-setup.sql` or an applied migration. Never disable RLS to fix an error.
- Order of a release: migration applied and verified first, then the frontend PR.
- Tests: `cd ellsworth-thanksgiving-2026/tests && npm ci && npm test` (local Postgres + Chromium, synthetic
  data). Results and open checks: `tests/QA.md`. The local database is NOT hosted Supabase: a migration
  can pass locally and fail in production (PR #32 → fix PR #33).
- Git: branch `<type>/thanksgiving-<desc>`, Conventional Commits, PR, squash or merge by the owner.

## Runbooks (in README.md)
- Member lost their RSVP after a phone change: "Lost identity after 7 days" (`identity_overview()` →
  `reassign_member(old, new, note)`; undo with `undo_member_reassignment(id)`).
- Family code "looks broken" / 504s: check Supabase API health first (outage 2026-11-04 to 11-08 was a
  hung API pool; fixed by a project restart).

## After the event
- Export a private backup (not into this repo), then decide: pause the Supabase project or keep it.
