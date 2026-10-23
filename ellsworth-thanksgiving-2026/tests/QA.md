# Ellsworth scroll indicator · current validation

Validated October 23, 2026. A 12px-wide indicator spells Ellsworth with vertically stacked letters, moves with page scroll progress and fades after an 850ms pause. It stays inside the existing mobile gutter with no width animation, content shift, horizontal overflow or interception of taps. Its range follows the visible viewport below the sticky header. It hides during text entry, pinch zoom and open navigation/form/photo/TV overlays. Touch devices hide the root scrollbar only after the custom indicator initializes; native desktop scrollbar dragging remains available.

**511 Chromium checks passed**, including **108 focused scroll-indicator checks** at 320, 375, 430, 768 and 1440px. The checks exercise initial/idle visibility, real scroll progress, fixed geometry, all nine letters fitting within the thumb, gutter clearance, visible bounds, tap-through behavior, stable content width, touch scrollbar styling, a photo overlay and text-entry focus. Existing RSVP/menu/vote/photo/audio regressions also pass. Mobile and desktop previews were visually reviewed. Inline/browser JavaScript syntax, existing asset-version checks and `git diff --check` passed.

Supabase and external media are mocked; this verification uses Chromium rather than physical Safari/Android devices. No database, authentication or sound changes are included, so the database suite was not repeated. This update awaits PR merge and Pages deployment.

# Prior Heads Up and Jambalaya

Validated October 23, 2026. Heads Up replaces Spades with a fresh vote key. Jambalaya replaces Rice / dirty rice and Mashed potatoes / gravy with a fresh dish ID. Cached previews gain the new starter while retaining custom suggestions and other votes. Previously saved retired dishes/games remain hidden; their records are preserved without transferring votes or reservations to replacements.

**403 Chromium checks passed**, including shared and preview reservations/votes across reloads, retired cached/shared entries, independent member votes, unchanged stable keys, invitation routing, and the existing photo/RSVP/audio/layout regressions at 375, 430, 768, 1024 and 1440px. External services and media are mocked; physical mobile browsers remain outside these checks.

**160 PostgreSQL checks passed** against a disposable PostgreSQL 17.10 database. The new migration enables Heads Up votes while preserving existing votes, membership checks, own-account requirements, one-vote limits and removal ownership. It rejects nonmembers, spoofed users, arbitrary keys and wrong events. Both existing installations and the fresh migration sequence pass, and Jambalaya accepts reservations through the unchanged signup RPC. Inline/feature/test JavaScript syntax, content-versioned feature URL and `git diff --check` passed.

The configured project's current INSERT policy was inspected read-only and still needs the new key. **The live migration was not applied:** automatic approval review rejected the deployment pending explicit user approval for the persistent policy change. The migration must be applied once before merging/publishing the frontend; `tests/verify-shared-features.sql` now checks for its presence. No production family records were read or written. The earlier security-advisor findings concern the existing anonymous-member RPC design and intentionally policy-free private membership tables; this migration adds no functions, grants or tables. See the [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

# Prior gold signature and centered hero

Validated October 23, 2026. The hero headline is centered, and its introduction says “in New Orleans.” The selected footer style uses a larger Built by credit, a softly shimmering gold linked name, decorative swaying turkeys on both sides, and a separate Family Developer / Engineer line. The signature wraps at narrow phone widths. Motion-preference exceptions were removed throughout the site as requested: leaves, first-time confetti, footer animations, transitions and the slideshow’s playing default now behave consistently across device settings.

**390 Chromium checks passed**, including the updated animation behavior with an emulated reduced-motion preference and all existing app regressions. **33 focused hero/footer checks passed** at 320, 375, 430, 768, 1024 and 1440px for alignment, copy, larger credit, two decorative turkeys, flanking layout, real animation movement and overflow. Phone/desktop hero and signature previews were visually reviewed. Inline/browser JavaScript syntax, stylesheet content hash and `git diff --check` passed.

Supabase and external media remain mocked; physical Safari/Android are outside this verification. No persistence, authentication or sound changes are included. The update awaits PR merge and Pages deployment.

# Prior compact hero, property gallery and RSVP cards

Validated October 22, 2026. The hero facts occupy one three-column row. Removed the property listing/photo links, moved the categorized gallery immediately below the preview in the same photo column, and removed its separate heading/instructions. All 26 photos and category lazy loading remain available. The existing saved-confirmation node now belongs only to the member’s own RSVP card, directly after departure details (after the household name for declined RSVPs). No save/query, ownership, timestamp or sound behavior changed.

Section padding is now 56px on desktop and 36px on mobile, with a smaller footer, compact property spacing and no blank status-row gaps. **388 Chromium checks passed**, including own-card confirmation after reload, independent members, declined RSVPs, removal/disconnect, failed-save/read recovery, and the relocated nested gallery. **31 focused layout checks passed** across 320, 375, 430, 768, 1024 and 1440px for hero alignment, immediate gallery placement, own-card confirmation, spacing and overflow. Phone/desktop previews were visually reviewed using synthetic data/images.

Inline/feature/browser JavaScript syntax, content-versioned CSS/JS URLs and `git diff --check` passed. Persistence queries and schema are unchanged, so the database suite was not repeated. Supabase and external media are mocked; physical Safari/Android remain outside these checks. The update awaits PR merge and Pages deployment.

# Prior centered photo and mobile action groups

Validated October 22, 2026. Centered the photo illustration, upload buttons/helper, caption, emoji reactions and Edit caption/TV slideshow actions within their columns. The layout review also identified and centered mobile RSVP buttons, menu header/footer action groups, game filter/suggestion controls and the stacked footer. These additional rules apply at widths up to 760px. No JavaScript, persistence or sound behavior changed.

**373 existing Chromium regression checks passed**, plus **10 focused geometry checks** verifying centered photo groups and no horizontal overflow at 375, 430, 768, 1024 and 1440px. Mobile before/after previews and desktop photo previews were visually reviewed using synthetic images/data. Existing caption/reaction/slideshow interactions remain covered by the browser suite. The stylesheet content hash and `git diff --check` passed. Supabase/external media remain mocked, and physical Safari/Android remain outside these checks. The CSS update awaits PR merge and Pages deployment.

# Prior photo actions below the image

Validated October 22, 2026. The current family photo, caption, emoji reactions and Edit caption/TV slideshow actions now share one gallery column. The caption and action group follow the image in document order, so they appear underneath it on mobile and desktop. The photo upload controls remain with the section introduction. No data or event-handler behavior changed.

**373 Chromium checks passed** across 375, 430, 768, 1024 and 1440px. New geometry checks verify the caption, reactions and action buttons below the image at every width. Existing caption edits, multi-member reactions, failed-save recovery, photo navigation, TV slideshow and all app regressions remain passing. Mobile/desktop gallery screenshots were visually reviewed with synthetic photos. Inline/browser JavaScript syntax, stylesheet hash and `git diff --check` passed. Database/media fixtures are synthetic; physical Safari/Android remain outside these checks. No database, authentication or sound changes are included. The update awaits PR merge and Pages deployment.

# Prior surprise contribution sound

Validated October 22, 2026. Removed the entire sound settings row, its description and styles. The sound file is configured through a nonvisual script attribute; the controller no longer depends on visible controls or a stored mute flag. The existing 1.7-second clip plays on confirmed saves and first-time code entry. Device/browser volume controls playback. The internal rollout note asks relatives to turn sound on without announcing the effect.

**368 Chromium checks passed** across 375, 430, 768, 1024 and 1440px. Checks verify no sound controls or descriptive copy, native decoding of the 1.7-second file, successful contribution playback without UI, silent refreshes/restored sessions/removals/failed saves, compatibility with a retired false mute flag and unavailable preference storage, audio failure fallbacks, and cancellation on disconnect/pagehide. Existing app regressions remain passing. Mobile family-access layout was visually reviewed without the sound row. JavaScript syntax, asset hashes and `git diff --check` passed. Database/media fixtures remain synthetic; physical listening is manual. No database, authentication or audio-file changes are included. The update awaits PR merge and Pages deployment.

# Prior shorter contribution sound

Validated October 22, 2026. Removed exactly 0.500 seconds from the beginning of the approved clip: decoded audio is now **1.700 seconds**, verified with FFmpeg sample counts and native browser decoding. A brief fade softens the new starting edge. The sound test button, preview status, listener and unused status styles are removed; the Sound on/off toggle and save-triggered playback remain. The README retains the organizer’s rollout-message reminder to turn phone media volume up and leave Sound on.

**372 Chromium checks passed** across 375, 430, 768, 1024 and 1440px. Coverage verifies the new decoded duration, absence of preview controls, confirmed save playback, first-time joins, mute persistence, failed saves, audio failure handling and existing app behavior. Mobile controls were visually reviewed. JavaScript syntax, all four content-versioned asset URLs, FFmpeg decode and `git diff --check` passed. Supabase and external media are mocked; physical-device listening remains manual. No database or authentication changes are included. The update awaits PR merge and Pages deployment.

# Prior contribution sound

Validated October 22, 2026. Confirmed shared saves play the selected 2.2-second “I love it” excerpt, including the first successful code entry. Sound starts enabled with a browser-local mute preference and an explicit Preview sound button. Save callbacks are separate from notifications, reads and removals. No schema, authorization, API arguments or record behavior changed.

**374 Chromium checks passed** across 375, 430, 768, 1024 and 1440px. Existing regressions remain passing; new checks cover every contribution type, edits, photo batches, failed/pending saves, confirmed saves followed by failed refreshes, rejected codes, restored sessions, silent removals, mute persistence, unavailable preference storage and pending-clip cancellation on mute/disconnect. Missing-file, invalid-audio, blocked-playback, unsupported-API and missing-module cases all retain working saves. Native Web Audio decoded the shipped MP3 and its playback starts were observed in Chromium; the database and external media remain synthetic fixtures.

Mobile and desktop controls were visually reviewed with no horizontal overflow. Inline/feature/sound/browser JavaScript syntax, all four asset content hashes and `git diff --check` passed. The MP3 also passed FFmpeg decode validation. The database suite was not repeated because persistence behavior is unchanged. Audible review on physical Safari/Android and live family saves remain manual; headless playback checks do not establish speaker output or exact audible trim quality. The Preview sound control provides the same clip for that review after merge and Pages deployment.

# Prior first-time family welcome

Validated October 22, 2026. A successful first family-code entry starts a short turkey-and-“Ellsworth” confetti shower. The browser remembers the welcome; session restoration and repeat joins do not replay it. Failed or rejected joins never celebrate. Reduced motion uses only a still welcome message. No database, authentication API or family-record changes are required.

**316 Chromium checks passed** across 375, 430, 768, 1024 and 1440px with synthetic Supabase/media fixtures. New coverage verifies both confetti types, cleanup, returning sessions (including existing members without the new preference), rejected/unavailable codes, reduced motion, blocked preference storage, nonblocking pointer behavior, and disconnect during the effect. Existing application checks remain passing.

Focused mobile and desktop visual review also confirmed both confetti types falling through the viewport without horizontal overflow (**4 additional checks**). Inline JavaScript syntax, browser-runner syntax, stylesheet content hash and `git diff --check` passed. The database suite was not repeated because data paths are unchanged. Physical Safari/Android and live family authentication are outside this verification. The change awaits PR review and Pages deployment.

# Single photo-gallery dropdown · current validation

Validated October 22, 2026. The additional gallery starts with one closed **Explore house photos** control. Opening it reveals seven category controls; opening a category reveals its photos. Opening the parent alone does not request category thumbnails. Closing the parent hides the full category list.

**288 Chromium checks passed** across 375, 430, 768, 1024 and 1440px, including the new parent control, hidden category state, keyboard collapse, lazy loading, nested mobile photo access and all existing app regressions. Closed, category-list and photo-expanded views were captured at mobile and desktop widths with actual listing photos; no overflow or browser exceptions occurred. Inline JavaScript syntax, stylesheet content hash and `git diff --check` passed.

The photo URLs and database behavior are unchanged; database tests and external URL checks were not repeated. Browser integration continues to mock Supabase/media and does not claim physical Safari/Android validation. The UI change awaits PR review and Pages deployment.

# Prior exterior feature and categorized property gallery

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
