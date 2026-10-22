-- Additive: preserve existing RSVPs, ownership rules and unknown historical save times.
begin;
set local lock_timeout = '5s';

alter table public.thanksgiving_rsvps
  add column dietary_needs text not null default ''
    constraint thanksgiving_rsvps_dietary_length check (char_length(dietary_needs) <= 250),
  add column updated_at timestamptz;

-- Only future writes receive a timestamp; do not invent an edit time for old rows.
create function ellsworth_private.stamp_rsvp_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;
revoke all on function ellsworth_private.stamp_rsvp_update() from public, anon, authenticated;

create trigger thanksgiving_rsvps_updated_at
  before insert or update on public.thanksgiving_rsvps
  for each row execute function ellsworth_private.stamp_rsvp_update();

commit;
