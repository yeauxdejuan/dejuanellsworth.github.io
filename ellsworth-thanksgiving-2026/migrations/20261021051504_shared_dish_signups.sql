-- V2: review and apply once BEFORE publishing the V2 frontend.
-- Additive data migration: no existing dish, assignment, photo or member is deleted.
-- Existing legacy fields remain an immutable snapshot. Do not rerun the V1 setup.
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- Stop a repeated application instead of resurrecting a migrated claim later released.
do $$ begin
  if to_regclass('public.thanksgiving_dish_signups') is not null then
    raise exception 'V2 signups already installed; do not replay the backfill';
  end if;
end $$;

-- Block old clients during the snapshot and privilege transition.
lock table public.thanksgiving_dishes in share row exclusive mode;
create schema if not exists ellsworth_private;
revoke all on schema ellsworth_private from public, anon, authenticated;
grant usage on schema ellsworth_private to authenticated;

create table public.thanksgiving_dish_signups (
  event_id text not null check (event_id = 'ellsworth-thanksgiving-2026'),
  dish_id text not null,
  slot smallint not null check (slot between 1 and 3),
  user_id uuid references auth.users(id) on delete set null,
  assignee text not null check (char_length(btrim(assignee)) between 1 and 75),
  note text not null default '' check (char_length(note) <= 130),
  created_at timestamptz not null default now(),
  primary key (event_id, dish_id, slot),
  unique (event_id, dish_id, user_id),
  foreign key (event_id, dish_id) references public.thanksgiving_dishes(event_id, id)
);
create index thanksgiving_dish_signups_user_idx
  on public.thanksgiving_dish_signups(user_id);

-- Ownerless legacy assignments still occupy one slot; only an organizer may resolve them.
-- This also preserves claims with an account but a missing display name.
insert into public.thanksgiving_dish_signups
  (event_id, dish_id, slot, user_id, assignee, note, created_at)
select event_id, id, 1, claimed_by,
       coalesce(nullif(btrim(assignee), ''), 'Family member (legacy)'),
       coalesce(note, ''), updated_at
from public.thanksgiving_dishes
where nullif(btrim(assignee), '') is not null or claimed_by is not null;

alter table public.thanksgiving_dish_signups enable row level security;
revoke all on public.thanksgiving_dish_signups from public, anon, authenticated;
grant select on public.thanksgiving_dish_signups to authenticated;
create policy "Family members read event signups" on public.thanksgiving_dish_signups
  for select to authenticated
  using (event_id = 'ellsworth-thanksgiving-2026' and (select public.is_ellsworth_member()));
-- Defense in depth if a future release grants DELETE. Current writes use checked RPCs only.
create policy "Members remove only own signups" on public.thanksgiving_dish_signups
  for delete to authenticated
  using ((select public.is_ellsworth_member()) and user_id = (select auth.uid())
    and event_id = 'ellsworth-thanksgiving-2026');

-- Remove broad Supabase default grants (including TRUNCATE, which RLS cannot protect).
-- Custom dishes can only insert definitions. Legacy assignment fields cannot be written.
revoke all on public.thanksgiving_dishes from public, anon, authenticated;
grant select on public.thanksgiving_dishes to authenticated;
grant insert (event_id, id, label, category) on public.thanksgiving_dishes to authenticated;
drop policy if exists "Members can edit only unclaimed or own dishes" on public.thanksgiving_dishes;
drop policy if exists "Members can add dishes" on public.thanksgiving_dishes;
create policy "Members can add unassigned dish definitions" on public.thanksgiving_dishes
  for insert to authenticated with check (
    (select public.is_ellsworth_member()) and event_id = 'ellsworth-thanksgiving-2026'
    and claimed_by is null and assignee is null and note is null
  );

-- Privileged code lives outside exposed schemas. Every path checks membership and uid.
-- No caller supplies the account ID. Parent row locks serialize claims AND releases.
create or replace function ellsworth_private.manage_dish_signup(
  p_event_id text, p_id text, p_label text, p_category text,
  p_assignee text, p_note text, p_action text
) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  available_slot smallint;
  own_slot smallint;
begin
  if caller is null or not public.is_ellsworth_member()
     or p_event_id is distinct from 'ellsworth-thanksgiving-2026' then
    raise exception 'Family membership required for this event' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('claim', 'update', 'release') then
    raise exception 'Invalid signup action' using errcode = '22023';
  end if;
  if p_action <> 'release' and
     (p_assignee is null or char_length(btrim(p_assignee)) not between 1 and 75
       or char_length(coalesce(p_note, '')) > 130) then
    raise exception 'Enter a name (1–75 characters) and note (up to 130 characters)' using errcode = '22023';
  end if;
  if p_action = 'claim' then
    insert into public.thanksgiving_dishes(event_id, id, label, category)
    values (p_event_id, p_id, p_label, p_category)
    on conflict (event_id, id) do nothing;
  end if;
  perform 1 from public.thanksgiving_dishes
    where event_id = p_event_id and id = p_id for update;
  if not found then return 'not_assigned'; end if;

  select slot into own_slot from public.thanksgiving_dish_signups
    where event_id = p_event_id and dish_id = p_id and user_id = caller;
  if p_action = 'release' then
    if own_slot is null then return 'not_assigned'; end if;
    delete from public.thanksgiving_dish_signups
      where event_id = p_event_id and dish_id = p_id and user_id = caller;
    return 'removed';
  elsif p_action = 'update' then
    if own_slot is null then return 'not_assigned'; end if;
    update public.thanksgiving_dish_signups set assignee = btrim(p_assignee), note = coalesce(p_note, '')
      where event_id = p_event_id and dish_id = p_id and user_id = caller;
    return 'updated';
  elsif own_slot is not null then
    return 'already_assigned';
  end if;

  select n::smallint into available_slot from generate_series(1, 3) as slots(n)
    where not exists (select 1 from public.thanksgiving_dish_signups s
      where s.event_id = p_event_id and s.dish_id = p_id and s.slot = n)
    order by n limit 1;
  if available_slot is null then return 'full'; end if;
  insert into public.thanksgiving_dish_signups(event_id, dish_id, slot, user_id, assignee, note)
    values (p_event_id, p_id, available_slot, caller, btrim(p_assignee), coalesce(p_note, ''));
  return 'claimed';
end;
$$;
revoke all on function ellsworth_private.manage_dish_signup(text,text,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function ellsworth_private.manage_dish_signup(text,text,text,text,text,text,text)
  to authenticated;

create or replace function public.manage_ellsworth_signup(
  p_event_id text, p_id text, p_label text, p_category text,
  p_assignee text, p_note text default '', p_action text default 'claim'
) returns text
language sql security invoker set search_path = ''
as $$ select ellsworth_private.manage_dish_signup(
  p_event_id, p_id, p_label, p_category, p_assignee, p_note, p_action
); $$;
revoke all on function public.manage_ellsworth_signup(text,text,text,text,text,text,text)
  from public, anon;
grant execute on function public.manage_ellsworth_signup(text,text,text,text,text,text,text)
  to authenticated;

-- Stale V1 pages must reload rather than report a false success or overwrite the snapshot.
create or replace function public.claim_ellsworth_dish(
  p_event_id text, p_id text, p_label text, p_category text,
  p_assignee text, p_note text default ''
) returns boolean
language plpgsql security invoker set search_path = ''
as $$ begin
  raise exception 'The family menu has upgraded. Reload the page to use V2 signups.'
    using errcode = '55000';
end; $$;
revoke all on function public.claim_ellsworth_dish(text,text,text,text,text,text) from public, anon;
grant execute on function public.claim_ellsworth_dish(text,text,text,text,text,text) to authenticated;
commit;
