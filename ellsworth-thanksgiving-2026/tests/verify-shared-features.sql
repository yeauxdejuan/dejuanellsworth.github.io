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
