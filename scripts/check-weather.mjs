// Phase 1 weather check — geocodes a place, fetches its forecast through the
// app's own URL builders + normaliser, then exercises the weather_cache table.
// Run twice to see the cache go from MISS to HIT. Run with:
//   node --experimental-strip-types --env-file=.env scripts/check-weather.mjs "Boston, MA"
//
// It imports src/lib/server/weather-core.ts directly (that module has no value
// imports and no "@/" aliases, so Node's type stripping can load it as-is) —
// so this tests the real mapping code, not a copy of it.
import { createClient } from "@supabase/supabase-js";
import {
  forecastUrl,
  geocodeUrl,
  localDate,
  locationKey,
  normaliseForecast,
  toGeocodeMatches,
} from "../src/lib/server/weather-core.ts";

const CACHE_MAX_AGE_MS = 30 * 60 * 1000; // must match weather.ts

const query = process.argv[2] ?? "Boston, MA";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key);

async function getJson(target) {
  const response = await fetch(target, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Open-Meteo responded ${response.status}`);
  return response.json();
}

// 1. Geocode
const geo = await getJson(geocodeUrl(query));
const matches = toGeocodeMatches(geo.results ?? []);
if (matches.length === 0) {
  console.error(`No geocoding match for "${query}".`);
  process.exit(1);
}
console.log(`Geocoded "${query}" — ${matches.length} match(es):`);
for (const m of matches) console.log(`  · ${m.label}  (${m.timezone})`);

const place = matches[0];
const cacheKey = locationKey(place.latitude, place.longitude);
const day = localDate(place.timezone);
console.log(`\nUsing: ${place.label}   cache key ${cacheKey}   local date ${day}`);

// 2. Cache read — is today's payload already there and fresh?
const { data: cached, error: readError } = await supabase
  .from("weather_cache")
  .select("payload, fetched_at")
  .eq("location_key", cacheKey)
  .eq("fetched_for", day)
  .maybeSingle();

if (readError) {
  console.error(`\nweather_cache read failed: ${readError.message}`);
  console.error("Has supabase/migrations/001-weather.sql been run yet?");
  process.exit(1);
}

const ageMs = cached ? Date.now() - new Date(cached.fetched_at).getTime() : null;
const fresh = ageMs !== null && ageMs >= 0 && ageMs < CACHE_MAX_AGE_MS;

if (fresh) {
  console.log(
    `\nCACHE HIT — cached ${Math.round(ageMs / 1000)}s ago, no API call needed.`
  );
  console.log(cached.payload);
} else {
  console.log(
    cached
      ? `\nCACHE STALE (${Math.round(ageMs / 60000)} min old) — refetching.`
      : "\nCACHE MISS — fetching from Open-Meteo."
  );
  const weather = normaliseForecast(
    await getJson(forecastUrl(place.latitude, place.longitude))
  );
  console.log(weather);

  const { error: writeError } = await supabase.from("weather_cache").upsert({
    location_key: cacheKey,
    fetched_for: day,
    payload: weather,
    fetched_at: new Date().toISOString(),
  });
  if (writeError) {
    console.error(`\nweather_cache write failed: ${writeError.message}`);
    process.exit(1);
  }
  console.log("\nCached. Run again to confirm the hit path.");
}

// 3. app_settings reachability (does not write — the UI owns that).
const { data: settings, error: settingsError } = await supabase
  .from("app_settings")
  .select("location_label, timezone, updated_at")
  .eq("id", "singleton")
  .maybeSingle();

if (settingsError) {
  console.error(`\napp_settings read failed: ${settingsError.message}`);
  process.exit(1);
}
console.log(
  `\napp_settings: ${
    settings ? `${settings.location_label} (${settings.timezone})` : "not set yet"
  }`
);
