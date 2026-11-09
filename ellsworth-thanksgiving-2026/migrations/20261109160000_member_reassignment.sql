-- Additive, owner-only: move a family member's data from a lost anonymous identity to their new one.
-- Why: the site's identity is an anonymous Auth session kept only in browser storage. iPhone browsers
-- delete that storage after 7 days without a visit, so a returning member re-enters the code, gets a
-- new identity, and can no longer edit their RSVP, signups or votes. Their data is still in the
-- database under the old identity. Run from SQL Editor (never the website):
--   select * from ellsworth_private.identity_overview();
--   select ellsworth_private.reassign_member('<old user_id>', '<new user_id>', 'note');
--   select ellsworth_private.undo_member_reassignment(<reassignment_id>);
-- Storage photo objects keep their original owner: storage policies are member-wide (read/upload only).
begin;
set local lock_timeout = '5s';

create table ellsworth_private.member_reassignments (
  id bigserial primary key,
  old_user_id uuid not null,
  new_user_id uuid not null check (new_user_id <> old_user_id),
  moved jsonb not null,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
revoke all on ellsworth_private.member_reassignments from public, anon, authenticated;
revoke all on sequence ellsworth_private.member_reassignments_id_seq from public, anon, authenticated;

create function ellsworth_private.member_row_count(p_user uuid) returns integer
language sql stable security invoker set search_path = '' as $$
  select ((select count(*) from public.thanksgiving_rsvps where user_id = p_user)
    + (select count(*) from public.thanksgiving_dish_signups where user_id = p_user)
    + (select count(*) from public.thanksgiving_dishes where claimed_by = p_user)
    + (select count(*) from public.thanksgiving_game_votes where user_id = p_user)
    + (select count(*) from public.thanksgiving_photo_details where edited_by = p_user)
    + (select count(*) from public.thanksgiving_photo_reactions where user_id = p_user)
    + (select count(*) from public.thanksgiving_schedule where created_by = p_user))::integer;
$$;
revoke all on function ellsworth_private.member_row_count(uuid) from public, anon, authenticated;

-- Moves every owned row in one statement per table. Refuses (moves nothing) when both identities hold a
-- row that may exist only once per person, so no family entry is overwritten or merged by guesswork.
-- Activity triggers are skipped for this transaction: a move is not new family activity (no Discord
-- digest) and keeps the original RSVP save time.
create function ellsworth_private.move_member_rows(p_from uuid, p_to uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare conflicts text[] := '{}'; moved jsonb := '{}'; n integer; previous_role text;
begin
  if exists (select 1 from public.thanksgiving_rsvps a join public.thanksgiving_rsvps b using (event_id)
             where a.user_id = p_from and b.user_id = p_to) then conflicts := array_append(conflicts, 'RSVP'); end if;
  if exists (select 1 from public.thanksgiving_dish_signups a join public.thanksgiving_dish_signups b using (event_id, dish_id)
             where a.user_id = p_from and b.user_id = p_to) then conflicts := array_append(conflicts, 'dish signup'); end if;
  if exists (select 1 from public.thanksgiving_game_votes a join public.thanksgiving_game_votes b using (event_id, game_key)
             where a.user_id = p_from and b.user_id = p_to) then conflicts := array_append(conflicts, 'game vote'); end if;
  if exists (select 1 from public.thanksgiving_photo_reactions a join public.thanksgiving_photo_reactions b using (photo_id)
             where a.user_id = p_from and b.user_id = p_to) then conflicts := array_append(conflicts, 'photo reaction'); end if;
  if cardinality(conflicts) > 0 then
    raise exception 'Both identities have: %. Nothing was moved; remove the duplicate first.', array_to_string(conflicts, ', ')
      using errcode = '23505';
  end if;

  previous_role := current_setting('session_replication_role');
  perform set_config('session_replication_role', 'replica', true);
  update public.thanksgiving_rsvps set user_id = p_to where user_id = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('rsvps', n);
  update public.thanksgiving_dish_signups set user_id = p_to where user_id = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('dish_signups', n);
  update public.thanksgiving_dishes set claimed_by = p_to where claimed_by = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('legacy_dish_claims', n);
  update public.thanksgiving_game_votes set user_id = p_to where user_id = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('game_votes', n);
  update public.thanksgiving_photo_details set edited_by = p_to where edited_by = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('photo_captions', n);
  update public.thanksgiving_photo_reactions set user_id = p_to where user_id = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('photo_reactions', n);
  update public.thanksgiving_schedule set created_by = p_to where created_by = p_from;
  get diagnostics n = row_count; moved := moved || jsonb_build_object('schedule_items', n);
  perform set_config('session_replication_role', previous_role, true);
  return moved;
end;
$$;
revoke all on function ellsworth_private.move_member_rows(uuid, uuid) from public, anon, authenticated;

create function ellsworth_private.reassign_member(p_old uuid, p_new uuid, p_note text default null) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare moved jsonb; audit_id bigint;
begin
  if p_old is null or p_new is null or p_old = p_new then
    raise exception 'Give two different user IDs: the old (lost) one first, then the new one.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('ellsworth-member-reassign'));
  if not exists (select 1 from auth.users where id = p_old) then
    raise exception 'Old user ID % does not exist.', p_old using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = p_new) then
    raise exception 'New user ID % does not exist.', p_new using errcode = '22023';
  end if;
  if not exists (select 1 from public.ellsworth_members where user_id = p_new) then
    raise exception 'The new identity has not entered the family code yet. Ask them to join first.' using errcode = '22023';
  end if;
  if ellsworth_private.member_row_count(p_old) = 0 then
    raise exception 'The old identity owns no family data. Nothing to move.' using errcode = '22023';
  end if;

  moved := ellsworth_private.move_member_rows(p_old, p_new);
  -- The lost browser can never return, so its membership is no longer needed.
  delete from public.ellsworth_members where user_id = p_old;
  insert into ellsworth_private.member_reassignments(old_user_id, new_user_id, moved, note)
    values (p_old, p_new, moved, p_note) returning id into audit_id;
  return moved || jsonb_build_object('reassignment_id', audit_id);
end;
$$;
revoke all on function ellsworth_private.reassign_member(uuid, uuid, text) from public, anon, authenticated;

-- Moves everything the new identity owns now back to the old one (including rows added since).
create function ellsworth_private.undo_member_reassignment(p_id bigint) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare r record; moved jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('ellsworth-member-reassign'));
  select * into r from ellsworth_private.member_reassignments where id = p_id and undone_at is null for update;
  if not found then raise exception 'No active reassignment %.', p_id using errcode = '22023'; end if;
  insert into public.ellsworth_members(user_id) values (r.old_user_id) on conflict (user_id) do nothing;
  moved := ellsworth_private.move_member_rows(r.new_user_id, r.old_user_id);
  update ellsworth_private.member_reassignments set undone_at = now() where id = p_id;
  return moved || jsonb_build_object('undone_reassignment_id', p_id);
end;
$$;
revoke all on function ellsworth_private.undo_member_reassignment(bigint) from public, anon, authenticated;

-- Who is who: members and any identity that still owns data, newest activity first.
-- A lost identity = household name + old last_active + rows_owned > 0. Its new one = recent, rows_owned 0.
create function ellsworth_private.identity_overview()
returns table(user_id uuid, household text, device text, member boolean, created_at timestamptz, last_active timestamptz, rows_owned integer)
language plpgsql stable security invoker set search_path = '' as $$
begin
  return query
  with ids as (
    select m.user_id as id from public.ellsworth_members m
    union select r.user_id from public.thanksgiving_rsvps r where r.user_id is not null
    union select s.user_id from public.thanksgiving_dish_signups s where s.user_id is not null
  ), latest as (
    select distinct on (s.user_id) s.user_id, s.user_agent from auth.sessions s order by s.user_id, s.updated_at desc nulls last
  )
  select u.id,
    (select r.household_name from public.thanksgiving_rsvps r where r.user_id = u.id order by r.updated_at desc nulls last limit 1),
    case when l.user_agent is null then null else
      case when l.user_agent ~ 'iPhone' then 'iPhone' when l.user_agent ~ 'iPad' then 'iPad' when l.user_agent ~ 'Android' then 'Android'
           when l.user_agent ~ 'Macintosh' then 'Mac' when l.user_agent ~ 'Windows' then 'Windows' else 'other' end || ' ' ||
      case when l.user_agent ~ 'EdgiOS|Edg/' then 'Edge' when l.user_agent ~ 'CriOS|Chrome/' then 'Chrome'
           when l.user_agent ~ 'FxiOS|Firefox/' then 'Firefox' when l.user_agent ~ 'Safari/' then 'Safari' else '' end
    end,
    exists (select 1 from public.ellsworth_members m where m.user_id = u.id),
    u.created_at,
    (select max(s.updated_at) from auth.sessions s where s.user_id = u.id),
    ellsworth_private.member_row_count(u.id)
  from ids join auth.users u on u.id = ids.id
  left join latest l on l.user_id = u.id
  order by 6 desc nulls last;
end;
$$;
revoke all on function ellsworth_private.identity_overview() from public, anon, authenticated;
commit;
