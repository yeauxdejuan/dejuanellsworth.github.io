-- Add Heads Up to the approved built-in keys without changing existing votes,
-- membership/ownership checks, grants, or the ability to vote for stored suggestions.
begin;
set local lock_timeout = '5s';
alter policy "Members vote for existing games" on public.thanksgiving_game_votes
  with check ((select public.is_ellsworth_member()) and user_id = (select auth.uid()) and (
    game_key in ('builtin-heads-up','builtin-spades','builtin-uno','builtin-dominoes','builtin-family-feud','builtin-charades','builtin-name-that-tune')
    or exists (select 1 from public.thanksgiving_games g where g.id::text = game_key and g.event_id = thanksgiving_game_votes.event_id)
  ));
commit;
