import type { Weather } from "@/lib/types";

/**
 * How the app reduces a forecast to the two facts that actually drive
 * clothing choices: how cold it feels, and whether you'll get wet. Shared
 * between the card's copy and the suggestion scoring so they can never
 * disagree about what "cold" means.
 */

export type TemperatureBand =
  | "freezing"
  | "cold"
  | "cool"
  | "mild"
  | "warm"
  | "hot";

export const TEMPERATURE_BANDS: TemperatureBand[] = [
  "freezing",
  "cold",
  "cool",
  "mild",
  "warm",
  "hot",
];

/** Keyed off feels-like, not the raw temperature — wind chill changes what you'd wear. */
export function temperatureBand(feelsLikeF: number): TemperatureBand {
  if (feelsLikeF < 35) return "freezing";
  if (feelsLikeF < 48) return "cold";
  if (feelsLikeF < 60) return "cool";
  if (feelsLikeF < 73) return "mild";
  if (feelsLikeF < 84) return "warm";
  return "hot";
}

/** Precipitation below this reads as noise, not a forecast worth dressing for. */
export const NOTABLE_PRECIP = 20;

export function isWet(weather: Weather): boolean {
  return (
    weather.precipProbability >= NOTABLE_PRECIP ||
    weather.icon === "rain" ||
    weather.icon === "drizzle" ||
    weather.icon === "storm" ||
    weather.icon === "snow"
  );
}
