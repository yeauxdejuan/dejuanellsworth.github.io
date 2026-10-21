-- Additive family-planning release. Apply after shared_dish_signups, before the frontend.
-- Existing dishes, games, photos, storage policies and membership are unchanged.
begin;
set local lock_timeout = '5s';

create table public.thanksgiving_rsvps (
  event_id text not null check (event_id = 'ellsworth-thanksgiving-2026'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  household_name text not null check (char_length(btrim(household_name)) between 1 and 75),
  response text not null check (response in ('coming','maybe','declined')),
  adults integer not null check (adults between 0 and 50),
  children integer not null check (children between 0 and 50),
  arrival_date date, arrival_time time, departure_date date, departure_time time,
  note text not null default '' check (char_length(note) <= 250),
  primary key (event_id,user_id),
  check (adults + children <= 50),
  check ((response = 'declined' and adults + children = 0) or (response <> 'declined' and adults + children > 0)),
  check (arrival_time is null or arrival_date is not null),
  check (departure_time is null or departure_date is not null),
  check (departure_date is null or arrival_date is null or departure_date >= arrival_date),
  check (departure_date is distinct from arrival_date or arrival_time is null or departure_time is null or departure_time >= arrival_time)
);
alter table public.thanksgiving_rsvps enable row level security;
revoke all on public.thanksgiving_rsvps from public, anon, authenticated;
grant select, insert, update, delete on public.thanksgiving_rsvps to authenticated;
create policy "Family can read RSVPs" on public.thanksgiving_rsvps for select to authenticated
  using ((select public.is_ellsworth_member()));
create policy "Members manage own RSVP" on public.thanksgiving_rsvps for all to authenticated
  using ((select public.is_ellsworth_member()) and user_id = (select auth.uid()))
  with check ((select public.is_ellsworth_member()) and user_id = (select auth.uid()));
create index thanksgiving_rsvps_user_idx on public.thanksgiving_rsvps(user_id);

create table public.thanksgiving_schedule (
  id uuid primary key default gen_random_uuid(),
  event_id text not null check (event_id = 'ellsworth-thanksgiving-2026'),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  is_seed boolean not null default false,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  day date not null,
  start_time time, end_time time,
  kind text not null check (kind in ('dinner','games','outing','other')),
  location text not null default '' check (char_length(location) <= 100),
  note text not null default '' check (char_length(note) <= 300),
  check (end_time is null or (start_time is not null and end_time > start_time))
);
create index thanksgiving_schedule_event_day_idx on public.thanksgiving_schedule(event_id,day,start_time);
create index thanksgiving_schedule_owner_idx on public.thanksgiving_schedule(created_by);
alter table public.thanksgiving_schedule enable row level security;
revoke all on public.thanksgiving_schedule from public, anon, authenticated;
grant select on public.thanksgiving_schedule to authenticated;
grant insert (event_id,title,day,start_time,end_time,kind,location,note) on public.thanksgiving_schedule to authenticated;
grant update (title,day,start_time,end_time,kind,location,note) on public.thanksgiving_schedule to authenticated;
grant delete on public.thanksgiving_schedule to authenticated;
create policy "Family can read schedule" on public.thanksgiving_schedule for select to authenticated
  using ((select public.is_ellsworth_member()));
create policy "Members add own plans" on public.thanksgiving_schedule for insert to authenticated
  with check ((select public.is_ellsworth_member()) and created_by = (select auth.uid()) and not is_seed);
create policy "Members edit own or shared plans" on public.thanksgiving_schedule for update to authenticated
  using ((select public.is_ellsworth_member()) and (is_seed or created_by = (select auth.uid())))
  with check ((select public.is_ellsworth_member()) and (is_seed or created_by = (select auth.uid())));
create policy "Members remove own plans" on public.thanksgiving_schedule for delete to authenticated
  using ((select public.is_ellsworth_member()) and not is_seed and created_by = (select auth.uid()));
insert into public.thanksgiving_schedule(id,event_id,created_by,is_seed,title,day,kind,note) values
  ('00000000-2026-4000-8000-000000000001','ellsworth-thanksgiving-2026',null,true,'Thanksgiving dinner','2026-11-26','dinner','Time to be confirmed by the family.'),
  ('00000000-2026-4000-8000-000000000002','ellsworth-thanksgiving-2026',null,true,'Family game night','2026-11-26','games','We’ll add the time and game lineup later.');

create table public.thanksgiving_game_votes (
  event_id text not null check (event_id = 'ellsworth-thanksgiving-2026'),
  game_key text not null check (char_length(game_key) between 1 and 100),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (event_id,game_key,user_id)
);
create index thanksgiving_game_votes_user_idx on public.thanksgiving_game_votes(user_id);
alter table public.thanksgiving_game_votes enable row level security;
revoke all on public.thanksgiving_game_votes from public, anon, authenticated;
grant select, insert, delete on public.thanksgiving_game_votes to authenticated;
create policy "Family can read game votes" on public.thanksgiving_game_votes for select to authenticated
  using ((select public.is_ellsworth_member()));
create policy "Members vote for existing games" on public.thanksgiving_game_votes for insert to authenticated
  with check ((select public.is_ellsworth_member()) and user_id = (select auth.uid()) and (
    game_key in ('builtin-spades','builtin-uno','builtin-dominoes','builtin-family-feud','builtin-charades','builtin-name-that-tune')
    or exists (select 1 from public.thanksgiving_games g where g.id::text = game_key and g.event_id = thanksgiving_game_votes.event_id)
  ));
create policy "Members remove own game vote" on public.thanksgiving_game_votes for delete to authenticated
  using ((select public.is_ellsworth_member()) and user_id = (select auth.uid()));

-- Captions are collaborative, including photos uploaded before ownership was recorded.
-- The original photo caption is retained as the fallback; only this new overlay changes.
create table public.thanksgiving_photo_details (
  photo_id uuid primary key references public.thanksgiving_photos(id) on delete cascade,
  event_id text not null check (event_id = 'ellsworth-thanksgiving-2026'),
  caption text not null default '' check (char_length(caption) <= 150),
  people_names text not null default '' check (char_length(people_names) <= 250),
  date_taken date,
  edited_by uuid default auth.uid() references auth.users(id) on delete set null
);
create index thanksgiving_photo_details_event_idx on public.thanksgiving_photo_details(event_id);
create index thanksgiving_photo_details_editor_idx on public.thanksgiving_photo_details(edited_by);
alter table public.thanksgiving_photo_details enable row level security;
revoke all on public.thanksgiving_photo_details from public, anon, authenticated;
grant select, insert, update on public.thanksgiving_photo_details to authenticated;
create policy "Family can read photo details" on public.thanksgiving_photo_details for select to authenticated
  using ((select public.is_ellsworth_member()));
create policy "Members add photo details" on public.thanksgiving_photo_details for insert to authenticated
  with check ((select public.is_ellsworth_member()) and edited_by = (select auth.uid()));
create policy "Members edit shared photo details" on public.thanksgiving_photo_details for update to authenticated
  using ((select public.is_ellsworth_member()))
  with check ((select public.is_ellsworth_member()) and edited_by = (select auth.uid()));

create table public.thanksgiving_photo_reactions (
  photo_id uuid not null references public.thanksgiving_photos(id) on delete cascade,
  event_id text not null check (event_id = 'ellsworth-thanksgiving-2026'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reaction text not null check (reaction in ('heart','laugh','clap')),
  primary key (photo_id,user_id)
);
create index thanksgiving_photo_reactions_event_idx on public.thanksgiving_photo_reactions(event_id);
create index thanksgiving_photo_reactions_user_idx on public.thanksgiving_photo_reactions(user_id);
alter table public.thanksgiving_photo_reactions enable row level security;
revoke all on public.thanksgiving_photo_reactions from public, anon, authenticated;
grant select, insert, update, delete on public.thanksgiving_photo_reactions to authenticated;
create policy "Family can read photo reactions" on public.thanksgiving_photo_reactions for select to authenticated
  using ((select public.is_ellsworth_member()));
create policy "Members manage own photo reaction" on public.thanksgiving_photo_reactions for all to authenticated
  using ((select public.is_ellsworth_member()) and user_id = (select auth.uid()))
  with check ((select public.is_ellsworth_member()) and user_id = (select auth.uid()));

commit;
