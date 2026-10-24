-- Additive transport correction: never put the private webhook into pg_net queues.
-- Only the scheduled owner worker makes synchronous HTTP calls; family saves only enqueue.
begin;
set local lock_timeout = '5s';
create extension if not exists http with schema extensions;

create function ellsworth_private.post_discord_message(message text)
returns table(status integer,retry_seconds integer)
language plpgsql security invoker set search_path = '' as $$
declare endpoint text; response record; retry_text text; delay_seconds integer := 120;
begin
  endpoint := ellsworth_private.discord_webhook_url();
  perform set_config('http.curlopt_connecttimeout_ms','2000',true);
  perform set_config('http.curlopt_timeout_ms','5000',true);
  select h.status,h.content into response from extensions.http_post(endpoint || '?wait=true',jsonb_build_object(
    'content',message,'username','Ellsworth Family','allowed_mentions',jsonb_build_object('parse',jsonb_build_array()),'flags',4
  )::text,'application/json') h;
  if response.status = 429 then
    begin
      retry_text := response.content::jsonb->>'retry_after';
      if retry_text ~ '^[0-9]{1,6}([.][0-9]+)?$' then delay_seconds := greatest(120,ceil(retry_text::numeric)::integer); end if;
    exception when others then null;
    end;
  end if;
  return query select response.status::integer,delay_seconds;
exception when others then
  -- Never return/log a transport error which could contain the secret URL.
  return query select null::integer,120;
end;
$$;
revoke all on function ellsworth_private.post_discord_message(text) from public, anon, authenticated;

create or replace function ellsworth_private.dispatch_discord_notifications() returns void
language plpgsql security invoker set search_path = '' as $$
declare ids bigint[]; content text; response record;
begin
  if not pg_try_advisory_xact_lock(hashtextextended('ellsworth_discord_notifications',0)) then return; end if;
  delete from ellsworth_private.discord_outbox where created_at < now() - interval '7 days';
  if not (select enabled from ellsworth_private.discord_settings where singleton) then return; end if;
  select array_agg(id order by created_at,id) into ids from (
    select id,created_at from ellsworth_private.discord_outbox where delivered_at is null
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
  select * into response from ellsworth_private.post_discord_message(content);
  update ellsworth_private.discord_outbox set request_id = null,requested_at = now(),attempts = attempts + 1,
    last_status = response.status,delivered_at = case when response.status between 200 and 299 then now() else null end,
    available_after = now() + make_interval(secs => response.retry_seconds) where id = any(ids);
  update ellsworth_private.discord_settings set last_state = case when response.status between 200 and 299 then 'delivered'
    when response.status in (401,403,404) then 'webhook_rejected' else 'retry_pending' end,
    enabled = response.status is null or response.status not in (401,403,404) where singleton and enabled;
end;
$$;
revoke all on function ellsworth_private.dispatch_discord_notifications() from public, anon, authenticated;

-- Same owner-only control name; the bigint result is now the HTTP status, not a request ID.
create or replace function ellsworth_private.test_discord_notifications() returns bigint
language sql security invoker set search_path = '' as $$
  select status::bigint from ellsworth_private.post_discord_message(
    '🦃 Ellsworth notifications connected. New family activity will appear here.'
  );
$$;
revoke all on function ellsworth_private.test_discord_notifications() from public, anon, authenticated;
commit;
