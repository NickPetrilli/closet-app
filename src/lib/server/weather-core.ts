import type { Weather, WeatherIcon } from "@/lib/types";

/**
 * The pure half of the weather feature: URL construction, the WMO code table,
 * and the raw-payload to `Weather` normalisation. No network, no database, no
 * value imports — which is what lets scripts/check-weather.mjs run this exact
 * code under `node --experimental-strip-types` instead of a copy of it.
 * The I/O half (fetching, the app_settings row, the cache) lives in weather.ts.
 */

export const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

export interface GeocodeResultRow {
  name?: string;
  admin1?: string;
  country?: string;
  country_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface GeocodeMatch {
  /** Display label, e.g. "Boston, Massachusetts, US". */
  label: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export function geocodeUrl(query: string): string {
  return `${GEOCODE_URL}?name=${encodeURIComponent(
    query
  )}&count=5&language=en&format=json`;
}

export function forecastUrl(latitude: number, longitude: number): string {
  return (
    `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
    "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch" +
    "&timezone=auto&forecast_days=1"
  );
}

/** Turns a raw geocoding row into "City, Region, CC" with the blanks dropped. */
export function labelFor(row: GeocodeResultRow): string {
  return [row.name, row.admin1, row.country_code].filter(Boolean).join(", ");
}

export function toGeocodeMatches(rows: GeocodeResultRow[]): GeocodeMatch[] {
  return rows
    .filter(
      (row): row is GeocodeResultRow & { latitude: number; longitude: number } =>
        typeof row.latitude === "number" && typeof row.longitude === "number"
    )
    .map((row) => ({
      label: labelFor(row),
      latitude: row.latitude,
      longitude: row.longitude,
      // Geocoding always returns an IANA zone, but don't trust it blindly.
      timezone: row.timezone ?? "auto",
    }));
}

/** WMO weather code to the label and glyph the card shows. */
const WEATHER_CODES: Record<number, { label: string; icon: WeatherIcon }> = {
  0: { label: "Clear", icon: "sun" },
  1: { label: "Mostly clear", icon: "sun" },
  2: { label: "Partly cloudy", icon: "cloud-sun" },
  3: { label: "Overcast", icon: "cloud" },
  45: { label: "Fog", icon: "fog" },
  48: { label: "Freezing fog", icon: "fog" },
  51: { label: "Light drizzle", icon: "drizzle" },
  53: { label: "Drizzle", icon: "drizzle" },
  55: { label: "Heavy drizzle", icon: "drizzle" },
  56: { label: "Freezing drizzle", icon: "drizzle" },
  57: { label: "Freezing drizzle", icon: "drizzle" },
  61: { label: "Light rain", icon: "rain" },
  63: { label: "Rain", icon: "rain" },
  65: { label: "Heavy rain", icon: "rain" },
  66: { label: "Freezing rain", icon: "rain" },
  67: { label: "Freezing rain", icon: "rain" },
  71: { label: "Light snow", icon: "snow" },
  73: { label: "Snow", icon: "snow" },
  75: { label: "Heavy snow", icon: "snow" },
  77: { label: "Snow grains", icon: "snow" },
  80: { label: "Rain showers", icon: "rain" },
  81: { label: "Rain showers", icon: "rain" },
  82: { label: "Heavy rain showers", icon: "rain" },
  85: { label: "Snow showers", icon: "snow" },
  86: { label: "Snow showers", icon: "snow" },
  95: { label: "Thunderstorm", icon: "storm" },
  96: { label: "Thunderstorm", icon: "storm" },
  99: { label: "Thunderstorm", icon: "storm" },
};

export function describeWeatherCode(code: number): {
  label: string;
  icon: WeatherIcon;
} {
  return WEATHER_CODES[code] ?? { label: "Cloudy", icon: "cloud" };
}

/** Cache key — two decimals is ~1km, plenty for a city forecast. */
export function locationKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

/** Today's date in the location's own timezone, as YYYY-MM-DD. */
export function localDate(timezone: string, now = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  try {
    return new Intl.DateTimeFormat("en-CA", {
      ...options,
      timeZone: timezone === "auto" ? undefined : timezone,
    }).format(now);
  } catch {
    // An unknown zone shouldn't take the card down — fall back to server local.
    return new Intl.DateTimeFormat("en-CA", options).format(now);
  }
}

export interface ForecastResponse {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
}

function round(value: number | undefined, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.round(value)
    : fallback;
}

/** Raw Open-Meteo payload to the stable `Weather` shape we cache and render. */
export function normaliseForecast(json: ForecastResponse): Weather {
  const current = json.current ?? {};
  const daily = json.daily ?? {};

  const code = round(current.weather_code);
  const { label, icon } = describeWeatherCode(code);
  const tempF = round(current.temperature_2m);

  return {
    tempF,
    feelsLikeF: round(current.apparent_temperature, tempF),
    hiF: round(daily.temperature_2m_max?.[0], tempF),
    loF: round(daily.temperature_2m_min?.[0], tempF),
    precipProbability: round(daily.precipitation_probability_max?.[0]),
    windMph: round(current.wind_speed_10m),
    code,
    condition: label,
    icon,
    // is_day arrives as 1/0; treat a missing value as daytime.
    isDay: current.is_day === undefined ? true : current.is_day === 1,
  };
}
