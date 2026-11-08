-- Additive: private Discord alert when the public API (PostgREST) stops answering.
-- Why: on 2026-11-05 PostgREST hung (PGRST003 pool timeouts) while Postgres stayed healthy, so the
-- family saw "Family access is unavailable" for 3 days. A check inside the database cannot see that,
-- so the cron worker calls the site's own public API over HTTP, like a family browser does.
-- Requires the Discord transport migrations (post_discord_message, Vault webhook). No new service.
begin;
set local lock_timeout = '5s';

-- Public probe: no table access, no data. PostgREST needs a pool connection to answer it.
create function public.api_health() returns boolean
language sql stable security invoker set search_path = '' as $$ select true $$;
revoke all on function public.api_health() from public;
grant execute on function public.api_health() to anon, authenticated;

create table ellsworth_private.api_health_state (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  -- Public values only (the same URL and publishable key as index.html).
  probe_url text not null check (probe_url ~ '^https://[a-z0-9]+[.]supabase[.]co/rest/v1/rpc/api_health$'),
  probe_key text not null check (probe_key ~ '^sb_publishable_[A-Za-z0-9_-]+$'),
  failures_to_alert integer not null default 2 check (failures_to_alert between 1 and 12),
  consecutive_failures integer not null default 0,
  alerted boolean not null default false,
  down_since timestamptz,
  last_status integer,
  last_checked_at timestamptz,
  last_alert_at timestamptz
);
revoke all on ellsworth_private.api_health_state from public, anon, authenticated;
insert into ellsworth_private.api_health_state(probe_url, probe_key) values (
  'https://czlepxbftytqryhdduhm.supabase.co/rest/v1/rpc/api_health',
  'sb_publishable_l-QXOLYaH4kbqqDnC9Pwww_MBbxnLNV'
);

-- Returns the HTTP status, or null on a timeout/transport error. Tests replace only this adapter.
create function ellsworth_private.probe_public_api(url text, apikey text) returns integer
language plpgsql security invoker set search_path = '' as $$
declare response record;
begin
  perform set_config('http.curlopt_connecttimeout_ms', '2000', true);
  perform set_config('http.curlopt_timeout_ms', '5000', true);
  select h.status into response from extensions.http((
    'POST', url, array[extensions.http_header('apikey', apikey)], 'application/json', '{}'
  )::extensions.http_request) h;
  return response.status;
exception when others then
  return null;
end;
$$;
revoke all on function ellsworth_private.probe_public_api(text, text) from public, anon, authenticated;

create function ellsworth_private.check_api_health() returns integer
language plpgsql security invoker set search_path = '' as $$
declare s record; probe_status integer; sent integer; down_text text; minutes integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('ellsworth-api-health')) then return null; end if;
  select * into s from ellsworth_private.api_health_state where id = 1 for update;
  if not found or not s.enabled then return null; end if;

  probe_status := ellsworth_private.probe_public_api(s.probe_url, s.probe_key);

  if probe_status = 200 then
    if s.alerted then
      minutes := greatest(1, ceil(extract(epoch from now() - s.down_since) / 60)::integer);
      select status into sent from ellsworth_private.post_discord_message(
        '✅ Family board API recovered after about ' || minutes || ' min. Family members can join and edit again.'
      );
      -- Keep the alert state until Discord confirms, so the recovery message is retried.
      if sent between 200 and 299 then
        update ellsworth_private.api_health_state set alerted = false, down_since = null, last_alert_at = now() where id = 1;
      end if;
    else
      update ellsworth_private.api_health_state set down_since = null where id = 1;
    end if;
    update ellsworth_private.api_health_state
      set consecutive_failures = 0, last_status = 200, last_checked_at = now() where id = 1;
    return probe_status;
  end if;

  update ellsworth_private.api_health_state set
    consecutive_failures = consecutive_failures + 1,
    down_since = coalesce(down_since, now()),
    last_status = probe_status,
    last_checked_at = now()
  where id = 1 returning * into s;

  -- First alert after N failures in a row, then a reminder every 6 hours while it stays down.
  if s.consecutive_failures >= s.failures_to_alert
     and (not s.alerted or s.last_alert_at < now() - interval '6 hours') then
    down_text := to_char(s.down_since at time zone 'America/Chicago', 'Mon FMDD FMHH12:MI AM') || ' CT';
    select status into sent from ellsworth_private.post_discord_message(
      case when s.alerted then '⏰ Still down: ' else '⚠️ ' end
      || 'Family board API is not answering (' || coalesce('HTTP ' || probe_status, 'timeout') || ') since ' || down_text
      || '. Family members see "Family access is unavailable". Fix: Supabase Dashboard → Project Settings → General → Restart project.'
    );
    if sent between 200 and 299 then
      update ellsworth_private.api_health_state set alerted = true, last_alert_at = now() where id = 1;
    end if;
  end if;
  return probe_status;
end;
$$;
revoke all on function ellsworth_private.check_api_health() from public, anon, authenticated;

-- Every 5 minutes: alert within ~10 minutes. Each check waits at most 5 seconds.
select cron.schedule('ellsworth-api-health', '*/5 * * * *', 'select ellsworth_private.check_api_health();');
commit;
