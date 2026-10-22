# Exterior feature and categorized property gallery · current validation

Validated October 22, 2026. The Holiday Home feature now uses the listing’s exterior photo. The five-photo preview remains, and a separate gallery groups the remaining 21 photos into seven collapsed dropdowns. All 26 source photo IDs are retained without duplicate gallery indices. No SQL, authentication or family-record behavior changed.

| Check | Result | Scope |
| --- | --- | --- |
| Browser integration | **283 checks passed** | Chromium at 375, 430, 768, 1024 and 1440px; mocked Supabase/media; existing family flows retained |
| Category gallery | Passed | Seven groups with correct labels/counts, all initially collapsed, no thumbnail request before expansion, pointer opening and keyboard collapse, one button for each of 26 images |
| Feature photo | Passed | Exterior source ID used at the top; five-photo house preview and a link to the new gallery |
| Larger-image viewer | Passed | Last categorized photo opens, wraps to the exterior, swipes to the next photo, traps focus and restores it to its category thumbnail on Escape |
| Real image availability | **53/53 URLs HTTP 200** | 26 downloaded 720px thumbnails, 26 full-size 1440px URLs, and the 1200px exterior feature URL |
| Real-photo visual review | Passed | All previously generic additional photos inspected to assign room categories; actual exterior feature and expanded gallery reviewed at 375px and 1440px, with no horizontal overflow or browser exceptions |
| Syntax/asset versions | Passed | Inline JavaScript, browser runner, stylesheet content hash and `git diff --check` |

The database suite was not repeated because the schema and data paths are unchanged. Browser integration uses synthetic family data; focused gallery screenshots use the original listing photographs. Physical mobile browsers, real TikTok playback and live family authentication remain outside this automated verification. Photos remain hosted on Airbnb’s CDN. The UI change awaits PR review and the existing Pages publishing flow.

# Prior family rollout polish

Validated October 22, 2026. Adds the approved compact FAQ, optional food allergies/dietary needs, persistent RSVP save confirmation, and clearer copy. The group-chat guide and physical two-device rehearsal remain with the organizer, as requested.

| Check | Result | Scope |
| --- | --- | --- |
| Database suite | **146 checks passed** | Real local PostgreSQL 17.10; migration preservation, optional dietary defaults/length, member reads, own-only edits, authoritative timestamps, failed-write preservation, private trigger privileges and fresh installation |
| Browser suite | **244 checks passed** | Chromium at 375, 430, 768, 1024 and 1440px with mocked Supabase/Auth/Storage/media; existing app regressions retained |
| FAQ | Passed | Six native disclosures, pointer/keyboard operation, group-chat guidance for confirmed travel/contact details; NFL Games remains last |
| Dietary needs | Passed | Optional field, visibility explanation, save/reopen/clear, shared member display, safe text rendering, reload and device-only preview |
| Save reassurance | Passed | Persistent own-RSVP confirmation, server time displayed in Central even for a Tokyo device, unchanged time after reload, no success on failed save, safe last-confirmed state after failed refresh, removal/disconnect clearing, and unknown historical timestamps |
| Visual review | Passed | Focused mobile RSVP/expanded FAQ and desktop RSVP screenshots with synthetic records; no browser exceptions |
| Production setup | Applied and verified | `20261022151147_rsvp_dietary_and_updated_at.sql` installed; new fields and trigger present; existing RLS/member grants retained; trigger is private, security-invoker, has an empty search path, and is not callable by browser roles |
| Syntax/asset versions | Passed | Inline and feature JavaScript, browser runner, content-matching script/CSS hashes and `git diff --check` |

The migration adds columns without changing existing RSVP values, policies or grants. Old records retain a null historical timestamp until their next save. Existing security-advisor findings are unchanged; the membership-gated anonymous Auth design and its advisory links are documented in the earlier validation record below. No new advisor finding was introduced by this migration.

Production verification used schema/privilege queries, not live member CRUD or real family content. Local PostgreSQL checks the actual writes and access policies; browser fixtures check the UI separately. Physical Safari/Android, real TikTok playback and real Storage remain outside these automated results. The frontend PR is unmerged; publish through the existing Pages flow after review. Do not reapply the migration to the configured project.

# Prior RSVP reload fix

Validated October 21, 2026. Loading the current page with the actual previous feature script reproduced the screenshot: `Cannot read properties of null (reading 'addEventListener')`, an uninitialized feature module, empty RSVP summary/status/list, and the default Add my RSVP label. The previous script still referenced the removed Family Plans button. The published script response has `Cache-Control: max-age=600`, so an unchanged script URL could reuse that version after an HTML update.

The page now uses content-versioned feature-script and stylesheet URLs. Their first-12-character SHA-256 values are enforced by the browser suite. No authentication, RSVP persistence, database schema or permissions changed.

| Check | Result | Scope |
| --- | --- | --- |
| Browser integration | **207 checks passed** | Existing application regressions plus stale-script and asset-version checks, across 375, 430, 768, 1024 and 1440px |
| Returning-member RSVPs | Passed | At 375px touch/mobile and 1440px, create RSVP, restore the same account across two page reloads, retain list/count/travel details, refresh the board, reopen for editing, avoid duplicates and remove own RSVP |
| Stale asset recovery | Passed | An incompatible previous script is available at its cached unversioned URL; the updated HTML bypasses it and initializes the shared features |
| Production verification | Read-only | RSVP table, RLS and member SELECT policy/grants remain installed; a boolean existence query confirms saved RSVPs are present without retrieving household details |
| Syntax/whitespace | Passed | Browser runner and `git diff --check`; feature code is unchanged |

Supabase/Auth/Storage and media remain mocked in the browser suite. Physical Safari and live family-login behavior are not claimed. The database suite was not rerun because this fix changes only asset URLs and the regression harness. No production records were written or altered. The UI fix awaits PR merge and the existing Pages publishing flow.

# Prior RSVP and caption fixes

Validated October 21, 2026. The configured Supabase project was missing all five tables from the earlier family-planning migration. The reviewed migration was rehearsed locally, applied successfully through Supabase, and verified with the committed read-only `verify-shared-features.sql` query. The frontend PR remains unmerged.

| Check | Result | Scope |
| --- | --- | --- |
| Database regression suite | **130 checks passed** | Real local PostgreSQL 17.10 with actual migrations, member RLS and grants; exact RSVP, caption-only and reaction upserts included |
| Browser integration suite | **183 checks passed** | Chromium at 375, 430, 768, 1024 and 1440px with synthetic shared sessions and mocked Supabase/media |
| Missing-setup diagnosis and recovery | Passed | Live table metadata confirmed the missing schema; browser tests reproduce disabled controls for missing tables and restore them after setup and refresh |
| Production setup | Applied and verified | All four active shared-feature tables exist with RLS, member SELECT/write grants and no anonymous SELECT grant; existing member/content records were not read or modified by the additive migration |
| Family Plans removal | Passed | Section, navigation, forms and handlers removed; no schedule requests during join, refresh, reload or local preview; NFL Games stays last |
| RSVP flow | Passed | Includes self by default; add, edit without duplication, separate households/counts, invalid travel dates, failed-save retry, decline, remove and reload |
| Captions | Passed | One input only; add, update by another member, clear and retry a failed save; escaped text, no name/date display in album or TV, historical metadata retained |
| Emoji reactions | Passed | Add, change and remove; independent members; failed save is retryable and never displayed as successful |
| Existing behavior | Passed | Menu capacity/concurrency, invitation routing without input activation, gallery, uploads, game voting, TikTok skipping, TV controls and disconnect |
| Syntax/whitespace | Passed | Inline app script, feature script, test scripts and `git diff --check` |

The production check is schema/grant verification, not an end-to-end family login or live member CRUD test. Attempts to run an additional rolled-back synthetic write check through the connector returned `Invalid or expired requestState`; no successful live write test is claimed. Local PostgreSQL covers actual RLS/constraints, while browser integration covers the UI separately. Live Storage, real TikTok playback and physical mobile/TV devices are outside these results.

Supabase advisors were reviewed after installation. The application intentionally uses invitation-gated anonymous Auth sessions; every new table policy also checks server-side family membership. Advisor notices about [anonymous Auth policies](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0012_auth_allow_anonymous_sign_ins), the existing [privileged membership RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), and [protected membership/invite tables without client policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) were checked against that access model. Existing password-auth settings were outside this change; [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

The records below describe earlier releases and their state at the time; the production setup status above supersedes historical statements that the migration was unapplied.

# Lineup and media update validation record

Validated October 21, 2026. This presentation/interaction update has no new schema migration and does not apply SQL or merge/deploy the page.

| Check | Result | Scope |
| --- | --- | --- |
| Browser integration suite | **181 checks passed** | Chromium with mocked Supabase/Auth/Storage and TikTok; existing family-planning, menu, upload, slideshow and access tests included |
| NFL placement and scope | Passed | Last main section is NFL Games; exactly three Thursday games in Central time; no football in editable family plans |
| Game lineup and vote identity | Passed | Spades, UNO and Name That Tune retain original vote keys; Charades, Family Feud and Dominoes absent, including cached local previews |
| TikTok navigation | Passed | Skip before playback, immediate subsequent skips, wrapping, single-frame replacement, autoplay disabled, current-origin/source validation, error feedback and player retention on refresh; blocked/unlocked panel absent |
| Property gallery | Passed | Eight selected URLs/thumbnails only; source room labels, expanded outdoor thumbnails, keyboard wrap, touch/swipe, modal focus and Escape |
| Real photo asset checks | **8/8 thumbnail and full-size URLs HTTP 200** | Published 720px/1440px variants from the original listing; downloaded thumbnails visually reviewed; only exterior, patio, backyard and living area retained |
| Responsive/visual review | Passed | Automated overflow checks at 375, 430, 768, 1024 and 1440px; real listing-photo gallery and final NFL section reviewed at desktop/mobile widths |
| Syntax/whitespace | Passed | Inline script, feature script, browser runner and `git diff --check` |

The database schema is unchanged, so the database suite was not repeated for this UI update; the prior real-Postgres results are recorded below. Real TikTok playback and physical mobile/TV devices remain outside this automated verification. The earlier family-planning migration is still required for installations that have not installed those shared features.

## Prior family planning validation record

Validated October 21, 2026. This PR does not apply `20261021175039_family_planning.sql` to production, merge the PR, or deploy the page.

| Check | Result | Scope |
| --- | --- | --- |
| Local database suite | **125 checks passed** | PostgreSQL 17.10; actual baseline, menu migration and additive planning migration; synthetic auth/storage fixtures |
| Browser integration suite | **165 checks passed** | Chromium; mocked Supabase/Auth/Storage, photo sources and TikTok |
| New data enforcement | Passed | Member-only reads, anonymous/TRUNCATE denial, own RSVP/plan/vote/reaction writes, protected seed fields, unique votes/reactions, FK/count/date constraints, preservation of old menu/photo records and fresh installation |
| New family flows | Passed | Independent households, invalid/failed saves, confirmed vs. possible headcounts, shared seed times, own plan removal, NFL filters and Central-time display, popular voting, shared caption/name/date edits and safe text rendering |
| TV slideshow | Passed in Chromium | Native fullscreen and exit, rejected-fullscreen fallback, captions/people/year, previous/next, keyboard navigation, automatic advancement, play/pause, focus restoration and disconnect while open |
| Session/device behavior | Passed | Invitation instructions without input activation, cleared private state after disconnect, shared reload, local preview persistence; a second test session uses Asia/Tokyo to check that displayed times remain Central |
| Responsive layout | Passed | Populated features at 375, 430, 768, 1024 and 1440px; screenshots use synthetic records and placeholder media |
| JavaScript syntax and whitespace | Passed | Inline app script, feature script, test scripts and `git diff --check` |

The existing menu capacity/race tests, gallery/touch controls, upload/compression, TikTok URL/playback-message rules, mobile navigation and reduced-motion checks still run in the same suites. Browser fixtures verify UI behavior; the real local Postgres tests verify RLS and SQL constraints separately. Neither suite writes to a production API.

Before deployment, apply the reviewed additive migration as described in README.md, then test real family sign-in, Storage, physical mobile keyboards, actual TV browser/fullscreen support and real TikTok playback. NFL entries are a snapshot verified against official sources on October 21, 2026; recheck kickoffs near the event. These real-device and production checks are not claimed by the automated results.

## Original V2 validation record

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
