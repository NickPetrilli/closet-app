"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
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

export interface DeleteItemResult {
  error?: string;
  /** How many outfits the piece was part of, for the confirmation message. */
  removedFromOutfits?: number;
}

/**
 * Removes a piece from the wardrobe for good.
 *
 * Its rows in `outfit_items` go with it through the foreign key's cascade, the
 * same way deleting an outfit drops its links — so an outfit that used the
 * piece survives, one piece shorter. Wear-log history is unaffected:
 * `wear_log.item_ids` is a plain uuid array kept as a snapshot of what was
 * actually worn, deliberately without a foreign key, so it stays truthful.
 */
export async function deleteItem(id: string): Promise<DeleteItemResult> {
  const { supabase, user } = await requireUser();

  // Counted before the delete, purely so the UI can say what it affected.
  const { data: links } = await supabase
    .from("outfit_items")
    .select("outfit_id")
    .eq("item_id", id);

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, image_url, cutout_image_url");
  if (error) {
    console.error("deleteItem failed:", error);
    return { error: "Couldn't delete that — try again." };
  }
  if (!data || data.length === 0) {
    return { error: "Couldn't find that item — try refreshing." };
  }

  await removeStoredPhotos(supabase, data[0]);

  revalidatePath("/");
  return { removedFromOutfits: links?.length ?? 0 };
}

/**
 * Best-effort cleanup of the photos behind a deleted item, so the storage
 * bucket doesn't fill with files nothing points at.
 *
 * Deliberately never fails the delete: the row is already gone, and the photos
 * of items added before accounts sit at flat paths outside the owner's folder,
 * which the storage policies won't let the app remove. An orphaned file is a
 * far smaller problem than an error on a delete that actually succeeded.
 */
async function removeStoredPhotos(
  supabase: SupabaseClient,
  row: { image_url: string | null; cutout_image_url: string | null }
): Promise<void> {
  const paths = [row.image_url, row.cutout_image_url]
    .map((url) => storagePathFromPublicUrl(url))
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;

  const { error } = await supabase.storage.from("item-images").remove(paths);
  if (error) {
    console.warn("deleteItem: left photos behind:", error.message, paths);
  }
}

/** The object path inside the bucket, from the public URL stored on the row. */
function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = "/object/public/item-images/";
  const at = url.indexOf(marker);
  if (at === -1) return null;
  return decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
}
