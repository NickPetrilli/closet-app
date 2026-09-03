-- Phase 3 (occasion + wear log) migration — run once in the Supabase dashboard:
-- Project → SQL Editor → New query → paste → Run.
-- Same DDL as the Phase 3 block appended to supabase/schema.sql.

-- What was actually worn. outfit_id for a saved outfit; item_ids covers
-- ad-hoc combinations that were never saved as an outfit.
create table if not exists wear_log (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid references outfits (id) on delete set null,
  item_ids uuid[] not null default '{}',
  worn_on date not null default current_date,
  occasion_tag text,
  created_at timestamptz not null default now()
);

-- The recently-worn lookup is always "the last N days", so index the date.
create index if not exists wear_log_worn_on_idx on wear_log (worn_on desc);

-- Deliberately not an enum: new occasions are added from the UI, and a
-- closed check constraint would need a migration for each one.
create table if not exists occasion_tags (
  id text primary key,
  label text not null
);

insert into occasion_tags (id, label) values
  ('work', 'Work'),
  ('gym', 'Gym'),
  ('date', 'Date'),
  ('casual', 'Casual'),
  ('travel', 'Travel'),
  ('errands', 'Errands')
on conflict (id) do nothing;

-- Which occasion is selected for a given day, so a reload doesn't lose it.
-- Separate from wear_log because picking an occasion isn't wearing anything.
create table if not exists daily_state (
  day date primary key,
  occasion_tag text,
  updated_at timestamptz not null default now()
);

alter table wear_log disable row level security;
alter table occasion_tags disable row level security;
alter table daily_state disable row level security;

grant all on wear_log, occasion_tags, daily_state to anon, authenticated, service_role;
