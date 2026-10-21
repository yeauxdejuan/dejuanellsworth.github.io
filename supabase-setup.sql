-- ELLSWORTH FAMILY THANKSGIVING · RUN ONCE IN A NEW SUPABASE PROJECT
-- IMPORTANT: This schema does not contain the family invitation code.
-- Set the private code in Supabase SQL Editor using the command in README.md.
-- NEVER put an actual family code, service_role key, or secret key in GitHub.
-- Enable Authentication > Providers > Anonymous Sign-Ins in your project.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ellsworth_invite (
  id integer primary key check(id = 1),
  code_hash text not null
);
create table if not exists public.ellsworth_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now()
);

-- Nobody can access code hashes or the roster via a client-side table query.
alter table public.ellsworth_invite enable row level security;
alter table public.ellsworth_members enable row level security;
revoke all on public.ellsworth_invite, public.ellsworth_members from public, anon, authenticated;

create or replace function public.is_ellsworth_member()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.ellsworth_members m
    where m.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_ellsworth_member() from public, anon;
grant execute on function public.is_ellsworth_member() to authenticated;

create or replace function public.join_ellsworth_family(p_code text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare stored_hash text;
begin
  if auth.uid() is null or p_code is null or char_length(p_code) < 20 or char_length(p_code) > 128 then
    return false;
  end if;
  select code_hash into stored_hash from public.ellsworth_invite where id = 1;
  if stored_hash is null then return false; end if;
  if extensions.crypt(p_code, stored_hash) = stored_hash then
    insert into public.ellsworth_members (user_id) values (auth.uid())
      on conflict (user_id) do nothing;
    return true;
  end if;
  return false;
end;
$$;
revoke all on function public.join_ellsworth_family(text) from public, anon;
grant execute on function public.join_ellsworth_family(text) to authenticated;

-- Shared menu including the account that claimed each dish.
create table if not exists public.thanksgiving_dishes (
  event_id text not null check(event_id = 'ellsworth-thanksgiving-2026'),
  id text not null check(char_length(id) between 1 and 100),
  label text not null check(char_length(label) between 1 and 90),
  category text not null check(char_length(category) between 1 and 80),
  assignee text check(assignee is null or char_length(assignee) <= 75),
  note text check(note is null or char_length(note) <= 130),
  claimed_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (event_id,id)
);
alter table public.thanksgiving_dishes enable row level security;
create policy "Members can view dishes" on public.thanksgiving_dishes
  for select to authenticated using ((select public.is_ellsworth_member()));
create policy "Members can add dishes" on public.thanksgiving_dishes
  for insert to authenticated with check (
    (select public.is_ellsworth_member()) and (claimed_by is null or claimed_by = (select auth.uid()))
  );
create policy "Members can edit only unclaimed or own dishes" on public.thanksgiving_dishes
  for update to authenticated
  using ((select public.is_ellsworth_member()) and (claimed_by is null or claimed_by = (select auth.uid())))
  with check ((select public.is_ellsworth_member()) and (claimed_by is null or claimed_by = (select auth.uid())));
grant select,insert,update on public.thanksgiving_dishes to authenticated;

create or replace function public.claim_ellsworth_dish(
  p_event_id text, p_id text, p_label text, p_category text,
  p_assignee text, p_note text default ''
) returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare changed integer;
begin
  if not public.is_ellsworth_member() or p_event_id <> 'ellsworth-thanksgiving-2026' then
    return false;
  end if;
  insert into public.thanksgiving_dishes (event_id,id,label,category,assignee,note,claimed_by)
  values (
    p_event_id,p_id,p_label,p_category,
    nullif(btrim(p_assignee),''),nullif(btrim(p_note),''),
    case when nullif(btrim(p_assignee),'') is null then null else auth.uid() end
  )
  on conflict (event_id,id) do update
  set assignee = excluded.assignee,
      note = excluded.note,
      claimed_by = excluded.claimed_by,
      updated_at = now()
  where thanksgiving_dishes.claimed_by is null
    or thanksgiving_dishes.claimed_by = auth.uid();
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;
revoke all on function public.claim_ellsworth_dish(text,text,text,text,text,text) from public, anon;
grant execute on function public.claim_ellsworth_dish(text,text,text,text,text,text) to authenticated;

-- Family-contributed games.
create table if not exists public.thanksgiving_games (
  id uuid primary key default gen_random_uuid(),
  event_id text not null check(event_id = 'ellsworth-thanksgiving-2026'),
  name text not null check(char_length(name) between 1 and 70),
  description text not null default '' check(char_length(description) <= 160),
  icon text not null default '✦' check(char_length(icon) <= 6),
  created_at timestamptz not null default now()
);
alter table public.thanksgiving_games enable row level security;
create policy "Members can read family games" on public.thanksgiving_games
  for select to authenticated using ((select public.is_ellsworth_member()));
create policy "Members can suggest family games" on public.thanksgiving_games
  for insert to authenticated with check ((select public.is_ellsworth_member()));
grant select,insert on public.thanksgiving_games to authenticated;

-- Family-contributed public TikTok links (content itself hosted by TikTok).
create table if not exists public.thanksgiving_tiktoks (
  id uuid primary key default gen_random_uuid(),
  event_id text not null check(event_id = 'ellsworth-thanksgiving-2026'),
  url text not null check(char_length(url) between 25 and 500),
  created_at timestamptz not null default now(),
  unique(event_id,url)
);
alter table public.thanksgiving_tiktoks enable row level security;
create policy "Members can read TikToks" on public.thanksgiving_tiktoks
  for select to authenticated using ((select public.is_ellsworth_member()));
create policy "Members can add TikToks" on public.thanksgiving_tiktoks
  for insert to authenticated with check ((select public.is_ellsworth_member()));
grant select,insert on public.thanksgiving_tiktoks to authenticated;

-- Photos are kept in a PRIVATE Supabase Storage bucket, with only paths in DB.
create table if not exists public.thanksgiving_photos (
  id uuid primary key default gen_random_uuid(),
  event_id text not null check(event_id = 'ellsworth-thanksgiving-2026'),
  path text,
  external_url text,
  caption text not null default '' check(char_length(caption) <= 150),
  created_at timestamptz not null default now(),
  check ((path is null) <> (external_url is null))
);
alter table public.thanksgiving_photos enable row level security;
create policy "Members can view photo index" on public.thanksgiving_photos
  for select to authenticated using ((select public.is_ellsworth_member()));
create policy "Members can add photo references" on public.thanksgiving_photos
  for insert to authenticated with check ((select public.is_ellsworth_member()));
grant select,insert on public.thanksgiving_photos to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ellsworth-family-photos','ellsworth-family-photos',false,6291456,array['image/jpeg'])
on conflict (id) do update
set public=false,file_size_limit=6291456,allowed_mime_types=array['image/jpeg'];

create policy "Ellsworth members can read private photos" on storage.objects
  for select to authenticated
  using (bucket_id='ellsworth-family-photos' and (select public.is_ellsworth_member())
    and (storage.foldername(name))[1] = '2026');
create policy "Ellsworth members can upload photos" on storage.objects
  for insert to authenticated
  with check (bucket_id='ellsworth-family-photos' and (select public.is_ellsworth_member())
    and (storage.foldername(name))[1] = '2026');

-- No anon/public RLS policies: unauthenticated visitors cannot access family records.
-- No client-side key can override these policies. Do not disable RLS.
