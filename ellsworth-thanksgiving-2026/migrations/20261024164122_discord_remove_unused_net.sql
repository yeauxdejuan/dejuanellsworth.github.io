-- The bootstrap enabled pg_net, but final Discord delivery uses the owner-only HTTP worker.
-- Remove only that unused extension, with no CASCADE and no family table changes.
begin;
set local lock_timeout = '5s';
do $$ begin
  if position('net.http_post' in pg_get_functiondef('ellsworth_private.dispatch_discord_notifications()'::regprocedure)) > 0
    or position('net.http_post' in pg_get_functiondef('ellsworth_private.test_discord_notifications()'::regprocedure)) > 0 then
    raise exception 'Install the private HTTP transport before removing the unused queue extension';
  end if;
  if exists(select 1 from net.http_request_queue) then
    raise exception 'The shared HTTP queue is not empty; review pending work before cleanup';
  end if;
  if exists(select 1 from cron.job where active and command ~ 'net[[:space:]]*[.]') then
    raise exception 'An active cron job uses the queue extension; review it before cleanup';
  end if;
  if exists(select 1 from pg_trigger t join pg_proc p on p.oid=t.tgfoid join pg_namespace n on n.oid=p.pronamespace
      where not t.tgisinternal and n.nspname='supabase_functions' and p.proname='http_request') then
    raise exception 'A database webhook uses the queue extension; review it before cleanup';
  end if;
end $$;
drop extension if exists pg_net;
commit;
