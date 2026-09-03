"use server";

import { revalidatePath } from "next/cache";
import {
  fetchDailySuggestion,
  fetchOccasionTags,
} from "@/lib/data/wardrobe-repository";
import { getLocalToday } from "@/lib/server/weather";
import { supabase } from "@/lib/supabase/client";
import type { DailySuggestion, OccasionTag } from "@/lib/types";

/** Occasion selection, re-rolling the suggestion, and logging what was worn. */

export interface SuggestionResponse {
  suggestion?: DailySuggestion;
  /** The AI fallback failed — the suggestion is still present and usable. */
  error?: string;
}

/**
 * Re-requests today's suggestion. Selecting an occasion persists it for the
 * day, so a reload keeps it; nothing is written to wear_log until "Wore this".
 */
export async function requestSuggestion({
  occasion,
  excludeOutfitIds = [],
  excludeItemIds = [],
  persistOccasion = true,
}: {
  occasion: string | null;
  excludeOutfitIds?: string[];
  excludeItemIds?: string[];
  persistOccasion?: boolean;
}): Promise<SuggestionResponse> {
  if (persistOccasion) {
    const today = await getLocalToday();
    const { error } = await supabase.from("daily_state").upsert({
      day: today,
      occasion_tag: occasion,
      updated_at: new Date().toISOString(),
    });
    // Losing the selection on reload is a small cost; failing the whole
    // request over it would be a bigger one.
    if (error) console.warn(`daily_state upsert failed: ${error.message}`);
  }

  try {
    const { suggestion, error } = await fetchDailySuggestion({
      occasion,
      excludeOutfitIds,
      excludeItemIds,
    });
    return { suggestion, error };
  } catch (err) {
    console.error("requestSuggestion failed:", err);
    return { error: "Couldn't put a suggestion together — try again." };
  }
}

export interface LogWearResult {
  error?: string;
}

/** Records that today's suggestion was actually worn. */
export async function logWear({
  outfitId,
  itemIds,
  occasion,
}: {
  outfitId: string | null;
  itemIds: string[];
  occasion: string | null;
}): Promise<LogWearResult> {
  if (itemIds.length === 0) return { error: "Nothing to log." };

  const worn_on = await getLocalToday();

  // Tapping twice shouldn't write two rows for the same thing on the same day.
  const { data: todaysRows } = await supabase
    .from("wear_log")
    .select("outfit_id, item_ids")
    .eq("worn_on", worn_on);

  const wanted = new Set(itemIds);
  const alreadyLogged = (todaysRows ?? []).some((row) => {
    if (outfitId) return row.outfit_id === outfitId;
    const logged = (row.item_ids ?? []) as string[];
    return (
      logged.length === wanted.size && logged.every((id) => wanted.has(id))
    );
  });

  if (alreadyLogged) return {};

  const { error } = await supabase.from("wear_log").insert({
    outfit_id: outfitId,
    // Stored either way: for a saved outfit this is a snapshot of what it
    // contained today, which survives the outfit later being edited or deleted.
    item_ids: itemIds,
    worn_on,
    occasion_tag: occasion,
  });

  if (error) {
    console.error("logWear failed:", error);
    return { error: "Couldn't save that — try again." };
  }

  revalidatePath("/");
  return {};
}

export interface AddOccasionResult {
  tag?: OccasionTag;
  error?: string;
}

/** Turns "Coffee Run" into the tag `coffee-run`, reusing an existing match. */
function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export async function addOccasion(label: string): Promise<AddOccasionResult> {
  const trimmed = label.trim();
  if (!trimmed) return { error: "Give it a name." };
  if (trimmed.length > 24) return { error: "Keep it under 24 characters." };

  const id = slugify(trimmed);
  if (!id) return { error: "Use a few letters or numbers." };

  const existing = await fetchOccasionTags();
  const match = existing.find((tag) => tag.id === id);
  if (match) return { tag: match };

  const { error } = await supabase
    .from("occasion_tags")
    .insert({ id, label: trimmed });

  if (error) {
    console.error("addOccasion failed:", error);
    return { error: "Couldn't add that one — try again." };
  }

  revalidatePath("/");
  return { tag: { id, label: trimmed } };
}
