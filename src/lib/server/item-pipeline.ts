import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { supabase } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

// Relative to the project root (the server process's cwd) — background
// removal segfaults on Windows given an absolute path or file:// URL, so
// this can't use os.tmpdir(). See scripts/remove-bg-worker.mjs.
const TEMP_DIR = ".tmp-uploads";
const WORKER_SCRIPT = join("scripts", "remove-bg-worker.mjs");

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
  const id = randomUUID();
  const slug = slugify(name) || id;
  const ext = contentType === "image/png" ? "png" : "jpg";

  mkdirSync(TEMP_DIR, { recursive: true });
  const tempInPath = join(TEMP_DIR, `${id}-in.${ext}`);
  const tempOutPath = join(TEMP_DIR, `${id}-out.png`);

  try {
    writeFileSync(tempInPath, buffer);

    // Background removal runs in a separate process — see
    // remove-bg-worker.mjs. sharp and @imgly/background-removal-node
    // segfault when loaded in the same Node process on this setup.
    try {
      execFileSync("node", [WORKER_SCRIPT, tempInPath, tempOutPath], {
        stdio: "pipe",
      });
    } catch {
      return {
        error:
          "Couldn't process that photo's background. Try a clearer photo of just the item.",
      };
    }

    const cutoutBuffer = await sharp(readFileSync(tempOutPath))
      .trim({ threshold: 10 })
      .toBuffer();
    const primaryColorHex = await averageOpaqueColorHex(cutoutBuffer);

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
  } finally {
    rmSync(tempInPath, { force: true });
    rmSync(tempOutPath, { force: true });
  }
}
