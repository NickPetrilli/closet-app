-- Closet — full database schema, from scratch.
-- Run this once on a NEW project in the Supabase dashboard:
-- Project → SQL Editor → New query → paste → Run.
--
-- This is the end state after every file in supabase/migrations/ has run; an
-- existing database gets there through those deltas instead (see
-- docs/DEPLOYMENT.md). Keep the two in step when either changes.
--
-- Access model: Supabase Auth (email + password). Every per-person table has a
-- `user_id` owner column and Row Level Security, so a signed-in user can only
-- see and change their own closet. The anon key has no access to any app
-- table; the app talks to the database as `authenticated`, carrying the user's
-- session. service_role bypasses RLS and is used only by local scripts.
--
-- Policies use `(select auth.uid())` rather than a bare `auth.uid()`: wrapped
-- in a subquery, Postgres evaluates it once per statement instead of once per
-- row (Supabase's documented RLS performance advice).

grant usage on schema public to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Wardrobe: items, outfits and the items in each outfit.
-- ---------------------------------------------------------------------------

-- `default auth.uid()` fills the owner from the signed-in user's JWT, so an
-- insert that forgets user_id still lands in the right closet.
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (category in ('tops', 'jackets', 'bottoms', 'accessories', 'shoes')),
  silhouette text,
  primary_color_hex text not null,
  secondary_color_hex text,
  image_url text not null,
  cutout_image_url text,
  source_photo_urls text[] not null default '{}',
  product_url text,
  created_at timestamptz not null default now()
);

create index if not exists items_user_id_idx on items (user_id);

create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  vibe text not null check (vibe in ('office', 'evening', 'weekend', 'summer', 'autumn', 'street')),
  created_at timestamptz not null default now()
);

create index if not exists outfits_user_id_idx on outfits (user_id);

-- No user_id: a link row belongs to whoever owns its outfit (see the policy).
create table if not exists outfit_items (
  outfit_id uuid not null references outfits (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  position int not null default 0,
  primary key (outfit_id, item_id)
);

-- ---------------------------------------------------------------------------
-- Phase 1 — weather (per-user location settings + a shared forecast cache).
-- ---------------------------------------------------------------------------

-- One settings row per user. Keying the table on user_id makes "exactly one
-- row each" a database invariant, so reads and upserts never pick between rows.
create table if not exists app_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  location_label text,
  latitude double precision,
  longitude double precision,
  timezone text,
  updated_at timestamptz not null default now()
);

-- The home page is force-dynamic, so without this every page load would hit
-- Open-Meteo. Keyed by rounded coords + the local date the payload is for;
-- `fetched_at` lets the app refresh within the day without a second row.
-- Deliberately shared (no user_id): it holds public forecasts, nothing
-- personal, and two people in the same town should share one cached forecast.
create table if not exists weather_cache (
  location_key text not null,
  fetched_for date not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (location_key, fetched_for)
);

-- ---------------------------------------------------------------------------
-- Phase 3 - occasion tagging, the wear log, and per-day state.
-- ---------------------------------------------------------------------------
-- What was actually worn. outfit_id for a saved outfit; item_ids covers
-- ad-hoc combinations that were never saved as an outfit.
create table if not exists wear_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  outfit_id uuid references outfits (id) on delete set null,
  item_ids uuid[] not null default '{}',
  worn_on date not null default current_date,
  occasion_tag text,
  created_at timestamptz not null default now()
);

-- The recently-worn lookup is always "the last N days", so index the date.
create index if not exists wear_log_worn_on_idx on wear_log (worn_on desc);
create index if not exists wear_log_user_id_idx on wear_log (user_id);

-- Deliberately not an enum: new occasions are added from the UI, and a
-- closed check constraint would need a migration for each one.
-- user_id null = a seeded tag everyone sees; non-null = added by that user.
-- No `default auth.uid()` on purpose, since null is meaningful here. The
-- unique key lets two people each add "brunch", while NULLS NOT DISTINCT still
-- stops a duplicate seeded id. Requires Postgres 15+.
create table if not exists occasion_tags (
  id text not null,
  user_id uuid references auth.users (id) on delete cascade,
  label text not null,
  constraint occasion_tags_user_id_id_key unique nulls not distinct (user_id, id)
);

-- `where not exists` rather than `on conflict`, so re-running doesn't depend on
-- conflict inference against a NULLS NOT DISTINCT key.
insert into occasion_tags (id, label)
select seeded.id, seeded.label
from (values
  ('work', 'Work'),
  ('gym', 'Gym'),
  ('date', 'Date'),
  ('casual', 'Casual'),
  ('travel', 'Travel'),
  ('errands', 'Errands')
) as seeded (id, label)
where not exists (
  select 1 from occasion_tags t
  where t.user_id is null and t.id = seeded.id
);

-- Which occasion is selected for a given day, so a reload doesn't lose it.
-- Separate from wear_log because picking an occasion isn't wearing anything.
create table if not exists daily_state (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  day date not null,
  occasion_tag text,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Grants.
-- ---------------------------------------------------------------------------
-- Explicit grants: some newer Supabase projects don't auto-grant access to
-- tables created via the SQL editor, which surfaces as "permission denied for
-- table X". anon gets nothing: RLS would deny it every row anyway, and a
-- missing grant makes an accidental anon query fail loudly instead of
-- returning an empty result.
grant all on
  items, outfits, outfit_items, wear_log, daily_state, app_settings,
  occasion_tags, weather_cache
to authenticated, service_role;

revoke all on
  items, outfits, outfit_items, wear_log, daily_state, app_settings,
  occasion_tags, weather_cache
from anon;

-- ---------------------------------------------------------------------------
-- Row Level Security.
-- ---------------------------------------------------------------------------
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

-- outfit_items: a link row belongs to whoever owns its outfit. Writes must
-- additionally point at one of the user's own items, so nobody can pin
-- someone else's item id into their outfit.
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

-- weather_cache: shared, so any signed-in user may read and upsert it (upsert
-- needs select + insert + update). No delete policy: the app never deletes.
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
-- Storage: item photos.
-- ---------------------------------------------------------------------------
-- A PUBLIC bucket: the app shows images by their public URL, and public-URL
-- reads bypass storage RLS entirely. Uploads go to `<user_id>/...`, and the
-- policies below let a signed-in user write only inside their own folder
-- (storage.foldername() splits the object name into its folders).
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- storage.objects is owned by Supabase and ships with RLS on and no policies,
-- so a grant alone lets nothing through; the policies are the way in.
grant all on storage.objects to authenticated, service_role;
grant all on storage.buckets to authenticated, service_role;

-- Upload with `upsert: true` needs select + insert + update, hence all four.
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
