"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

/**
 * Edits to an existing item. Only the name for now — category and the colors
 * are shown read-only in ItemDetailPanel by design (the colors are derived
 * from the photo by the add-item pipeline, so hand-editing them would just get
 * overwritten). Shaped with an optional field per column so the next editable
 * one is a small addition rather than a new action.
 */

export interface UpdateItemInput {
  id: string;
  name?: string;
}

export async function updateItem(
  input: UpdateItemInput
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  const patch: { name?: string } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { error: "Name can't be empty." };
    patch.name = name;
  }

  if (Object.keys(patch).length === 0) return {};

  // Scoped to the owner, and selecting the row back so an id that isn't
  // theirs (or no longer exists) reads as "not found" rather than a silent
  // no-op success.
  const { data, error } = await supabase
    .from("items")
    .update(patch)
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id");
  if (error) {
    console.error("updateItem failed:", error);
    return { error: "Couldn't save that — try again." };
  }
  if (!data || data.length === 0) {
    return { error: "Couldn't find that item — try refreshing." };
  }

  revalidatePath("/");
  return {};
}
