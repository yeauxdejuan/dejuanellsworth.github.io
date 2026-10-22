-- Read-only deployment check. Every row should report true for all four checks.
-- Run against the target Supabase project before publishing the frontend.
-- No invitation codes, member records or private photos are read.
with required(table_name, write_privileges) as (
  values ('thanksgiving_rsvps','INSERT,UPDATE,DELETE'),
         ('thanksgiving_game_votes','INSERT,DELETE'),
         ('thanksgiving_photo_details','INSERT,UPDATE'),
         ('thanksgiving_photo_reactions','INSERT,UPDATE,DELETE')
)
select r.table_name,
       c.oid is not null as installed,
       coalesce(c.relrowsecurity, false) as rls_enabled,
       coalesce(has_table_privilege('authenticated', c.oid, 'SELECT'), false)
       and not coalesce(has_table_privilege('anon', c.oid, 'SELECT'), true) as member_only_grants,
       not exists (
         select 1 from unnest(string_to_array(r.write_privileges, ',')) as privilege
         where not coalesce(has_table_privilege('authenticated', c.oid, privilege), false)
       ) as member_write_grants
from required r
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid and c.relname = r.table_name
order by r.table_name;

-- RSVP rollout fields: all three results must be true as well.
select exists(select 1 from information_schema.columns where table_schema='public'
         and table_name='thanksgiving_rsvps' and column_name='dietary_needs') as dietary_field_installed,
       exists(select 1 from information_schema.columns where table_schema='public'
         and table_name='thanksgiving_rsvps' and column_name='updated_at') as save_time_installed,
       exists(select 1 from pg_trigger where tgrelid=to_regclass('public.thanksgiving_rsvps')
         and tgname='thanksgiving_rsvps_updated_at' and tgenabled='O' and not tgisinternal) as server_timestamp_trigger;
