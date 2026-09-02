"use server";

import { revalidatePath } from "next/cache";
import { fetchItems, fetchOutfits } from "@/lib/data/wardrobe-repository";
import {
  generateOutfitCandidates,
  type GenerateOutfitsResult,
  type OutfitCandidate,
} from "@/lib/server/generate-outfits";
import { supabase } from "@/lib/supabase/client";
import type { Category, OutfitVibe } from "@/lib/types";

export type { OutfitCandidate };

const REQUIRED_CATEGORIES: Category[] = ["tops", "bottoms", "shoes"];
const VALID_VIBES: OutfitVibe[] = [
  "office",
  "evening",
  "weekend",
  "summer",
  "autumn",
  "street",
];

/** Generates candidates only — nothing is written to the database yet. */
export async function generateOutfits(count: number): Promise<GenerateOutfitsResult> {
  const [items, outfits] = await Promise.all([fetchItems(), fetchOutfits()]);
  return generateOutfitCandidates(items, outfits, count);
}

export interface SaveOutfitsResult {
  error?: string;
  savedCount?: number;
}

/** Shared persistence path for both the AI-review flow and manual creation. */
export async function saveOutfits(candidates: OutfitCandidate[]): Promise<SaveOutfitsResult> {
  if (candidates.length === 0) return { error: "Nothing selected to save." };

  let savedCount = 0;
  for (const candidate of candidates) {
    const { data: outfitRow, error: outfitError } = await supabase
      .from("outfits")
      .insert({ name: candidate.name, vibe: candidate.vibe })
      .select("id")
      .single();
    if (outfitError || !outfitRow) continue;

    const rows = candidate.itemIds.map((item_id, position) => ({
      outfit_id: outfitRow.id,
      item_id,
      position,
    }));
    const { error: itemsError } = await supabase.from("outfit_items").insert(rows);
    if (itemsError) {
      // Roll back the now-orphaned outfit row rather than leave a headless one.
      await supabase.from("outfits").delete().eq("id", outfitRow.id);
      continue;
    }
    savedCount++;
  }

  if (savedCount === 0) return { error: "Couldn't save any outfits — try again." };
  revalidatePath("/");
  return { savedCount };
}

export interface CreateOutfitInput {
  name: string;
  vibe: OutfitVibe;
  itemIds: string[];
}

export interface CreateOutfitResult {
  error?: string;
}

export async function createOutfit(input: CreateOutfitInput): Promise<CreateOutfitResult> {
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  if (!VALID_VIBES.includes(input.vibe)) return { error: "Choose a vibe." };
  if (input.itemIds.length === 0) {
    return { error: "Pick at least a top, bottom, and pair of shoes." };
  }

  const { data: rows, error: fetchError } = await supabase
    .from("items")
    .select("id, category")
    .in("id", input.itemIds);
  if (fetchError) return { error: `Couldn't validate items: ${fetchError.message}` };

  const categoriesPresent = new Set((rows ?? []).map((r) => r.category as Category));
  const missing = REQUIRED_CATEGORIES.filter((c) => !categoriesPresent.has(c));
  if (missing.length > 0) {
    return { error: `Missing a ${missing.join(" and a ")}.` };
  }

  const result = await saveOutfits([{ name, vibe: input.vibe, itemIds: input.itemIds }]);
  return result.error ? { error: result.error } : {};
}

export async function deleteOutfit(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("outfits").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/");
  return {};
}
