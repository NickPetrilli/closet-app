"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { fetchDailySuggestion } from "@/lib/data/wardrobe-repository";
import { getLocalToday } from "@/lib/server/weather";
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
  // First, so a signed-out caller can't reach the AI fallback below.
  const { supabase, user } = await requireUser();

  if (persistOccasion) {
    const today = await getLocalToday();
    const { error } = await supabase.from("daily_state").upsert(
      {
        user_id: user.id,
        day: today,
        occasion_tag: occasion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,day" }
    );
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
  const { supabase, user } = await requireUser();
  if (itemIds.length === 0) return { error: "Nothing to log." };

  // wear_log.item_ids is a plain uuid array with no foreign key, so nothing in
  // the database stops it naming someone else's pieces. Check ownership here,
  // for the outfit too, before anything is written.
  const uniqueIds = [...new Set(itemIds)];
  const { data: ownedItems, error: ownedError } = await supabase
    .from("items")
    .select("id")
    .in("id", uniqueIds)
    .eq("user_id", user.id);
  if (ownedError) {
    console.error("logWear ownership check failed:", ownedError);
    return { error: "Couldn't save that — try again." };
  }
  if ((ownedItems ?? []).length !== uniqueIds.length) {
    return { error: "Some of those pieces couldn't be found — try refreshing." };
  }

  if (outfitId) {
    const { data: ownedOutfit, error: outfitError } = await supabase
      .from("outfits")
      .select("id")
      .eq("id", outfitId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (outfitError) {
      console.error("logWear ownership check failed:", outfitError);
      return { error: "Couldn't save that — try again." };
    }
    if (!ownedOutfit) {
      return { error: "Couldn't find that outfit — try refreshing." };
    }
  }

  const worn_on = await getLocalToday();

  // Tapping twice shouldn't write two rows for the same thing on the same day.
  const { data: todaysRows } = await supabase
    .from("wear_log")
    .select("outfit_id, item_ids")
    .eq("worn_on", worn_on)
    .eq("user_id", user.id);

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
    user_id: user.id,
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
  const { supabase, user } = await requireUser();
  const trimmed = label.trim();
  if (!trimmed) return { error: "Give it a name." };
  if (trimmed.length > 24) return { error: "Keep it under 24 characters." };

  const id = slugify(trimmed);
  if (!id) return { error: "Use a few letters or numbers." };

  // Only tags this user can already see count as a match: the seeded ones
  // (null user_id) and their own. Another person's "coffee-run" is theirs
  // alone, so it neither blocks this one nor gets handed back.
  const findVisible = () =>
    supabase
      .from("occasion_tags")
      .select("id, label")
      .eq("id", id)
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .limit(1)
      .maybeSingle();

  const { data: match, error: lookupError } = await findVisible();
  if (lookupError) {
    console.error("addOccasion lookup failed:", lookupError);
    return { error: "Couldn't add that one — try again." };
  }
  if (match) return { tag: { id: match.id, label: match.label } };

  const { error } = await supabase
    .from("occasion_tags")
    .insert({ id, label: trimmed, user_id: user.id });

  // A unique violation means it landed between the lookup and the insert (a
  // double tap). Hand back the existing tag, same as the lookup would have.
  // If it still isn't visible, the clash is with a key this user can't see,
  // which falls through to the generic error.
  if (error?.code === "23505") {
    const { data: raced } = await findVisible();
    if (raced) return { tag: { id: raced.id, label: raced.label } };
  }

  if (error) {
    console.error("addOccasion failed:", error);
    return { error: "Couldn't add that one — try again." };
  }

  revalidatePath("/");
  return { tag: { id, label: trimmed } };
}
