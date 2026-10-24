# Private Discord activity alerts

These alerts use the existing Supabase database, Vault, pg_cron and the HTTP extension, plus a Discord incoming webhook. They require no Nitro, Telegram bot, Twilio account, paid notification provider, Edge Function or additional server. Existing database resource limits still apply; no subscription upgrade or paid resource is created.

## Destination setup

1. In Discord on desktop/browser, create a **private normal text channel**, such as `#thanksgiving-alerts`, visible only to the organizer. Forum/media channels are not supported by this integration.
2. Go to **Server Settings → Integrations → Webhooks → New Webhook**, select that channel and copy its URL. [Discord instructions](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
3. In [Supabase Vault](https://supabase.com/dashboard/project/czlepxbftytqryhdduhm/integrations/vault/secrets), create a secret named **`ellsworth_discord_webhook_url`** whose value is the full URL. Do not place it in the website, GitHub, a public SQL file or chat. Vault is already installed and is not readable by site members.
4. In Discord, enable notifications for **All Messages** for that channel and allow Discord notifications on the organizer’s phone. Discord/device mute, desktop activity and Focus settings affect phone notifications. Family members do not need Discord.

## Install and activate

Apply `migrations/20261024161008_discord_activity_alerts.sql`, then **`migrations/20261024163338_discord_private_http_transport.sql`** before testing or enabling delivery. Both migrations are already installed in the configured project (recorded as `20261024162724_discord_activity_alerts` and `20261024163805_discord_private_http_transport`); never replay them. Alerts are enabled, the connection test returned HTTP 200, and successful scheduled delivery is verified. The second migration corrected a hosted permission difference found before any webhook was sent.

The private outbox and activity triggers capture only new committed activity while enabled. Cron processes it in the background. The final transport reads the webhook from Vault directly into an owner-only HTTP call, with a two-second connection limit and five-second total limit. It does **not** place the secret URL or message in pg_net’s platform-managed shared queue. The synchronous network wait occurs only in the separate scheduled worker, never in a family RSVP/photo/menu save.

The bootstrap’s permission revocations do not override all platform-owned pg_net grants on hosted Supabase. Treat that queue and its APIs as shared; the corrected transport deliberately does not use them. Do not enable the old queued transport. The unused pg_net extension remains installed: automatic review declined optional removal because dropping a production extension could affect dependencies. Leaving it unused is the chosen safer alternative. Its [extension-in-public advisory](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) remains; no Discord credential or message is placed in its tables. The only SECURITY DEFINER notification function is the private capture trigger, with direct execution revoked from website roles. Dispatch, setup, status and test controls are owner-only. No secret is in client code or GitHub.

After both migrations and saving the secret, the project owner can send a fixed connection test:

```sql
select ellsworth_private.test_discord_notifications() as http_status;
```

The final test returns **HTTP 200** after Discord confirms the message. A null result indicates a caught transport/configuration failure; it deliberately does not expose secret-bearing errors. After confirming delivery, enable future-activity alerts:

```sql
select ellsworth_private.enable_discord_notifications();
```

Enabling requires a correctly formatted Discord webhook and starts the existing minute job. Re-enabling after a pause discards an old undelivered backlog. Old RSVPs/photos do not generate messages.

## What arrives

About once a minute, one short digest covers up to 100 pending events:

- New, changed and removed RSVPs: household name, response and guest count.
- New custom menu items, plus dish signup additions, edits and removals. A first signup that materializes a built-in dish does not also claim that the dish itself is new.
- Added photos, grouped into a count for a batch/minute.
- Photo reactions added or changed, grouped when several occur together. Reaction removals are silent.
- Game suggestions, added game votes, TikToks and photo caption updates. Vote removals are silent.

Single events can include a short name/dish description; multiple events of the same type become a count. Caption text, allergy/dietary information, notes, travel details, invitation codes, auth identifiers, and private photo URLs are excluded. Messages contain the activity summary without a website link or photo attachments. Mentions are disabled, including `@everyone`, and link previews are suppressed.

Successful responses mark the selected batch delivered before the worker returns. An advisory lock prevents overlapping dispatchers. Rate limits honor Retry-After with a minimum two-minute delay. Transport failures and server errors are retried, up to five attempts per event. As with other webhook systems, an ambiguous timeout can cause a duplicate if Discord accepted a message but its response was lost. A 401/403/404 response pauses capture/delivery until the owner repairs the webhook and re-enables alerts. Notification queue failures never prevent the original family save.

Stored activity summaries are purged after seven days while the dispatcher runs. Disabling explicitly clears the private summary queue. Discord retains messages according to its own behavior and the organizer’s channel management. The final transport does not persist Discord response bodies or the secret request URL in shared transport tables.

## Owner status and pause

These read-only checks expose no webhook or family message text:

```sql
select enabled,last_state from ellsworth_private.discord_settings;
select jobname,schedule,active from cron.job where jobname='ellsworth-discord-alerts';
select count(*) filter(where delivered_at is null and attempts<5) as pending,
       count(*) filter(where delivered_at is not null) as delivered,
       count(*) filter(where delivered_at is null and attempts=5) as exhausted
from ellsworth_private.discord_outbox;
```

To pause notifications without affecting the family app:

```sql
select ellsworth_private.disable_discord_notifications();
```

A worker request already in progress may still complete; completing it cannot accidentally re-enable a paused integration. Disable first when rotating or removing a webhook. Update the existing Vault secret instead of creating a second secret with the same name, then test and enable again. Do not drop existing family tables, modify membership policies, or replay earlier migrations.

## Verification

`npm run test:db` runs the actual trigger, queue, control and dispatcher SQL in disposable PostgreSQL. Only the transport/Vault/cron extension adapters are synthetic, so the tests send no external messages. The final transport tests explicitly reproduce hosted pg_net PUBLIC grants and verify no webhook request enters that queue. Deployment additionally checks real extension/function signatures, permissions, the paused job and the fixed connection test. No frontend change or browser notification permission is required.

Sources: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [HTTP extension](https://supabase.com/docs/guides/database/extensions/http), [Supabase Cron](https://supabase.com/docs/guides/cron/install), [Discord webhook API](https://docs.discord.com/developers/resources/webhook).
