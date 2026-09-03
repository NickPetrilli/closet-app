-- Phase 1 (weather) migration — run once in the Supabase dashboard:
-- Project → SQL Editor → New query → paste → Run.
-- This is the same DDL that was appended to supabase/schema.sql; that file is
-- the full from-scratch schema, this one is just the delta for an existing DB.

create table if not exists app_settings (
  id text primary key default 'singleton' check (id = 'singleton'),
  location_label text,
  latitude double precision,
  longitude double precision,
  timezone text,
  updated_at timestamptz not null default now()
);

create table if not exists weather_cache (
  location_key text not null,
  fetched_for date not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (location_key, fetched_for)
);

alter table app_settings disable row level security;
alter table weather_cache disable row level security;

grant all on app_settings, weather_cache to anon, authenticated, service_role;
