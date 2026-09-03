"use server";

import { revalidatePath } from "next/cache";
import { geocodeLocation, saveStoredLocation } from "@/lib/server/weather";

/**
 * Location settings. Note what crosses the wire: the browser gets labels and
 * an index, never latitude/longitude. `saveLocation` re-runs the same
 * geocoding query server-side and picks by index, so the coordinates are
 * resolved entirely on the server and can't be tampered with from the client.
 */

/** A match as the client sees it — display text only, no coordinates. */
export interface LocationChoice {
  index: number;
  label: string;
}

export interface SearchLocationsResult {
  error?: string;
  matches?: LocationChoice[];
}

export async function searchLocations(
  query: string
): Promise<SearchLocationsResult> {
  const trimmed = query.trim();
  if (!trimmed) return { error: "Type a city to search." };

  try {
    const matches = await geocodeLocation(trimmed);
    if (matches.length === 0) {
      return { error: `No places found for "${trimmed}". Try adding a state or country.` };
    }
    return { matches: matches.map((m, index) => ({ index, label: m.label })) };
  } catch {
    return { error: "Couldn't reach the location service. Try again in a moment." };
  }
}

export interface SaveLocationResult {
  error?: string;
  label?: string;
}

/**
 * `expectedLabel` guards against the (unlikely) case of the geocoder returning
 * a different ordering between the search and the pick — better a "search
 * again" than silently saving the wrong city.
 */
export async function saveLocation(
  query: string,
  index: number,
  expectedLabel: string
): Promise<SaveLocationResult> {
  const trimmed = query.trim();
  if (!trimmed) return { error: "Type a city to search." };

  let matches;
  try {
    matches = await geocodeLocation(trimmed);
  } catch {
    return { error: "Couldn't reach the location service. Try again in a moment." };
  }

  const choice = matches[index];
  if (!choice || choice.label !== expectedLabel) {
    return { error: "That result went stale — search again." };
  }

  try {
    await saveStoredLocation(choice);
  } catch (err) {
    // Database details (missing table, revoked grant) belong in the server
    // log, not in front of the user.
    console.error("saveLocation failed:", err);
    return { error: "Couldn't save your location — try again." };
  }

  revalidatePath("/");
  return { label: choice.label };
}
