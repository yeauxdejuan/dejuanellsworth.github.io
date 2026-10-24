-- Keep Discord activity summaries without an appended website link.
begin;
set local lock_timeout = '5s';
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
  select '🦃 Ellsworth updates' || E'\n' || string_agg('• ' || line,E'\n' order by kind) into content
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

commit;
