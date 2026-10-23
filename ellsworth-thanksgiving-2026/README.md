# Ellsworth Family Thanksgiving 2026

This is an enhancement of the existing vanilla HTML/CSS/JavaScript application in `ellsworth-thanksgiving-2026/`. The personal website at the repository root is independent. No framework or production build step is required.

The existing GitHub Pages deployment keeps the `/ellsworth-thanksgiving-2026/` path under its current Pages base URL.
GitHub Pages serves the static page; Supabase supplies family authentication, shared records and private photo storage. This rollout update adds a compact FAQ, optional RSVP dietary needs, persistent save confirmation, Central-time last-updated information, and clearer family-facing wording. The earlier shared-feature migration was installed on October 21, 2026; the additive `20261022151147_rsvp_dietary_and_updated_at.sql` migration was installed and verified on October 22, 2026. **Do not reapply either migration to the configured project.** The UI changes still require PR merge and Pages deployment.

**Family rollout message reminder:** Include “Make sure your phone’s sound is on and your media volume is turned up.” Keep the sound effect itself a surprise; the organizer will send the family message.

## Reloading after a release

The page requests its feature script and stylesheet with content-versioned URLs. GitHub Pages caches these assets for ten minutes; using an unversioned URL allowed the latest HTML to run the previous script, which referenced the removed Family Plans controls and stopped initialization before rendering RSVPs. Versioned URLs bypass that stale response without clearing browser storage or changing a family account.

Whenever `assets/family-features.js`, `assets/family-features.css`, `assets/family-sound.js`, or `assets/i-love-it.mp3` changes, update its `?v=` value in `index.html` to the first 12 characters of the file's SHA-256 hash. The browser suite checks those values and exercises saved RSVPs across repeated reloads with the old unversioned script cached.

## Shared family features

The hero headline is centered and its introduction says “in New Orleans.” The date, location and countdown stay in a single three-column row. Section padding is 56px on desktop and 36px on mobile, with compact blank status areas and footer spacing.

- Confirmed shared saves play the organizer-selected “I love it” clip: new menu items, dish reservations/edits, RSVP saves/edits, photo uploads/links, captions, game suggestions, TikToks, votes and reactions. A photo batch plays once. First-time code entry uses the existing welcome preference and plays alongside the confetti. Refreshes, restored sessions, repeat joins, removals, failed saves and device-only preview writes are silent. Sound follows confirmed writes even if the following refresh fails.
- The 1.7-second save sound has no visible controls, test button or description on the site, so it remains a surprise. Playback is prepared during a tap/key gesture; no sound autoplays on page load. The retired in-app mute preference is ignored because its control has been removed; members use their device/browser volume. Disconnecting, hiding the tab or leaving the page stops active/pending clips. Consecutive saves replace the previous clip. Audio failures or a missing optional sound module never block saving. Clip provenance is in `assets/SOUND.md`.
- A first successful family-code entry gets a five-second shower of turkey emoji and “Ellsworth” text, plus a welcome message. Returning sessions and repeat joins in that browser do not replay it. The preference is browser-local; a new browser or cleared site storage can show it again. The five-second welcome animation runs consistently across device motion settings. The decoration never takes focus, blocks clicks or locks scrolling, and disconnect removes it immediately.
- Household RSVPs have Coming / Maybe / Can’t make it responses, adult and child counts, arrival/departure dates and optional times, an optional food-allergy/dietary-needs field, and a short note. Dietary details are visible to joined family members and editable only by the household’s account. Counts include the person submitting. Confirmed and possible guests are reported separately; declined households count as zero. Members can update or remove only their own RSVP.
- Each household sees its persistent saved confirmation directly below departure details inside its own RSVP card, with its last update time in **America/Chicago (Central)**. Shared timestamps come from a private database trigger, not the device clock. Existing RSVPs retain an unknown timestamp until their next edit; the UI never invents a historical save time. Reloading or polling does not change the timestamp. A successful save remains visible if its following refresh fails, with wording that distinguishes the last confirmed save from a fresh read.
- The compact FAQ uses keyboard-accessible native disclosure controls and covers the house, travel details, packing, dietary needs, RSVP edits, and contact. Confirmed check-in/check-out, parking, address, and contact details are directed to the **family group chat**, as requested. It contains no invented booking details.
- **NFL Games** remains the last section and shows only the three Thanksgiving Thursday games. All displayed and entered times use **America/Chicago (Central)**, including when the visitor’s device uses a different zone. Family Plans and its navigation, editing controls and database requests have been removed.
- The built-in lineup is Spades, UNO and Name That Tune. Charades, Family Feud and Dominoes are hidden from the lineup, including previously cached or shared suggestions; existing records and votes are retained. Stable vote keys are preserved for remaining games. Each browser account can vote once for each built-in or suggested game and remove its own vote. Most-popular sorting uses shared counts, with original order as the tie breaker. Votes do not set the actual game-night schedule.
- The photo illustration, upload buttons, caption, emoji reactions and Edit caption/TV slideshow actions are centered within their columns; photo details remain below the image. Mobile RSVP/menu action groups, game filter/suggestion controls and the stacked footer are also centered. Photo editing has one caption field. Members can update or clear captions on old and new uploads; names and dates are absent from the editor, album and TV slideshow. The original photo record and any historical metadata remain stored. Each account can choose one emoji reaction per photo, change it or remove it.
- TV slideshow offers large photos and captions, previous/next, pause/play, keyboard arrows, focus containment and Escape. It requests native fullscreen when supported and remains usable as a full-window overlay when unavailable. It uses the existing private-photo signed URLs. Disconnect clears the private state and closes the viewer.
- Unconfigured previews save these additions on the current browser only. A configured board never falls back to local writes when shared reads fail. New feature buttons use the existing invitation-instructions route without activating a text input.

### Deploying this release to an existing board

1. Confirm the earlier `20261021051504_shared_dish_signups.sql` migration is already installed. If not, follow the original V2 installation section below first. Never rerun the baseline or an already-installed migration.
2. **Only if the shared-feature tables are absent:** review and rehearse **`migrations/20261021175039_family_planning.sql`**, then apply it once through the Supabase SQL Editor. Skip this step for the configured project, where it is already installed. This additive transaction creates five tables and two untimed family plans; it leaves existing dishes, games, photos, membership and private Storage policies unchanged. A lock timeout or failure rolls back the transaction.
3. **Only if the RSVP rollout fields are absent:** apply `migrations/20261022151147_rsvp_dietary_and_updated_at.sql` once, after the earlier migrations and before publishing this frontend. It adds bounded optional dietary text and a nullable server-managed update timestamp without changing old RSVP values, ownership policies, or grants. It is already installed on the configured project.
4. Run `tests/verify-shared-features.sql` against the target project before publishing. Every table check and all three RSVP rollout-field/trigger checks must be true. This read-only check verifies installation, RLS and explicit member grants without reading family records. The migration also creates the legacy schedule table; it remains stored for compatibility, but this page never requests it. Keep the existing exposed-schema configuration and private bucket. No new secrets, scheduled jobs, external APIs or Realtime setup are required.
5. Merge the frontend PR through the existing GitHub Pages flow. Test with two family sessions: independent RSVPs, one-vote/reaction limits, shared caption edits, disconnect and the TV viewer on actual mobile/TV devices.

The existing migration is now installed on the configured project. The frontend changes still require PR review and the existing Pages publishing flow. For a separate installation, apply each missing migration once, in order, before publishing; never rerun the baseline on an existing project. Existing V2 pages remain compatible with the additive tables. If a frontend rollback is necessary, retain the new tables so contributions are preserved; no destructive down-migration is provided.

### Football sources

The [official NFL Thanksgiving release](https://www.nfl.com/news/thanksgiving-2026-nfl-schedule-release) supplies the three Thursday, Nov. 26 games. Wednesday, Friday and Sunday games are excluded. Matchups, broadcasters and kickoffs were checked October 21, 2026 and converted from Eastern to Central time. These are a checked-in snapshot, **not a live feed**; the UI labels the verification date, warns that kickoffs can change and links to the official NFL source. No college games are included.

### Shared data and ownership

The new schema uses the existing server-checked family membership function and `auth.uid()` in RLS. A unique household key permits one RSVP per event/account; game votes and photo reactions have database-enforced account uniqueness. Ownership cannot be reassigned to another user. Photo-detail edits are collaborative and record the editing account. Concurrent caption edits use last-save-wins behavior; the original caption remains available in the underlying photo record.

These are browser accounts, not verified individual identities. Rejoining on a different device can create a new account and an additional RSVP or vote; coordinate household names and contact the organizer to reconcile duplicates. Travel details and family activity are visible only to joined members; the public NFL snapshot and built-in game names remain visible to visitors. Refresh runs every 30 seconds in an active tab, and **Refresh RSVPs** refreshes the new shared records immediately. Photo URLs retain the existing signed-URL lifetime.

## What changed

- Rust and burnt orange accents, warm cream backgrounds and local SVG autumn leaves replace the green starburst branding. Leaf animations ignore pointer input. Animations and slideshow defaults run consistently across device motion settings, as requested.
- Dishes show `0/3` through `3/3`, every contributor's name and individual note. Each account can claim one slot per dish, update its details or release its own slot. Custom dishes have the same capacity.
- The property gallery keeps the original photos and displays the fifth genuine listing image that was previously only present in the lightbox array. Its viewer supports buttons, left/right arrow keys, Escape and horizontal touch swipes. Thumbnails load lazily.
- TikToks form a single-video playlist with a directly available embedded player, no autoplay and immediate skipping using Next.
- The footer has a larger gold **Built by De’Juan Ellsworth** signature with a soft shimmer, decorative swaying turkeys on both sides, and a separate Family Developer / Engineer line.

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

1. Create a Supabase project. Run `supabase-setup.sql` **once**, then `migrations/20261021051504_shared_dish_signups.sql`, then `migrations/20261021175039_family_planning.sql`, then `migrations/20261022151147_rsvp_dietary_and_updated_at.sql`, in that order. The complete path is tested locally for fresh installations.
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

The implementation follows [TikTok's Embed Player documentation](https://developers.tiktok.com/docs/en/embed-player): `/player/v1/{id}`, `autoplay=0`, and `loop=0`. The embedded player is directly available as the section approaches the viewport. Visitors press Play inside the video or use **Next at any time**, including before playback, while paused or when a clip is unavailable. Navigation wraps to the first clip; a one-item playlist offers Reload video. There is no completion gate or separate blocked/unlocked fallback panel.

Replacing a video destroys its old iframe and audio context. Background polling preserves the active iframe and error feedback; hiding the tab sends a pause request. Error messages are accepted only from `https://www.tiktok.com`, from the current iframe window, and with the documented player marker. Messages from retired frames are ignored. Skipping clears the prior clip’s error and keeps autoplay disabled.

TikTok privacy settings, deleted clips, browser restrictions and availability remain outside the app’s control. The existing Open TikTok link remains available. Full HTTPS `tiktok.com/@creator/video/ID` links are supported; short links must first be expanded by the person sharing them. New submissions strip tracking parameters; stored URLs are preserved.

## Property photographs

The **Ellsworth Holiday Home feature image uses the exterior photo** of Friscoville Mansion. The five-photo house preview is followed immediately by one dropdown for the **remaining 21 listing photos**, in the same photo column. The redundant listing/photo links and separate gallery heading/description are removed. All 26 listing URLs have one gallery button and are available in the shared larger-image viewer.

**Explore house photos** starts collapsed directly beneath the preview. Opening it reveals these seven category dropdowns; each category stays collapsed until selected:

| Category | Photos |
| --- | ---: |
| Bedrooms | 4 |
| Bathrooms | 6 |
| Kitchen | 1 |
| Dining area | 1 |
| Outdoor areas | 6 |
| Laundry | 1 |
| Hallways & landing | 2 |

Photo IDs and public source room labels come from the original [Airbnb listing](https://www.airbnb.com/rooms/961414748638377724), extracted October 21, 2026. Photos labeled generically as “Additional photos” in the source were visually checked and given descriptive room categories/captions. Category counts refer to photos, not numbers of rooms. All 26 thumbnail and full-size URLs plus the exterior feature image returned HTTP 200 on October 22, 2026.

Category thumbnails are requested on first expansion; closed categories do not fetch their images. Native disclosure controls support pointer and keyboard use, and the viewer retains keyboard arrows, touch/swipe navigation, wraparound, focus containment and Escape. Thumbnails have alt text and visible captions. Images remain on Airbnb’s CDN; no property binaries, booking details or family photos are committed. No database migration is needed for this presentation update.

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

The Chromium integration suite mocks Supabase/Auth/Storage and external media using synthetic data. It checks database-confirmed UI feedback, multiple independent browser sessions, session restoration, full/removed/reclaimed states, custom dishes, responsive overflow at **375, 430, 768, 1024 and 1440px**, gallery controls and synthetic touch events, modal focus, photo upload/compression, photo links/slideshow, games, URL validation, trusted/untrusted playback messages, player retention on refresh, skipping before playback, navigation and consistent behavior across motion preferences. Screenshots are written to ignored `tests/artifacts/` with placeholder media.

See `tests/QA.md` for the recorded results and outstanding release checks. **Physical iOS Safari/Android, real TikTok playback, production sign-in and real Storage upload/signed URL behavior have not been validated by this automated suite.**

- Menu unavailable: verify the migration completed, Data API grants/schema exposure, family membership and network access. Never disable RLS to fix an error.
- A dish fills while a form is open: the database returns `full`; refresh and choose another item. No success is shown before confirmation.
- An old page reports an upgrade error: reload after V2 is published. Coordinate the short migration/frontend release window with the organizer.
- A missing photo: verify the external host or private bucket policy and refresh signed URLs. Do not make the private bucket public.
- A TikTok cannot play: use Next immediately or the Open TikTok link. No completion event is required to move on.

Implementation references: [Supabase database functions](https://supabase.com/docs/guides/database/functions), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Data API grant changes](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [anonymous sign-in](https://supabase.com/docs/guides/auth/auth-anonymous), and [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
