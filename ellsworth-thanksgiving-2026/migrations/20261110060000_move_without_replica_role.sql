-- Fix: hosted Supabase does not let the postgres role set session_replication_role
-- (42501 "permission denied to set parameter"), so reassign_member and claim_household failed in production.
-- Local tests run as a superuser and missed it. Same move, no trigger switch:
-- the activity trigger still queues "changed" lines for the moved RSVP/reactions, so this transaction
-- deletes exactly the outbox rows it created (same transaction start time, newer than before the move).
-- The RSVP save-time trigger now stamps the move time; that is accepted.
begin;
set local lock_timeout = '5s';

create or replace function ellsworth_private.move_member_rows(p_from uuid, p_to uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare conflicts text[] := '{}'; moved jsonb := '{}'; n integer; outbox_before bigint;
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

  select coalesce(max(id), 0) into outbox_before from ellsworth_private.discord_outbox;
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
  -- A move is not new family activity: drop only what these updates queued.
  delete from ellsworth_private.discord_outbox where id > outbox_before and created_at = now();
  return moved;
end;
$$;
revoke all on function ellsworth_private.move_member_rows(uuid, uuid) from public, anon, authenticated;
commit;
