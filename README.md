# The Ellsworth Family — Thanksgiving 2026

A mobile-friendly, single-file Thanksgiving family website. The original design is preserved, with Ellsworth Family branding and a full optional GitHub Pages + Supabase shared-data setup.

**Venue:** [Friscoville Mansion on Airbnb](https://www.airbnb.com/rooms/961414748638377724), Arabi, LA. Its listing photos are displayed from Airbnb's external image CDN. The site deliberately excludes the home's street address, door codes, and reservation details.

## What is saved where?

| Information | When shared mode is enabled | In an unconfigured HTML preview |
|---|---|---|
| Menu additions, dish assignments, notes | Supabase Postgres (claimed dishes tied to member's device account) | Browser localStorage |
| Game suggestions | Supabase Postgres | Browser localStorage |
| TikTok links | Supabase Postgres; videos embedded from TikTok | Browser localStorage |
| Uploaded family photos + captions | Supabase PRIVATE Storage bucket + Postgres photo index | Browser IndexedDB |
| Added external photo URLs | Supabase Postgres | Browser localStorage |
| Airbnb photos, built-in games, starter dishes | Static `index.html` / Airbnb CDN | Static `index.html` / Airbnb CDN |

**Important:** The GitHub Pages HTML does not itself store shared data. Shared persistence starts **only after** you create/configure your Supabase project and family members join with the code. Existing preview-only changes will **not** be automatically migrated into the database.

## 1. Create a free Supabase project

1. Visit https://supabase.com/dashboard and create a project.
2. Open **SQL Editor** and run the entire provided `supabase-setup.sql` file. This creates protected tables, claim functions, a private photo bucket and membership policies.
3. Under **Authentication → Providers → Anonymous Sign-Ins**, enable **Anonymous Sign-Ins**. Family members can join without email, Google accounts, or SMTP. Anonymous sign-in creates a persistent account in **that browser**. A different device or cleared browser needs to join again.
4. **Create the actual family code privately**. In Supabase **SQL Editor only**, run the SQL below, replacing the example with a long, hard-to-guess code (at least 20–24 random characters recommended). **Do not store the live code in the repository or HTML.**

```sql
insert into public.ellsworth_invite (id, code_hash)
values (
  1,
  extensions.crypt('REPLACE-WITH-PRIVATE-RANDOM-24PLUS-CHARACTER-CODE', extensions.gen_salt('bf',10))
)
on conflict (id) do update set code_hash = excluded.code_hash;
```

5. Share the *actual* code through a trusted family channel. Anybody with a valid code can join and then read or contribute family content. If a code leaks, rotate it using the same SQL statement **and revoke existing memberships if necessary** (changing the code does not revoke people who already joined):

```sql
-- CAUTION: This disconnects everyone, including you. All members must rejoin.
delete from public.ellsworth_members;
```

## 2. Connect your HTML to Supabase

Open `index.html` and find this block near the top of the JavaScript:

```js
const FAMILY_CONFIG = {
  url: '',
  publishableKey: '',
  eventId: 'ellsworth-thanksgiving-2026',
  photoBucket: 'ellsworth-family-photos'
};
```

Fill in only the **Project URL** and **publishable key** (a legacy anon key is also suitable) from the Supabase project's **Connect** screen or **Project Settings → API Keys**.

```js
const FAMILY_CONFIG = {
  url: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'YOUR_SUPABASE_PUBLISHABLE_KEY',
  eventId: 'ellsworth-thanksgiving-2026',
  photoBucket: 'ellsworth-family-photos'
};
```

The public/publishable key is meant to appear in browser code. **Never put a Supabase `service_role`, `sb_secret_...`, or database password in the HTML or GitHub.** The database's Row Level Security controls what the public key can access.

## 3. Host on GitHub Pages for free

1. Create a **public** repository, such as `ellsworth-thanksgiving`.
2. Add `index.html` from this folder to the repository root. Optionally add the README and the **unmodified, secret-free** schema SQL. Do NOT commit your actual family invitation code.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select **main** and **/(root)**, then **Save**.
4. GitHub will provide a site like `https://YOUR_USERNAME.github.io/ellsworth-thanksgiving/`.
5. Open the link; you'll see the **Ellsworth Family access** panel. Enter the invitation code, then claim a test dish. Verify another browser can join with the same code and see the assignment.

No Node.js build, CI runner, npm or server hosting is required. The HTML fetches the Supabase JavaScript client from its CDN, so the site needs internet. Hosting on GitHub Pages is **public** even when family data is behind Supabase rules: the page layout and Airbnb property information are visible to anyone with the URL.

## 4. Family use

- Members open the link, enter the private invitation code once on their current device/browser, and use the shared board. Changes sync automatically while the tab is active; there is also a **Refresh menu** button.
- Assigned dishes cannot be overwritten by a different member's login until the original member releases them. If someone switches devices, the organizer can reset a stale claim in Supabase's Table Editor.
- Uploaded family pictures are compressed to JPEG (~1,800px long side), put in a **private bucket**, and accessed via temporary signed URLs for authorized members. Signed URLs can still be forwarded to others while they are valid; do not assume they are impossible to share.
- Game ideas and full TikTok links are saved to the shared board. TikTok controls availability/embeddability of its videos.
- **Disconnect this device** signs out locally. Since Supabase anonymous accounts cannot simply be recovered after sign-out, the family code is required to rejoin. The user's prior dish claims remain tied to the old device account until an organizer resets them.

## Cost / practical limits (verified October 2026)

GitHub Pages can publish static content from a public GitHub Free repository. Supabase Free currently includes **500 MB database storage, 1 GB file storage, and 5 GB egress**. This is typically adequate for a small family gathering, but the photo gallery will be the main quota consumer. Free projects **may pause after 7 days of inactivity**; the owner can resume them in Supabase. Monitor storage and egress, and export family photos/data separately for long-term keepsakes.

References:

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://supabase.com/docs/guides/auth/auth-anonymous
- https://supabase.com/docs/guides/storage/security/access-control

## Privacy and practical notes

1. **The invitation code is actual authorization, not a cosmetic text prompt:** it is checked inside Supabase SQL. The hash is kept in a table with no client-side read policies. Database tables and the photo bucket have member-only RLS policies.
2. Anonymous sign-in is a convenience, **not verified identity**. Someone who receives the code can join; anyone borrowing a member's device may use their session. Use a long random code and share it privately. For stronger identity, add email/OAuth accounts and a vetted member allowlist later.
3. Anyone can view the publicly hosted HTML and Airbnb gallery. Do not add street addresses, door codes, reservation numbers or other private details to the page source.
4. The included venue section uses Airbnb's externally hosted listing photos with a source link. These images may stop working if Airbnb moves or restricts them. Confirm visitor/gathering rules and the booking arrangement with the host before relying on the venue for a large dinner.
5. External photo URLs inserted by members are not automatically private, even though their database records are protected. The originals remain at their external host.
6. This is not a guaranteed permanent backup; periodically download your family photos and export the small Postgres tables from Supabase.
