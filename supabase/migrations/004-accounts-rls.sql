-- Phase 9 (accounts), part 2 of 2 — run once in the Supabase dashboard:
-- Project → SQL Editor → New query → paste → Run.
--
-- Run this ONLY after:
--   1. 003-accounts.sql has run,
--   2. the accounts code is deployed, and
--   3. Jenna has created her account on the live site.
-- Run it soon after step 3: until it runs, her existing closet is unowned and
-- so invisible to her signed-in session.
--
-- What it does, in order:
--   · hands every existing unowned row (items, outfits, wear log, day state,
--     settings) to Jenna's account,
--   · makes user_id required and moves the primary keys onto it,
--   · switches Row Level Security on for every app table, with policies that
--     let a signed-in user touch only their own rows,
--   · revokes the anon key's access to the tables entirely,
--   · replaces the "anyone can write" storage policy with one scoped to each
--     user's own `<user_id>/` folder.
--
-- The whole script is one transaction. If anything fails (including the email
-- lookup below), nothing is applied. If the editor then says "current
-- transaction is aborted", run `rollback;` on its own and fix the problem.
-- Re-running after a successful run is harmless.
--
-- A commented-out ROLLBACK section at the bottom restores the no-auth setup.

begin;

-- ===========================================================================
-- EDIT THIS ONE LINE: the email Jenna signed up with (case doesn't matter).
-- ===========================================================================
create temp table accounts_owner on commit drop as
select id
from auth.users
where lower(email) = lower('jenna@example.com');
-- ===========================================================================

do $$
declare
  owner_count int;
begin
  select count(*) into owner_count from accounts_owner;
  if owner_count = 0 then
    raise exception
      'No account found for that email. Check the address in the EDIT THIS line at the top (Supabase → Authentication → Users shows the exact one). Nothing was changed.';
  elsif owner_count > 1 then
    raise exception
      'More than one account matches that email. Nothing was changed.';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Hand the existing rows to Jenna.
-- ---------------------------------------------------------------------------
update items set user_id = (select id from accounts_owner) where user_id is null;
update outfits set user_id = (select id from accounts_owner) where user_id is null;
update wear_log set user_id = (select id from accounts_owner) where user_id is null;

-- Same collision risk for daily_state: if Jenna picked an occasion after
-- signing up, she already has a row for that day, and handing her the old
-- unowned row for the same day would break the (user_id, day) key below and
-- roll the whole script back. Her new pick is the newer choice, so it wins.
delete from daily_state
where user_id is null
  and day in (
    select mine.day from daily_state mine
    where mine.user_id = (select id from accounts_owner)
  );
update daily_state set user_id = (select id from accounts_owner) where user_id is null;

-- If Jenna already set a location after signing up (before this ran), she has
-- her own settings row and the old singleton row would collide with it on the
-- one-row-per-user index. Her new row is the newer choice, so it wins.
delete from app_settings
where user_id is null
  and exists (
    select 1 from app_settings mine
    where mine.user_id = (select id from accounts_owner)
  );
update app_settings set user_id = (select id from accounts_owner) where user_id is null;

-- occasion_tags keep a null owner for the six seeded tags (shared by everyone).
-- Any other unowned tag was added through the old no-auth UI, i.e. by Jenna.
-- (As of writing there are none beyond the six, so this normally does nothing.)
update occasion_tags
set user_id = (select id from accounts_owner)
where user_id is null
  and id not in ('work', 'gym', 'date', 'casual', 'travel', 'errands');

-- ---------------------------------------------------------------------------
-- 2. user_id is required from now on.
-- ---------------------------------------------------------------------------
alter table items alter column user_id set not null;
alter table outfits alter column user_id set not null;
alter table wear_log alter column user_id set not null;
alter table daily_state alter column user_id set not null;
alter table app_settings alter column user_id set not null;

-- ---------------------------------------------------------------------------
-- 3. Primary keys move onto user_id.
-- ---------------------------------------------------------------------------
-- The old keys were created inline, so Postgres named them `<table>_pkey`.
-- The blocks below look the current key up rather than trusting that name,
-- and skip the change if the key already includes user_id (a re-run).

-- daily_state: primary key (day) → (user_id, day).
do $$
declare
  pk_name text;
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.daily_state'::regclass
      and c.contype = 'p'
      and a.attname = 'user_id'
  ) then
    select conname into pk_name
    from pg_constraint
    where conrelid = 'public.daily_state'::regclass and contype = 'p';
    if pk_name is not null then
      execute format('alter table public.daily_state drop constraint %I', pk_name);
    end if;
    alter table public.daily_state
      add constraint daily_state_pkey primary key (user_id, day);
  end if;
end
$$;
-- The primary key now does what 003's unique index did.
drop index if exists daily_state_user_id_day_key;

-- app_settings: primary key (id) → (user_id); the id column goes away.
do $$
declare
  pk_name text;
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.conrelid = 'public.app_settings'::regclass
      and c.contype = 'p'
      and a.attname = 'user_id'
  ) then
    select conname into pk_name
    from pg_constraint
    where conrelid = 'public.app_settings'::regclass and contype = 'p';
    if pk_name is not null then
      execute format('alter table public.app_settings drop constraint %I', pk_name);
    end if;
    alter table public.app_settings
      add constraint app_settings_pkey primary key (user_id);
  end if;
end
$$;
alter table app_settings drop column if exists id;
drop index if exists app_settings_user_id_key;

-- occasion_tags: primary key (id) → unique (user_id, id). Two people may each
-- add a tag called "brunch"; NULLS NOT DISTINCT still stops a second copy of a
-- seeded tag (null owner) with the same id. Requires Postgres 15+.
do $$
declare
  pk_name text;
begin
  select conname into pk_name
  from pg_constraint
  where conrelid = 'public.occasion_tags'::regclass and contype = 'p';
  if pk_name is not null then
    execute format('alter table public.occasion_tags drop constraint %I', pk_name);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.occasion_tags'::regclass
      and conname = 'occasion_tags_user_id_id_key'
  ) then
    alter table public.occasion_tags
      add constraint occasion_tags_user_id_id_key unique nulls not distinct (user_id, id);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 4. Row Level Security.
-- ---------------------------------------------------------------------------
-- Policies use `(select auth.uid())` rather than a bare `auth.uid()`: wrapped
-- in a subquery, Postgres evaluates it once per statement instead of once per
-- row (Supabase's documented RLS performance advice).

alter table items enable row level security;
alter table outfits enable row level security;
alter table outfit_items enable row level security;
alter table wear_log enable row level security;
alter table daily_state enable row level security;
alter table app_settings enable row level security;
alter table occasion_tags enable row level security;
alter table weather_cache enable row level security;

-- Owner-only tables: a signed-in user reads and writes only rows carrying
-- their own id, and can't insert or move a row into someone else's closet.
drop policy if exists "items: owner only" on items;
create policy "items: owner only"
  on items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "outfits: owner only" on outfits;
create policy "outfits: owner only"
  on outfits for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "wear_log: owner only" on wear_log;
create policy "wear_log: owner only"
  on wear_log for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "daily_state: owner only" on daily_state;
create policy "daily_state: owner only"
  on daily_state for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "app_settings: owner only" on app_settings;
create policy "app_settings: owner only"
  on app_settings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- outfit_items has no owner column: a link row belongs to whoever owns its
-- outfit. Writes must additionally point at one of the user's own items, so
-- nobody can pin someone else's item id into their outfit.
drop policy if exists "outfit_items: via own outfit" on outfit_items;
create policy "outfit_items: via own outfit"
  on outfit_items for all to authenticated
  using (
    exists (
      select 1 from outfits o
      where o.id = outfit_items.outfit_id
        and o.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from outfits o
      where o.id = outfit_items.outfit_id
        and o.user_id = (select auth.uid())
    )
    and exists (
      select 1 from items i
      where i.id = outfit_items.item_id
        and i.user_id = (select auth.uid())
    )
  );

-- occasion_tags: everyone sees the seeded (null-owner) tags plus their own;
-- only their own can be added, renamed or removed.
drop policy if exists "occasion_tags: read seeded and own" on occasion_tags;
create policy "occasion_tags: read seeded and own"
  on occasion_tags for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

drop policy if exists "occasion_tags: insert own" on occasion_tags;
create policy "occasion_tags: insert own"
  on occasion_tags for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "occasion_tags: update own" on occasion_tags;
create policy "occasion_tags: update own"
  on occasion_tags for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "occasion_tags: delete own" on occasion_tags;
create policy "occasion_tags: delete own"
  on occasion_tags for delete to authenticated
  using (user_id = (select auth.uid()));

-- weather_cache is deliberately shared and has no owner column: it holds public
-- Open-Meteo forecasts keyed by rounded coordinates, nothing personal, and two
-- people in the same town should share one cached forecast. Any signed-in user
-- may read it and upsert into it (upsert needs select + insert + update). No
-- delete policy: the app never deletes cache rows.
drop policy if exists "weather_cache: signed-in read" on weather_cache;
create policy "weather_cache: signed-in read"
  on weather_cache for select to authenticated
  using (true);

drop policy if exists "weather_cache: signed-in insert" on weather_cache;
create policy "weather_cache: signed-in insert"
  on weather_cache for insert to authenticated
  with check (true);

drop policy if exists "weather_cache: signed-in update" on weather_cache;
create policy "weather_cache: signed-in update"
  on weather_cache for update to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- 5. Grants: signed-in users only; the anon key gets nothing.
-- ---------------------------------------------------------------------------
-- RLS with no anon policy already denies anon every row; revoking the grants
-- as well turns an accidental anon query into a loud "permission denied"
-- instead of a silent empty result, and is a second lock if RLS is ever
-- switched off by mistake (it has been toggled from the dashboard before).
-- service_role bypasses RLS and keeps its grants for the local scripts.
grant all on
  items, outfits, outfit_items, wear_log, daily_state, app_settings,
  occasion_tags, weather_cache
to authenticated, service_role;

revoke all on
  items, outfits, outfit_items, wear_log, daily_state, app_settings,
  occasion_tags, weather_cache
from anon;

-- ---------------------------------------------------------------------------
-- 6. Storage: each user writes only inside their own folder.
-- ---------------------------------------------------------------------------
-- New uploads go to `item-images/<user_id>/...`, so the first path segment is
-- the owner. storage.foldername() splits the object name into its folders.
--
-- The bucket stays PUBLIC: images are shown by their public URL, and public-URL
-- reads bypass these policies entirely. The select policy only governs API
-- reads (list/download), which the app doesn't need beyond upsert.
--
-- The seeded photos live at the old flat paths (no user folder). They stay
-- readable by URL forever, but no signed-in user can overwrite or delete them
-- through the app any more; the local scripts can (service_role bypasses RLS).
--
-- Upload with `upsert: true` needs select + insert + update, hence all four.
drop policy if exists "item-images full access" on storage.objects;

drop policy if exists "item-images: own folder select" on storage.objects;
create policy "item-images: own folder select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "item-images: own folder insert" on storage.objects;
create policy "item-images: own folder insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "item-images: own folder update" on storage.objects;
create policy "item-images: own folder update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "item-images: own folder delete" on storage.objects;
create policy "item-images: own folder delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'item-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

commit;

-- ===========================================================================
-- ROLLBACK (emergency only) — restores the old no-auth access model.
-- ===========================================================================
-- Use this only if the accounts rollout has to be undone and the OLD no-auth
-- code is being redeployed. Select the block below, uncomment it (Ctrl+/ in
-- the SQL editor) and run it on its own.
--
-- It restores ACCESS, not SHAPE: user_id columns, the new primary keys and the
-- ownership data stay. Two things the old code relied on are gone and are
-- brought back here: app_settings' `id` column (the old code upserts
-- id = 'singleton') and daily_state's key on `day` alone (the old code upserts
-- onConflict "day"). If more than one person has used the app, those two
-- steps fail on duplicates; keep only Jenna's rows first.
--
-- begin;
--
-- alter table items disable row level security;
-- alter table outfits disable row level security;
-- alter table outfit_items disable row level security;
-- alter table wear_log disable row level security;
-- alter table daily_state disable row level security;
-- alter table app_settings disable row level security;
-- alter table occasion_tags disable row level security;
-- alter table weather_cache disable row level security;
--
-- grant all on
--   items, outfits, outfit_items, wear_log, daily_state, app_settings,
--   occasion_tags, weather_cache
-- to anon, authenticated, service_role;
--
-- -- The old code never sends user_id, so it must be optional again.
-- alter table items alter column user_id drop not null;
-- alter table outfits alter column user_id drop not null;
-- alter table wear_log alter column user_id drop not null;
--
-- alter table daily_state drop constraint if exists daily_state_pkey;
-- alter table daily_state alter column user_id drop not null;
-- alter table daily_state add constraint daily_state_pkey primary key (day);
--
-- alter table app_settings drop constraint if exists app_settings_pkey;
-- alter table app_settings alter column user_id drop not null;
-- alter table app_settings add column if not exists id text;
-- update app_settings set id = 'singleton' where id is null;
-- alter table app_settings alter column id set default 'singleton';
-- alter table app_settings add constraint app_settings_pkey primary key (id);
--
-- drop policy if exists "item-images: own folder select" on storage.objects;
-- drop policy if exists "item-images: own folder insert" on storage.objects;
-- drop policy if exists "item-images: own folder update" on storage.objects;
-- drop policy if exists "item-images: own folder delete" on storage.objects;
-- drop policy if exists "item-images full access" on storage.objects;
-- create policy "item-images full access"
--   on storage.objects
--   for all
--   to anon, authenticated, service_role
--   using (bucket_id = 'item-images')
--   with check (bucket_id = 'item-images');
--
-- commit;
