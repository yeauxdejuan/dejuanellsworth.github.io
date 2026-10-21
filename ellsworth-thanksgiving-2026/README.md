# Ellsworth Family Thanksgiving 2026 · Family planning release

This is an enhancement of the existing vanilla HTML/CSS/JavaScript application in `ellsworth-thanksgiving-2026/`. The personal website at the repository root is independent. No framework or production build step is required.

The existing GitHub Pages deployment keeps the `/ellsworth-thanksgiving-2026/` path under its current Pages base URL.
GitHub Pages serves the static page; Supabase supplies family authentication, shared records and private photo storage. **Apply the reviewed family-planning migration before merging this frontend release.**

## Family planning additions

- Household RSVPs have Coming / Maybe / Can’t make it responses, adult and child counts, arrival/departure dates and optional times, and a short note. Counts include the person submitting. Confirmed and possible guests are reported separately; declined households count as zero. Members can update or remove only their own RSVP.
- The weekend agenda combines family plans with six NFL entries: the five holiday games plus the Saints’ Sunday game. It supports NFL-only and family-only filters. All displayed and entered times use **America/Chicago (Central)**, including when the visitor’s device uses a different zone. Dinner and family game night start without invented times. All family members can update those two shared placeholders; custom outings/plans are editable and removable by their creator.
- Each browser account can vote once for each built-in or suggested game and remove its own vote. Most-popular sorting uses shared counts, with original order as the tie breaker. Votes do not set the actual game-night schedule.
- Photo captions, names and dates are a collaborative overlay: members can improve details on both old and new uploads, while the original photo record and caption remain intact. Each account can choose one reaction per photo, change it or remove it.
- TV slideshow offers large photos and captions, previous/next, pause/play, keyboard arrows, focus containment and Escape. It requests native fullscreen when supported and remains usable as a full-window overlay when unavailable. It uses the existing private-photo signed URLs. Disconnect clears the private state and closes the viewer.
- Unconfigured previews save these additions on the current browser only. A configured board never falls back to local writes when shared reads fail. New feature buttons use the existing invitation-instructions route without activating a text input.

### Deploying this release to an existing board

1. Confirm the earlier `20261021051504_shared_dish_signups.sql` migration is already installed. If not, follow the original V2 installation section below first. Never rerun the baseline or an already-installed migration.
2. Review and rehearse **`migrations/20261021175039_family_planning.sql`**, then apply it once to the existing project through the Supabase SQL Editor. This additive transaction creates five tables and two untimed family plans; it leaves existing dishes, games, photos, membership and private Storage policies unchanged. A lock timeout or failure rolls back the transaction.
3. Verify the five new tables have RLS enabled and explicit `authenticated` grants; the migration revokes inherited anonymous and TRUNCATE access. Keep the existing exposed-schema configuration and private bucket. No new secrets, scheduled jobs, external APIs or Realtime setup are required.
4. Merge the frontend PR through the existing GitHub Pages flow. Test with two family sessions: independent RSVPs, shared seeded-plan updates, own custom-plan edits, one-vote/reaction limits, photo annotations, disconnect and the TV viewer on actual mobile/TV devices.

The migration is included and tested locally; **this feature PR does not apply it to production or merge/deploy the page**. Existing V2 pages remain compatible with the additive tables. If a frontend rollback is necessary, retain the new tables so contributions are preserved; no destructive down-migration is provided.

### Football sources

The [official NFL Thanksgiving release](https://www.nfl.com/news/thanksgiving-2026-nfl-schedule-release) supplies the Nov. 25–27 holiday games; the [official Week 12 schedule](https://www.nfl.com/schedules/2026/by-week/week-12) supplies the Saints’ Nov. 29 matchup. Matchups, broadcasters and kickoffs were checked October 21, 2026 and converted from Eastern to Central time. These are a checked-in snapshot, **not a live feed**; the UI labels the verification date, warns that kickoffs can change and links to the full NFL schedule. No college games are included.

### Shared data and ownership

The new schema uses the existing server-checked family membership function and `auth.uid()` in RLS. A unique household key permits one RSVP per event/account; game votes and photo reactions have database-enforced account uniqueness. Ownership cannot be reassigned to another user. Schedule grants exclude identity, creator and seeded-plan fields; seeded plans can be edited, but cannot be created or deleted by browser clients. Photo-detail edits are collaborative and record the editing account. Concurrent caption edits use last-save-wins behavior; the original caption remains available in the underlying photo record.

These are browser accounts, not verified individual identities. Rejoining on a different device can create a new account and an additional RSVP or vote; coordinate household names and contact the organizer to reconcile duplicates. Travel details and family activity are visible only to joined members; the public NFL snapshot and built-in game names remain visible to visitors. Refresh runs every 30 seconds in an active tab, and **Refresh plans** refreshes the new shared records immediately. Photo URLs retain the existing signed-URL lifetime.

## What changed

- Rust and burnt orange accents, warm cream backgrounds and local SVG autumn leaves replace the green starburst branding. Leaf animations ignore pointer input and stop under `prefers-reduced-motion`; the photo slideshow starts paused for that preference.
- Dishes show `0/3` through `3/3`, every contributor's name and individual note. Each account can claim one slot per dish, update its details or release its own slot. Custom dishes have the same capacity.
- The property gallery keeps the original photos and displays the fifth genuine listing image that was previously only present in the lightbox array. Its viewer supports buttons, left/right arrow keys, Escape and horizontal touch swipes. Thumbnails load lazily.
- TikToks form a single-video playlist with a directly available embedded player, no autoplay, completion-based Next and an explicit manual fallback.
- The footer credits **Built by De’Juan Ellsworth · Family Developer/Engineer**.

## Original V2 installation: menu migration and release order

The live dish columns, policies and original `claim_ellsworth_dish` RPC were inspected read-only during the original V2 implementation. No production records were read into fixtures. These steps are retained for installations that still need the menu upgrade; check actual installation state before applying it.

1. Review `migrations/20261021051504_shared_dish_signups.sql`. Export/backup the existing dishes, family data and schema through Supabase before making production changes. Rehearse on an isolated test project or database.
2. Coordinate a brief menu editing pause. Existing V1 tabs cannot manage the normalized V2 menu; after the migration their old RPC returns an explicit reload error.
3. In the existing project's SQL Editor, apply **only** `migrations/20261021051504_shared_dish_signups.sql`, once. Do **not** rerun `supabase-setup.sql` on an existing installation. The migration runs in one transaction; a lock timeout or error rolls the change back. A repeat application intentionally fails before backfill so released claims cannot be resurrected.
4. Verify the new table, RPC grants and family-member access. All nonempty legacy names and all account-owned claims become slot 1; legacy dish rows and their original assignment fields remain unchanged. For anonymous accounts deleted before migration, named ownerless claims still occupy a slot. An organizer must resolve those manually, after verifying the family member; other accounts cannot release them.
5. Confirm the Supabase Data API exposes `public`, including the new table/RPC. **Keep `ellsworth_private` out of exposed schemas.** Explicit grants are included because new tables need not receive Data API privileges automatically. No Realtime configuration is required: shared data polls every 30 seconds in an active tab, and members can use Refresh.
6. With the migration verified, merge the frontend PR into `main` through the repository's existing GitHub Pages publishing flow. Reload old tabs. Test with two real family sessions before ending the editing pause. No release has been merged or deployed by this change.

Read-only organizer checks (inspect output privately; do not commit family data):

```sql
-- Each qualifying legacy claim should have been copied at migration time.
select count(*) as legacy_claims
from public.thanksgiving_dishes
where nullif(btrim(assignee), '') is not null or claimed_by is not null;

select count(*) as migrated_claims
from public.thanksgiving_dish_signups;

-- Must return zero rows. Once new signups begin, total counts above may diverge.
select event_id, dish_id, count(*)
from public.thanksgiving_dish_signups
group by event_id, dish_id having count(*) > 3;

-- Review any ownerless reserved slots with the family organizer.
select count(*) as ownerless_claims
from public.thanksgiving_dish_signups where user_id is null;
```

### Database enforcement and ownership

`thanksgiving_dish_signups` references the existing composite `(event_id, id)` dish key. A primary key on `(event_id, dish_id, slot)` and a slot check of 1–3 make a fourth active assignment impossible even outside JavaScript. A unique `(event_id, dish_id, user_id)` prevents duplicate account claims.

`manage_ellsworth_signup` is a security-invoker wrapper around a private security-definer function with a fixed empty search path. The private function validates `auth.uid()`, family membership and the fixed event ID on every path, takes a parent-dish row lock, and then claims, updates or releases only the caller's assignment. Requests racing for the final slot serialize: one succeeds, the other receives `full`. No account ID is accepted from the browser.

RLS limits sign-up reads to family members. Browser roles cannot directly write signups, mutate legacy claims, delete dishes or truncate either table. Custom-dish inserts are limited to definition columns. The frontend waits for a confirmed RPC result; it distinguishes full, duplicate, removed, missing and network/conflict outcomes. A failed refresh disables menu edits until the menu can be read again.

### Rollback considerations

Prefer fixing forward. Keep the original columns and the new signups table: both preserve information needed for recovery. **Do not drop the new table or restore the V1 baseline as a rollback.** V1 cannot represent three independent contributors, and its RPC is deliberately retired. Rolling back to a V1 page while keeping V2 data would leave menu editing unavailable. If a rollback becomes necessary, pause writes, export both representations, keep a V2-compatible frontend, and have an organizer review a separate reconciliation plan before any database changes. No destructive down-migration is supplied.

## Fresh installation

1. Create a Supabase project. Run `supabase-setup.sql` **once**, then `migrations/20261021051504_shared_dish_signups.sql`, then `migrations/20261021175039_family_planning.sql`, in that order. The complete path is tested locally for fresh installations.
2. Enable **Authentication → Providers → Anonymous Sign-Ins**.
3. Set a long random private invitation code in the Supabase SQL Editor only. The following is a placeholder, never the real family code:

```sql
insert into public.ellsworth_invite (id, code_hash)
values (1, extensions.crypt('REPLACE-WITH-A-PRIVATE-RANDOM-CODE', extensions.gen_salt('bf',10)))
on conflict (id) do update set code_hash = excluded.code_hash;
```

4. Share the code privately. If creating a separate installation, set `FAMILY_CONFIG.url` and `FAMILY_CONFIG.publishableKey` in `index.html` to that project's public URL and publishable key. The current site is already configured; preserve its settings for this release. Never put a privileged key, password or invitation code in HTML, SQL migration files, tests or commits.
5. Publish the directory through GitHub Pages. In this repository, **keep it under `ellsworth-thanksgiving-2026/` and do not replace the root `index.html` or change the personal site's Pages configuration**.

## Family data and sessions

| Content | Configured shared board | Unconfigured local preview |
| --- | --- | --- |
| Dish definitions, signups and individual notes | Supabase Postgres | localStorage; V1 local names/notes retained |
| Games and TikTok URLs | Supabase Postgres | localStorage |
| Uploaded photos | Private Supabase Storage; index in Postgres | Browser IndexedDB |
| External photo links | Protected Postgres index; original stays external | localStorage |
| Property photos and built-in content | Existing static/CDN assets | Same assets |

Members join once per browser with the code. Supabase keeps the anonymous account session in that browser. A different browser/device, cleared storage or **Disconnect this device** can create a different account on rejoining. Names are display labels, not verified identities: one person using separate anonymous accounts can occupy separate slots. Do not use a name to authorize ownership. An organizer must help reconcile old-device claims if access is lost.

The invitation hash and membership roster are protected server-side. Only a publishable key belongs in the public frontend. Anonymous authentication alone does not grant family membership; the code-checked membership RPC does. Rotating the invitation code prevents new joins with the old code but does not revoke existing members. Manage membership revocation separately through the organizer.

Photo uploads retain the existing JPEG compression and private bucket, with member-authorized temporary signed URLs. A forwarded signed URL can work until it expires. External photo URLs remain public at their source. Do not add personal photos or exported family records to Git. Keep independent backups and monitor the project's storage/egress usage.

## TikTok playback and limitations

The implementation follows [TikTok's Embed Player documentation](https://developers.tiktok.com/docs/en/embed-player): `/player/v1/{id}`, `autoplay=0`, `loop=0`, and `onStateChange` value `0` for ended. The host accepts messages only from `https://www.tiktok.com` **and** the current iframe window, with the documented player marker. It requires a playing event before an ended event can unlock Next. There are no duration guesses or completion timers.

The embedded player loads as the TikTok section approaches the viewport, so visitors press Play directly inside the video without a separate loading button. Next loads the next embedded player with autoplay disabled. Replacing a video destroys its old iframe; background polling retains the active one. Hiding the tab sends a pause request.

Availability, privacy settings, deleted videos, content restrictions and browser embed blocking remain outside this app's control. If playback fails or completion events do not arrive, **Video blocked or Next hasn’t unlocked? → Use manual navigation** removes the player and enables Next with a visible explanation that completion cannot be verified. This is an explicit fallback; the app does not claim strict end-of-video enforcement in manual mode. Opening TikTok in another tab is controlled by TikTok/the browser. Full HTTPS `tiktok.com/@creator/video/ID` links are supported; short links must first be expanded by the person sharing them. New submissions strip tracking parameters; stored URLs are preserved.

## Property photographs

All five photo identifiers were verified against image links on the original listing during implementation. Four thumbnails were already visible, and the fifth was already in the source's lightbox array. V2 makes all five visible. Additional distinct original listing images could not be retrieved reliably; no image IDs were invented or unrelated interiors substituted. The original listing link remains available, and the guest-capacity/restrictions paragraph beneath its button was removed.

The listing exposes no reliable image descriptions through the available text response, and its image CDN could not be inspected in this environment. The gallery therefore uses honest numbered listing-photo labels rather than invented room descriptions. An organizer can improve the alt text after viewing the actual photographs. CDN availability remains an external dependency. Property names, specific locations, street addresses, access instructions and reservation details are deliberately omitted from this README.

## Testing and troubleshooting

Development-only checks live in `tests/`; they do not change the site's runtime dependencies or the root project. Node.js 22+ and local Chromium are required. The PostgreSQL package includes local binaries and needs its install scripts enabled. It opens only a loopback test database and never takes a production database URL.

```sh
cd ellsworth-thanksgiving-2026/tests
npm ci
npm test
# Or run separately:
npm run test:db
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

The test database emulates Supabase's auth UID and storage schema interfaces; it runs the actual baseline and migration. Tests cover legacy and ownerless assignments, first/second/third signups, fourth/duplicate rejection, own update/release/reclaim, unauthorized writes and reads, event isolation, slot/FK constraints, fresh installation and genuinely overlapping transactions racing for the final slot. PostgreSQL needs local port 55432 available.

The Chromium integration suite mocks Supabase/Auth/Storage and external media using synthetic data. It checks database-confirmed UI feedback, multiple independent browser sessions, session restoration, full/removed/reclaimed states, custom dishes, responsive overflow at **375, 430, 768, 1024 and 1440px**, gallery controls and synthetic touch events, modal focus, photo upload/compression, photo links/slideshow, games, URL validation, trusted/untrusted playback messages, player retention on refresh, manual fallback, navigation and reduced motion. Screenshots are written to ignored `tests/artifacts/` with placeholder media.

See `tests/QA.md` for the recorded results and outstanding release checks. **Physical iOS Safari/Android, real TikTok playback, production sign-in and real Storage upload/signed URL behavior have not been validated by this automated suite.**

- Menu unavailable: verify the migration completed, Data API grants/schema exposure, family membership and network access. Never disable RLS to fix an error.
- A dish fills while a form is open: the database returns `full`; refresh and choose another item. No success is shown before confirmation.
- An old page reports an upgrade error: reload after V2 is published. Coordinate the short migration/frontend release window with the organizer.
- A missing photo: verify the external host or private bucket policy and refresh signed URLs. Do not make the private bucket public.
- TikTok Next stays locked: let the video end, or explicitly switch to manual navigation if the embed cannot report playback.

Implementation references: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API grant changes](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [anonymous sign-in](https://supabase.com/docs/guides/auth/auth-anonymous), and [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
