-- Additive: members reclaim their own RSVP after their phone lost its anonymous identity.
-- Why: iPhone browsers delete site storage after 7 days without a visit. A returning member re-enters
-- the code, gets a new identity, and cannot edit their RSVP. Before this, only the organizer could fix it
-- (member_reassignment migration). Now a member with no RSVP sees households whose identity has been idle
-- for 7+ days and taps their own. Guards: family members only, idle identities only, one claim per
-- device, at most 5 self-claims per hour, Discord notice with the undo ID. Requires member_reassignment.
begin;
set local lock_timeout = '5s';

-- Idle = no session activity for 7 days (token refreshes update auth.sessions while the browser keeps it).
create function ellsworth_private.identity_is_idle(p_user uuid) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
begin
  return coalesce(
    (select max(s.updated_at) from auth.sessions s where s.user_id = p_user),
    (select u.created_at from auth.users u where u.id = p_user)
  ) < now() - interval '7 days';
end;
$$;
revoke all on function ellsworth_private.identity_is_idle(uuid) from public, anon, authenticated;

-- Household names only (no IDs). Empty unless the caller is a member without an RSVP for this event.
create function public.claimable_households(p_event text) returns table(household text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null
     or not exists (select 1 from public.ellsworth_members m where m.user_id = auth.uid())
     or exists (select 1 from public.thanksgiving_rsvps r where r.event_id = p_event and r.user_id = auth.uid()) then
    return;
  end if;
  return query
    select r.household_name from public.thanksgiving_rsvps r
    where r.event_id = p_event and r.user_id is not null and r.user_id <> auth.uid()
      and ellsworth_private.identity_is_idle(r.user_id)
    order by lower(r.household_name);
end;
$$;
revoke all on function public.claimable_households(text) from public, anon;
grant execute on function public.claimable_households(text) to authenticated;

create function public.claim_household(p_event text, p_household text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := auth.uid(); target uuid; matches integer; name text; moved jsonb; audit_id bigint;
begin
  if me is null or not exists (select 1 from public.ellsworth_members m where m.user_id = me) then
    raise exception 'Join the family board first.' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtext('ellsworth-member-reassign'));
  if exists (select 1 from public.thanksgiving_rsvps r where r.event_id = p_event and r.user_id = me) then
    raise exception 'This device already has an RSVP. Ask the organizer to combine them.' using errcode = '22023';
  end if;
  if exists (select 1 from ellsworth_private.member_reassignments a where a.new_user_id = me and a.undone_at is null) then
    raise exception 'This device already reclaimed a household. Ask the organizer.' using errcode = '22023';
  end if;
  select count(*), min(r.user_id::text)::uuid, min(r.household_name) into matches, target, name
    from public.thanksgiving_rsvps r
    where r.event_id = p_event and lower(btrim(r.household_name)) = lower(btrim(p_household))
      and r.user_id is not null and r.user_id <> me and ellsworth_private.identity_is_idle(r.user_id);
  if matches = 0 then
    raise exception 'That RSVP cannot be reclaimed here. Ask the organizer.' using errcode = '22023';
  elsif matches > 1 then
    raise exception 'More than one household has that name. Ask the organizer.' using errcode = '22023';
  end if;
  if (select count(*) from ellsworth_private.member_reassignments a
      where a.note like 'self-claim:%' and a.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many RSVPs were reclaimed in the last hour. Try again later or ask the organizer.' using errcode = '22023';
  end if;

  -- The new device may already have reacted or voted again; the earlier entry wins, the duplicate goes.
  delete from public.thanksgiving_photo_reactions n using public.thanksgiving_photo_reactions o
    where n.user_id = me and o.user_id = target and o.photo_id = n.photo_id;
  delete from public.thanksgiving_game_votes n using public.thanksgiving_game_votes o
    where n.user_id = me and o.user_id = target and o.event_id = n.event_id and o.game_key = n.game_key;

  moved := ellsworth_private.move_member_rows(target, me);
  delete from public.ellsworth_members where user_id = target;
  insert into ellsworth_private.member_reassignments(old_user_id, new_user_id, moved, note)
    values (target, me, moved, left('self-claim: ' || name, 200)) returning id into audit_id;
  if (select s.enabled from ellsworth_private.discord_settings s where s.singleton) then
    insert into ellsworth_private.discord_outbox(kind, summary)
      values ('rsvp', left(name, 30) || ' reclaimed their RSVP on a new device (undo #' || audit_id || ')');
  end if;
  return jsonb_build_object('household', name, 'reassignment_id', audit_id);
end;
$$;
revoke all on function public.claim_household(text, text) from public, anon;
grant execute on function public.claim_household(text, text) to authenticated;
commit;
