import { supabase } from "@/lib/supabase/client";
import type { Weather } from "@/lib/types";
import {
  forecastUrl,
  geocodeUrl,
  localDate,
  locationKey,
  normaliseForecast,
  toGeocodeMatches,
  type ForecastResponse,
  type GeocodeMatch,
  type GeocodeResultRow,
} from "./weather-core";

/**
 * Weather for the daily suggestion card, via Open-Meteo — no API key, no
 * signup, no card (10k calls/day on the free non-commercial tier). Everything
 * here is server-only: the browser never sees Jenna's coordinates, and the
 * home page is force-dynamic, so an unguarded fetch would run on every load.
 * The `weather_cache` table is what keeps that down to a couple of calls a day.
 * Pure mapping logic lives in weather-core.ts so a script can exercise it.
 */

/**
 * How stale a cached reading may be before we refetch. The cache row is keyed
 * by local date, but "current temperature" moves through the day, so a
 * date-only cache would show breakfast's weather at dinner. Half an hour caps
 * us at ~48 calls/day, while a reload a minute later still hits the cache.
 */
const CACHE_MAX_AGE_MS = 30 * 60 * 1000;

/** Open-Meteo request timeout — the card degrades gracefully, so don't hang. */
const REQUEST_TIMEOUT_MS = 8000;

export type { GeocodeMatch };

export interface StoredLocation {
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    // Already cached in our own table; don't let Next's fetch cache it too.
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Open-Meteo responded ${response.status}`);
  }
  return response.json();
}

/** Free-text place search. Returns up to 5 matches, best first. */
export async function geocodeLocation(query: string): Promise<GeocodeMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const json = (await getJson(geocodeUrl(trimmed))) as {
    results?: GeocodeResultRow[];
  };
  return toGeocodeMatches(json.results ?? []);
}

/** Reads the saved location. Server-only — coordinates never leave this layer. */
export async function readStoredLocation(): Promise<StoredLocation | null> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("location_label, latitude, longitude, timezone")
    .eq("id", "singleton")
    .maybeSingle();

  if (error || !data) return null;
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    return null;
  }

  return {
    label: data.location_label ?? "",
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone ?? "auto",
  };
}

export async function saveStoredLocation(location: StoredLocation): Promise<void> {
  const { error } = await supabase.from("app_settings").upsert({
    id: "singleton",
    location_label: location.label,
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`saveStoredLocation: ${error.message}`);
}

export async function fetchForecast(
  latitude: number,
  longitude: number
): Promise<Weather> {
  const json = (await getJson(
    forecastUrl(latitude, longitude)
  )) as ForecastResponse;
  return normaliseForecast(json);
}

interface CacheRow {
  payload: Weather;
  fetched_at: string;
}

async function readCache(key: string, day: string): Promise<CacheRow | null> {
  const { data, error } = await supabase
    .from("weather_cache")
    .select("payload, fetched_at")
    .eq("location_key", key)
    .eq("fetched_for", day)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as CacheRow;
}

async function writeCache(
  key: string,
  day: string,
  payload: Weather
): Promise<void> {
  const { error } = await supabase.from("weather_cache").upsert({
    location_key: key,
    fetched_for: day,
    payload,
    fetched_at: new Date().toISOString(),
  });
  // A failed cache write costs an extra API call, not the feature.
  if (error) console.warn(`weather_cache upsert failed: ${error.message}`);
}

/**
 * Today's date in Jenna's own timezone, as YYYY-MM-DD. Everything dated — the
 * weather cache, the wear log, the day's chosen occasion — keys off this
 * rather than the server's clock, which on Vercel is UTC and rolls over
 * mid-evening for a US location.
 */
export async function getLocalToday(): Promise<string> {
  const location = await readStoredLocation();
  return localDate(location?.timezone ?? "auto");
}

/**
 * Today's weather for the saved location — null when no location is set (the
 * card shows its "set your location" state) or the fetch failed with nothing
 * cached to fall back on.
 */
export async function getWeather(): Promise<Weather | null> {
  const location = await readStoredLocation();
  if (!location) return null;

  const key = locationKey(location.latitude, location.longitude);
  const day = localDate(location.timezone);

  const cached = await readCache(key, day);
  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age >= 0 && age < CACHE_MAX_AGE_MS) return cached.payload;
  }

  try {
    const weather = await fetchForecast(location.latitude, location.longitude);
    await writeCache(key, day, weather);
    return weather;
  } catch (err) {
    console.warn(
      `Open-Meteo forecast failed: ${err instanceof Error ? err.message : err}`
    );
    // Stale-but-real beats an empty card.
    return cached?.payload ?? null;
  }
}
