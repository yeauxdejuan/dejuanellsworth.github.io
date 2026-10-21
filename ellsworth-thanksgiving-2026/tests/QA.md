# V2 validation record

Validated October 21, 2026. Production migration remains **unapplied**. No production data writes, merge or deployment were performed.

| Check | Result | Scope |
| --- | --- | --- |
| Local database suite | 44 checks passed | Real PostgreSQL 17.10; actual baseline and incremental SQL; synthetic auth/storage interfaces and records |
| Browser integration suite | 43 checks passed | Headless Chromium 154.0.8037.57 on Linux; mocked Supabase, Auth, Storage and media |
| Responsive overflow | Passed | 375, 430, 768, 1024, 1440px; shared menu with long names/notes |
| JavaScript syntax | Passed | Application inline script and both test runners |
| Whitespace/diff check | Passed | `git diff --check` |
| Repository scope | Passed | Changes confined to `ellsworth-thanksgiving-2026/`; personal homepage unchanged |
| Existing production schema audit | Read-only | Dish column metadata, grants, RLS policies and original assignment/membership functions inspected |
| Supabase CDN dependency | HTTP 200 | Pinned browser client version 2.57.4 |
| Property sources | Five identifiers verified | Original listing links match all five existing source IDs; fifth thumbnail surfaced; additional images unavailable |
| TikTok API research | Documented API used | `/player/v1`, autoplay/loop disabled, trusted message origin + source, ended state 0; manual fallback explicitly labeled |

The database checks exercise backfill without changing legacy rows, named ownerless claims, account-owned claims without a display name, first/second/third claims, fourth/duplicate rejection, edit/remove ownership, release/reclaim, custom dishes, invalid event/member/action/input, RLS reads, prohibited direct mutation/TRUNCATE, structural capacity/unique/FK constraints, fresh installation and repeat-migration protection. The race check holds the third assignment uncommitted, confirms a fourth request is waiting on a database lock, commits the first and verifies the waiting request returns `full` with exactly three rows remaining.

Browser checks exercise confirmation before success, disabled duplicate submissions, shared state across independent sessions, full capacity, release and reclaim, failure feedback, custom dishes, mocked session persistence, photo viewer arrows/swipe/focus/Escape, photo links, generated-pixel compression/upload/indexing, slideshow navigation, games, strict TikTok URL parsing, one-frame loading, rejection of untrusted player messages, completion-based Next, player retention across refresh, explicit manual fallback, mobile navigation and reduced motion. Touch and player events are synthetic. Screenshots contain placeholder property images and synthetic contributors, and remain ignored under `artifacts/`.

## Release checks still required

- Review and rehearse the SQL migration, back up production, coordinate the menu editing pause, then apply the migration before publishing V2. Check Data API exposure and member-only grants without disabling RLS.
- Test real family invitation sign-in, persisted sessions, revoked/nonmember access and two devices against the migrated Supabase API. Do not store invitation codes or resulting records in test files.
- Verify the actual private Storage upload path, photo index, signed URL access and slideshow on real devices.
- Watch a real permitted TikTok on desktop, iOS Safari and Android. Confirm no autoplay, Next unlocks after the documented completion event, the previous frame/audio stops on transition, and the explicit manual fallback works for blocked/unavailable content.
- On physical iOS Safari and Android, check navigation, touch/swipe, modal focus, upload selection and scrolling at the requested viewport sizes. Chromium viewport emulation is not physical mobile-browser validation.
- View the actual listing photos to improve numbered alt descriptions where possible and verify external CDN availability. No unrelated property images should be introduced.

No live authentication, live Storage, real TikTok playback or physical mobile-browser validation is claimed by these results.
