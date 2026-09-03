"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase/client";

/**
 * Edits to an existing item. Only the name for now — category and the colours
 * are shown read-only in ItemDetailPanel by design (the colours are derived
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
  const patch: { name?: string } = {};

  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { error: "Name can't be empty." };
    patch.name = name;
  }

  if (Object.keys(patch).length === 0) return {};

  const { error } = await supabase.from("items").update(patch).eq("id", input.id);
  if (error) {
    console.error("updateItem failed:", error);
    return { error: "Couldn't save that — try again." };
  }

  revalidatePath("/");
  return {};
}
