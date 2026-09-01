import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { removeBackgroundViaApi } from "@/lib/server/remove-bg-api";
import { supabase } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

function toHex(n: number) {
  return n.toString(16).padStart(2, "0");
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[™®]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Average of only the opaque (non-background) pixels — the actual garment color. */
async function averageOpaqueColorHex(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(60, 60, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent pixels
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return "#CCCCCC";
  return `#${toHex(Math.round(r / count))}${toHex(Math.round(g / count))}${toHex(Math.round(b / count))}`.toUpperCase();
}

export interface ProcessItemInput {
  name: string;
  category: Category;
  buffer: Buffer;
  contentType: string;
  productUrl?: string | null;
}

export interface ProcessItemResult {
  error?: string;
}

/** Shared by both add-item paths: photo upload and Aritzia link fetch. */
export async function processAndInsertItem({
  name,
  category,
  buffer,
  contentType,
  productUrl,
}: ProcessItemInput): Promise<ProcessItemResult> {
  const removed = await removeBackgroundViaApi(buffer, contentType);
  if (!removed.buffer) return { error: removed.error ?? "Something went wrong." };

  try {
    const cutoutBuffer = await sharp(removed.buffer)
      .trim({ threshold: 10 })
      .toBuffer();
    const primaryColorHex = await averageOpaqueColorHex(cutoutBuffer);

    const id = randomUUID();
    const slug = slugify(name) || id;
    const ext = contentType === "image/png" ? "png" : "jpg";

    const photoPath = `${id}-${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(photoPath, buffer, { contentType, upsert: true });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };
    const { data: photoUrl } = supabase.storage
      .from("item-images")
      .getPublicUrl(photoPath);

    const cutoutPath = `cutouts/${id}-${slug}.png`;
    const { error: cutoutUploadError } = await supabase.storage
      .from("item-images")
      .upload(cutoutPath, cutoutBuffer, {
        contentType: "image/png",
        upsert: true,
      });
    if (cutoutUploadError) {
      return { error: `Cutout upload failed: ${cutoutUploadError.message}` };
    }
    const { data: cutoutUrl } = supabase.storage
      .from("item-images")
      .getPublicUrl(cutoutPath);

    const { error: insertError } = await supabase.from("items").insert({
      name,
      category,
      primary_color_hex: primaryColorHex,
      secondary_color_hex: null,
      image_url: photoUrl.publicUrl,
      cutout_image_url: cutoutUrl.publicUrl,
      source_photo_urls: [],
      product_url: productUrl ?? null,
    });
    if (insertError) return { error: `Save failed: ${insertError.message}` };

    revalidatePath("/");
    return {};
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong.",
    };
  }
}
