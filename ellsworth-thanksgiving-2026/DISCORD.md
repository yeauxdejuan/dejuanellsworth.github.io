# Private Discord activity alerts

These alerts use the existing Supabase database, Vault, pg_net and pg_cron, plus a Discord incoming webhook. They require no Nitro, Telegram bot, Twilio account, paid notification provider, Edge Function or additional server. Existing database resource limits still apply; no subscription upgrade or paid resource is created.

## Destination setup

1. In Discord on desktop/browser, create a **private normal text channel**, such as `#thanksgiving-alerts`, visible only to the organizer. Forum/media channels are not supported by this integration.
2. Go to **Server Settings → Integrations → Webhooks → New Webhook**, select that channel and copy its URL. [Discord instructions](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks).
3. In [Supabase Vault](https://supabase.com/dashboard/project/czlepxbftytqryhdduhm/integrations/vault/secrets), create a secret named **`ellsworth_discord_webhook_url`** whose value is the full URL. Do not place it in the website, GitHub, a public SQL file or chat. Vault is already installed and is not readable by site members.
4. In Discord, enable notifications for **All Messages** for that channel and allow Discord notifications on the organizer’s phone. Discord/device mute, desktop activity and Focus settings affect phone notifications. Family members do not need Discord.

## Install and activate

The additive migration is `migrations/20261024161008_discord_activity_alerts.sql`. It must follow the existing menu and family-feature migrations. It creates private configuration/outbox tables, nine activity triggers and one paused minute job. It installs **disabled**, with no backfill or outgoing request. Existing family records, application ownership rules and public grants are not modified.

The only SECURITY DEFINER function is the private row-trigger handler; it writes a minimal activity summary after a successful source write. Direct execution is revoked from all website roles. The other functions run as the project owner through SQL Editor or the owner’s cron job. The transient pg_net request/response tables and net/cron APIs are also inaccessible to site users; the webhook URL is only read from Vault inside owner-only delivery code.

After installation and saving the secret, the project owner can send a fixed connection test:

```sql
select ellsworth_private.test_discord_notifications() as request_id;
```

Check only the resulting status, without printing response content or URLs:

```sql
select id, status_code, timed_out, error_msg is not null as transport_error
from net._http_response where id = YOUR_REQUEST_ID;
```

A successful request returns HTTP 200 with `wait=true`. After confirming delivery, enable future-activity alerts:

```sql
select ellsworth_private.enable_discord_notifications();
```

Enabling requires a correctly formatted Discord webhook in Vault and starts the existing minute job. Re-enabling after a pause discards an old undelivered backlog. Only activity after activation is captured; old RSVPs/photos do not generate messages.

## What arrives

About once a minute, one short digest covers up to 100 pending events:

- New, changed and removed RSVPs: household name, response and guest count.
- New custom menu items, plus dish signup additions, edits and removals. A first signup that materializes a built-in dish does not also claim that the dish itself is new.
- Added photos, grouped into a count for a batch/minute.
- Photo reactions added or changed, grouped when several occur together. Reaction removals are silent.
- Game suggestions, added game votes, TikToks and photo caption updates. Vote removals are silent.

Single events can include a short name/dish description; multiple events of the same type become a count. Caption text, allergy/dietary information, notes, travel details, invitation codes, auth identifiers, and private photo URLs are excluded. The message links to the family board rather than attaching photos. Mentions are disabled, including `@everyone`, and link previews are suppressed.

Successful responses are recorded before a batch is considered delivered. A pending request is not immediately duplicated. Rate limits honor Retry-After with a minimum two-minute delay. Transport failures, server errors and lost requests are retried, up to five attempts per event. As with other webhook systems, an ambiguous timeout can cause a duplicate if Discord accepted a message but its response was lost. A 401/403/404 response pauses capture/delivery until the owner repairs the webhook and re-enables alerts. Notification queue failures never prevent the original family save.

Stored activity summaries are purged after seven days while the dispatcher runs. Disabling explicitly clears the private summary queue. Discord retains messages according to its own behavior and the organizer’s channel management. pg_net retains transient response metadata for its default six hours.

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

A request already handed to the network may still complete. Disable first when rotating or removing a webhook. Update the existing Vault secret instead of creating a second secret with the same name, then test and enable again. Do not drop existing family tables, modify membership policies, or replay earlier migrations.

## Verification

`npm run test:db` runs the actual trigger, queue, control and dispatcher SQL in disposable PostgreSQL. Only the transport/Vault/cron extension adapters are synthetic, so the tests send no external messages. Deployment additionally checks real extension/function signatures, permissions, the paused job and the fixed connection test. No frontend change or browser notification permission is required.

Sources: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net), [Supabase Cron](https://supabase.com/docs/guides/cron/install), [Discord webhook API](https://docs.discord.com/developers/resources/webhook).
