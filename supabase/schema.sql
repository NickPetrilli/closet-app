-- Jenna's Closet — database schema (Prompt 2, no-auth single-user variant).
-- Run this once in the Supabase dashboard: Project → SQL Editor → New query → paste → Run.
--
-- No RLS/auth: this app has a single user and the anon key is trusted for
-- both read and write. See the note in docs/PROJECT_PLAN.md before ever
-- deploying this publicly — an exposed anon key with RLS off means anyone
-- with the URL could read/write the tables directly.

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
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

create table if not exists outfits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vibe text not null check (vibe in ('office', 'evening', 'weekend', 'summer', 'autumn', 'street')),
  created_at timestamptz not null default now()
);

create table if not exists outfit_items (
  outfit_id uuid not null references outfits (id) on delete cascade,
  item_id uuid not null references items (id) on delete cascade,
  position int not null default 0,
  primary key (outfit_id, item_id)
);

-- Explicit grants: some newer Supabase projects don't auto-grant anon/
-- service_role access to tables created via the SQL editor, which surfaces
-- as "permission denied for table X" even with RLS off. Being explicit
-- here is what actually makes the no-auth setup above work.
alter table items disable row level security;
alter table outfits disable row level security;
alter table outfit_items disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on items, outfits, outfit_items to anon, authenticated, service_role;

-- Public storage bucket for item photos (public read; writes only happen
-- via the seed script / future upload flow, both using a trusted key).
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

-- Storage grants for the same no-auth reason as above. A grant alone isn't
-- enough for storage.objects — unlike the app's own tables, it ships with
-- RLS on and no permissive policy, which silently blocks anon/service_role
-- writes (reads still work, because the bucket's own "public" flag serves
-- reads independently of RLS). Unlike items/outfits, this table is owned
-- by Supabase, not you, so RLS can't just be switched off here — an
-- explicit policy is the supported way in instead.
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.buckets to anon, authenticated, service_role;

drop policy if exists "item-images full access" on storage.objects;
create policy "item-images full access"
  on storage.objects
  for all
  to anon, authenticated, service_role
  using (bucket_id = 'item-images')
  with check (bucket_id = 'item-images');
