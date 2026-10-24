-- Private Discord activity summaries. Installs disabled; no historical backfill.
-- Store only the incoming webhook URL in Vault as ellsworth_discord_webhook_url.
begin;
set local lock_timeout = '5s';
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists supabase_vault with schema vault;
-- pg_net temporarily holds the webhook URL; it must never be readable by site users.
revoke all on net.http_request_queue, net._http_response from public, anon, authenticated;
revoke all on schema net, cron from public, anon, authenticated;
revoke all on all functions in schema net from public, anon, authenticated;
revoke all on all functions in schema cron from public, anon, authenticated;

create table ellsworth_private.discord_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  last_state text not null default 'disabled'
);
insert into ellsworth_private.discord_settings default values;
create table ellsworth_private.discord_outbox (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('rsvp','dish','signup','photo','reaction','game','tiktok','vote','caption')),
  summary text not null check (char_length(summary) between 1 and 250),
  created_at timestamptz not null default now(),
  available_after timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 0 and 5),
  request_id bigint,
  requested_at timestamptz,
  delivered_at timestamptz,
  last_status integer
);
create index discord_pending_idx on ellsworth_private.discord_outbox(created_at,id)
  where delivered_at is null and request_id is null and attempts < 5;
create index discord_requests_idx on ellsworth_private.discord_outbox(request_id)
  where delivered_at is null and request_id is not null;
create index discord_retention_idx on ellsworth_private.discord_outbox(created_at);
alter table ellsworth_private.discord_settings enable row level security;
alter table ellsworth_private.discord_outbox enable row level security;
revoke all on ellsworth_private.discord_settings, ellsworth_private.discord_outbox from public, anon, authenticated;
revoke all on sequence ellsworth_private.discord_outbox_id_seq from public, anon, authenticated;

-- Ordinary site members cannot read the URL or invoke any notification function.
create function ellsworth_private.discord_webhook_url() returns text
language plpgsql security invoker set search_path = '' as $$
declare endpoint text;
begin
  select btrim(decrypted_secret) into endpoint from vault.decrypted_secrets
    where name = 'ellsworth_discord_webhook_url';
  if endpoint is null or endpoint !~ '^https://discord[.]com/api/(v[0-9]+/)?webhooks/[0-9]+/[A-Za-z0-9_-]+/?$' then
    raise exception 'Save a valid Discord incoming webhook in Vault as ellsworth_discord_webhook_url';
  end if;
  return rtrim(endpoint,'/');
end;
$$;
revoke all on function ellsworth_private.discord_webhook_url() from public, anon, authenticated;

create function ellsworth_private.capture_discord_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb; before_row jsonb; actor text; dish text; event_kind text; message text;
begin
  if not (select enabled from ellsworth_private.discord_settings where singleton) then return null; end if;
  if TG_OP = 'DELETE' then r := to_jsonb(old); else r := to_jsonb(new); end if;
  if r->>'event_id' is distinct from 'ellsworth-thanksgiving-2026' then return null; end if;
  if TG_OP = 'UPDATE' then
    before_row := to_jsonb(old);
    if (r - 'updated_at') is not distinct from (before_row - 'updated_at') then return null; end if;
  end if;
  select household_name into actor from public.thanksgiving_rsvps
    where event_id = 'ellsworth-thanksgiving-2026' and user_id = auth.uid();
  actor := coalesce(actor,'A family member');
  case TG_TABLE_NAME
    when 'thanksgiving_rsvps' then
      event_kind := 'rsvp';
      message := (r->>'household_name') || case when TG_OP = 'DELETE' then ' removed their RSVP.'
        else ' RSVP: ' || case r->>'response' when 'coming' then 'Coming' when 'maybe' then 'Maybe' else 'Can’t make it' end
          || case when r->>'response' = 'declined' then '' else ' · ' || ((r->>'adults')::int + (r->>'children')::int)::text || ' guests' end end;
    when 'thanksgiving_dishes' then
      -- First claims materialize built-in dishes; those are not newly suggested items.
      if r->>'id' in ('turkey','ham','dressing','mac','greens','yams','rice','potatoes','jambalaya','rolls','pie','cake','drinks','plates') then return null; end if;
      event_kind := 'dish'; message := actor || ' added a menu item: ' || (r->>'label');
    when 'thanksgiving_dish_signups' then
      if TG_OP = 'UPDATE' and r->>'assignee' is not distinct from before_row->>'assignee'
        and r->>'note' is not distinct from before_row->>'note' then return null; end if;
      select label into dish from public.thanksgiving_dishes
        where event_id = r->>'event_id' and id = r->>'dish_id';
      event_kind := 'signup'; message := (r->>'assignee') || case TG_OP when 'DELETE' then ' removed a dish signup: '
        when 'UPDATE' then ' updated a dish signup: ' else ' signed up to bring: ' end || coalesce(dish,'a family dish');
    when 'thanksgiving_photos' then event_kind := 'photo'; message := 'A family photo was added.';
    when 'thanksgiving_photo_reactions' then event_kind := 'reaction'; message := 'A photo reaction was added or changed.';
    when 'thanksgiving_games' then event_kind := 'game'; message := actor || ' suggested a game: ' || (r->>'name');
    when 'thanksgiving_tiktoks' then event_kind := 'tiktok'; message := actor || ' added a TikTok.';
    when 'thanksgiving_game_votes' then event_kind := 'vote'; message := actor || ' voted for a game.';
    when 'thanksgiving_photo_details' then
      if TG_OP = 'UPDATE' and r->>'caption' is not distinct from before_row->>'caption' then return null; end if;
      event_kind := 'caption'; message := 'A photo caption was updated.';
    else return null;
  end case;
  -- No invitation codes, notes, dietary/travel details, or private photo URLs leave the DB.
  insert into ellsworth_private.discord_outbox(kind,summary)
    values (event_kind,left(regexp_replace(message,'[[:cntrl:]]',' ','g'),250));
  return null;
exception when others then
  -- Notification trouble must never prevent an RSVP, signup, or photo save.
  raise warning 'Ellsworth activity notification could not be queued';
  return null;
end;
$$;
revoke all on function ellsworth_private.capture_discord_activity() from public, anon, authenticated;

create trigger discord_activity after insert or update or delete on public.thanksgiving_rsvps
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert on public.thanksgiving_dishes
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert or update or delete on public.thanksgiving_dish_signups
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert on public.thanksgiving_photos
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert or update on public.thanksgiving_photo_reactions
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert on public.thanksgiving_games
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert on public.thanksgiving_tiktoks
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert on public.thanksgiving_game_votes
  for each row execute function ellsworth_private.capture_discord_activity();
create trigger discord_activity after insert or update on public.thanksgiving_photo_details
  for each row execute function ellsworth_private.capture_discord_activity();

create function ellsworth_private.dispatch_discord_notifications() returns void
language plpgsql security invoker set search_path = '' as $$
declare endpoint text; pending record; response record; ids bigint[]; content text; request bigint; delay_seconds int;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('ellsworth_discord_notifications',0)) then return; end if;
  delete from ellsworth_private.discord_outbox where created_at < now() - interval '7 days';
  if not (select enabled from ellsworth_private.discord_settings where singleton) then return; end if;
  for pending in select request_id,min(requested_at) as started from ellsworth_private.discord_outbox
    where delivered_at is null and request_id is not null group by request_id loop
    select status_code,timed_out,error_msg,headers into response from net._http_response where id = pending.request_id;
    if not found and pending.started > now() - interval '5 minutes' then continue; end if;
    if response.status_code between 200 and 299 and not coalesce(response.timed_out,false) and response.error_msg is null then
      update ellsworth_private.discord_outbox set delivered_at = now(),last_status = response.status_code where request_id = pending.request_id;
      update ellsworth_private.discord_settings set last_state = 'delivered' where singleton;
    else
      delay_seconds := 120;
      if response.status_code = 429 and coalesce(response.headers->>'retry-after',response.headers->>'Retry-After','') ~ '^[0-9]{1,4}([.][0-9]+)?$' then
        delay_seconds := greatest(120,ceil(coalesce(response.headers->>'retry-after',response.headers->>'Retry-After')::numeric)::int);
      end if;
      update ellsworth_private.discord_outbox set request_id = null,requested_at = null,
        available_after = now() + make_interval(secs => delay_seconds),last_status = response.status_code where request_id = pending.request_id;
      update ellsworth_private.discord_settings set last_state = 'retry_pending' where singleton;
      if response.status_code in (401,403,404) then
        update ellsworth_private.discord_settings set enabled = false,last_state = 'webhook_rejected' where singleton;
        return;
      end if;
    end if;
  end loop;
  if exists(select 1 from ellsworth_private.discord_outbox where delivered_at is null and request_id is not null) then return; end if;
  begin endpoint := ellsworth_private.discord_webhook_url();
  exception when others then
    update ellsworth_private.discord_settings set last_state = 'missing_or_invalid_webhook' where singleton; return;
  end;
  select array_agg(id order by created_at,id) into ids from (
    select id,created_at from ellsworth_private.discord_outbox where delivered_at is null and request_id is null
      and attempts < 5 and available_after <= now() order by created_at,id limit 100
  ) selected;
  if ids is null then return; end if;
  select '🦃 Ellsworth updates' || E'\n' || string_agg('• ' || line,E'\n' order by kind) || E'\n\n'
    || '<https://yeauxdejuan.github.io/dejuanellsworth.github.io/ellsworth-thanksgiving-2026/>' into content
    from (select kind,case when count(*) = 1 then left(min(summary),80) else count(*)::text || ' ' || case kind
      when 'rsvp' then 'RSVP changes' when 'dish' then 'new menu items' when 'signup' then 'dish signup changes'
      when 'photo' then 'family photos added' when 'reaction' then 'photo reactions added or changed'
      when 'game' then 'game suggestions' when 'tiktok' then 'TikToks added' when 'vote' then 'game votes added'
      when 'caption' then 'photo captions updated' end end as line
      from ellsworth_private.discord_outbox where id = any(ids) group by kind) groups;
  request := net.http_post(url := endpoint || '?wait=true',body := jsonb_build_object(
    'content',content,'username','Ellsworth Family','allowed_mentions',jsonb_build_object('parse',jsonb_build_array()),'flags',4
  ),timeout_milliseconds := 5000);
  update ellsworth_private.discord_outbox set request_id = request,requested_at = now(),attempts = attempts + 1 where id = any(ids);
  update ellsworth_private.discord_settings set last_state = 'queued' where singleton;
end;
$$;
revoke all on function ellsworth_private.dispatch_discord_notifications() from public, anon, authenticated;

-- These controls are for the project owner in SQL Editor, never the family website.
create function ellsworth_private.enable_discord_notifications() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  perform ellsworth_private.discord_webhook_url();
  if not (select enabled from ellsworth_private.discord_settings where singleton) then
    delete from ellsworth_private.discord_outbox where delivered_at is null;
  end if;
  update ellsworth_private.discord_settings set enabled = true,last_state = 'enabled' where singleton;
  perform cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ellsworth-discord-alerts'),active := true);
end;
$$;
create function ellsworth_private.disable_discord_notifications() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  update ellsworth_private.discord_settings set enabled = false,last_state = 'disabled' where singleton;
  delete from ellsworth_private.discord_outbox;
  perform cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ellsworth-discord-alerts'),active := false);
end;
$$;
create function ellsworth_private.test_discord_notifications() returns bigint
language sql security invoker set search_path = '' as $$
  select net.http_post(url := ellsworth_private.discord_webhook_url() || '?wait=true',body := jsonb_build_object(
    'content','🦃 Ellsworth notifications connected. New family activity will appear here.',
    'username','Ellsworth Family','allowed_mentions',jsonb_build_object('parse',jsonb_build_array()),'flags',4
  ),timeout_milliseconds := 5000);
$$;
revoke all on function ellsworth_private.enable_discord_notifications() from public, anon, authenticated;
revoke all on function ellsworth_private.disable_discord_notifications() from public, anon, authenticated;
revoke all on function ellsworth_private.test_discord_notifications() from public, anon, authenticated;

select cron.schedule('ellsworth-discord-alerts','* * * * *','select ellsworth_private.dispatch_discord_notifications();');
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ellsworth-discord-alerts'),active := false);
commit;
