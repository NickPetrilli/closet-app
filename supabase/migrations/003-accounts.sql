-- Phase 9 (accounts), part 1 of 2 — run once in the Supabase dashboard:
-- Project → SQL Editor → New query → paste → Run.
--
-- What it does: adds a nullable `user_id` column (owner) to every per-person
-- table, plus the indexes the account-aware code upserts against. Nothing is
-- removed or made stricter, and RLS stays off.
--
-- Safe to run BEFORE deploying the accounts code, while the current no-auth
-- site is still live: that code never names user_id, so its inserts just get
-- a null owner (auth.uid() is null for the anon key); app_settings keeps its
-- `id` primary key so the old `id = 'singleton'` upsert still works; and
-- daily_state keeps its primary key on `day` so the old `onConflict: "day"`
-- upsert still works. Every statement is idempotent, so re-running is harmless.
--
-- Part 2 (004-accounts-rls.sql) runs after Jenna has created her account: it
-- hands the existing rows to her, tightens the keys and switches RLS on.

-- ---------------------------------------------------------------------------
-- items, outfits, wear_log: owned rows.
-- ---------------------------------------------------------------------------
-- `default auth.uid()` fills the owner from the signed-in user's JWT, so an
-- insert that forgets user_id still lands in the right closet. Nullable for
-- now only because the existing rows have no owner until part 2.
-- The default is set in a second statement on purpose: adding a column WITH a
-- default back-fills existing rows from it, and those rows must stay null
-- (unowned) rather than pick up whoever happens to be running this script.
alter table items
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table items alter column user_id set default auth.uid();
alter table outfits
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table outfits alter column user_id set default auth.uid();
alter table wear_log
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table wear_log alter column user_id set default auth.uid();

-- Every read is "this user's rows", and the RLS policies in part 2 filter on
-- the same column, so each table needs it indexed.
create index if not exists items_user_id_idx on items (user_id);
create index if not exists outfits_user_id_idx on outfits (user_id);
create index if not exists wear_log_user_id_idx on wear_log (user_id);

-- ---------------------------------------------------------------------------
-- daily_state: one row per (user, day).
-- ---------------------------------------------------------------------------
alter table daily_state
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table daily_state alter column user_id set default auth.uid();

-- The new code upserts with `onConflict: "user_id,day"`, which needs a unique
-- index on exactly those columns. The old primary key on `day` stays until
-- part 2 (the live code still conflicts on it). Existing rows have a null
-- user_id, and nulls are distinct in a plain unique index, so this can't clash.
create unique index if not exists daily_state_user_id_day_key
  on daily_state (user_id, day);

-- ---------------------------------------------------------------------------
-- app_settings: one row per user instead of one row total.
-- ---------------------------------------------------------------------------
alter table app_settings
  add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table app_settings alter column user_id set default auth.uid();

-- The new code upserts with `onConflict: "user_id"`.
create unique index if not exists app_settings_user_id_key
  on app_settings (user_id);

-- The `id = 'singleton'` check would reject every row after the first, so it
-- has to go. Postgres names an inline column check `app_settings_id_check`;
-- the loop drops it under whatever name it actually has, without touching any
-- other check that might be added later.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.app_settings'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%singleton%'
  loop
    execute format('alter table public.app_settings drop constraint %I', constraint_name);
  end loop;
end
$$;

-- New code never sends `id`; a random default keeps inserts valid until part 2
-- drops the column. The live code still sends 'singleton' explicitly.
alter table app_settings alter column id set default gen_random_uuid()::text;

-- ---------------------------------------------------------------------------
-- occasion_tags: null owner = seeded tag everyone sees.
-- ---------------------------------------------------------------------------
-- No `default auth.uid()` here on purpose: null is meaningful (shared), so the
-- app always sets user_id explicitly on the tags a person adds.
alter table occasion_tags
  add column if not exists user_id uuid
  references auth.users (id) on delete cascade;

-- outfit_items has no user_id (ownership comes through outfit_id), and
-- weather_cache has none either (a shared public forecast cache).

-- ---------------------------------------------------------------------------
-- Grants for signed-in users.
-- ---------------------------------------------------------------------------
-- These already exist from schema.sql / earlier migrations, but this project
-- has been caught out by missing grants before ("permission denied for table
-- X"), and the new code talks to the database as `authenticated`, not `anon`.
grant usage on schema public to authenticated, service_role;
grant all on
  items, outfits, outfit_items, wear_log, daily_state, app_settings,
  occasion_tags, weather_cache
to authenticated, service_role;
