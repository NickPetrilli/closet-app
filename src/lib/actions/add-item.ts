"use server";

import { requireUser } from "@/lib/auth";
import { fetchProductFromUrl } from "@/lib/server/product-fetch";
import {
  forgetProduct,
  recallProduct,
  rememberProduct,
} from "@/lib/server/product-preview-cache";
import { processAndInsertItem } from "@/lib/server/item-pipeline";
import type { Category } from "@/lib/types";

const VALID_CATEGORIES: Category[] = [
  "tops",
  "jackets",
  "bottoms",
  "accessories",
  "shoes",
];

export interface AddItemResult {
  error?: string;
}

export async function addItem(formData: FormData): Promise<AddItemResult> {
  // Before anything else: a signed-out caller must never reach remove.bg.
  const { supabase, user } = await requireUser();
  const name = (formData.get("name") as string | null)?.trim();
  const category = formData.get("category") as Category | null;
  const file = formData.get("photo") as File | null;

  if (!name) return { error: "Name is required." };
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return { error: "Choose a category." };
  }
  if (!file || file.size === 0) return { error: "Choose a photo." };
  if (!file.type.startsWith("image/")) {
    return { error: "That file isn't an image." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return processAndInsertItem(
    { name, category, buffer, contentType: file.type },
    { supabase, userId: user.id }
  );
}

export interface ProductPreview {
  error?: string;
  preview?: {
    /** Identifies the fetched photo held on the server until it is saved. */
    token: string;
    name: string;
    category: Category | null;
    /** A small inline copy of the photo, purely to show in the modal. */
    imageDataUrl: string;
  };
}

/**
 * First half of adding from a link: open the shop's page and report what was
 * found, without saving anything.
 *
 * Nothing here spends a remove.bg credit — background removal happens only
 * once the preview is confirmed — so a wrong link, a blocked shop or a photo
 * that turns out to be the wrong garment costs nothing but a moment.
 */
export async function previewItemFromUrl(
  formData: FormData
): Promise<ProductPreview> {
  await requireUser();
  const url = (formData.get("url") as string | null)?.trim();
  if (!url) return { error: "Paste a product link." };

  try {
    const product = await fetchProductFromUrl(url);
    const token = rememberProduct({
      url,
      name: product.name,
      category: product.category,
      buffer: product.buffer,
      contentType: product.contentType,
    });

    // Downscaled for the modal: the original can be a megabyte or more, and
    // this only has to look right in a small tile.
    const { default: sharp } = await import("sharp");
    const thumbnail = await sharp(product.buffer)
      .resize({ width: 480, withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toBuffer();

    return {
      preview: {
        token,
        name: product.name,
        category: product.category,
        imageDataUrl: `data:image/jpeg;base64,${thumbnail.toString("base64")}`,
      },
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Couldn't fetch that link.",
    };
  }
}

/**
 * Second half: save the previewed item, with whatever name and category the
 * user settled on. Falls back to re-fetching if the preview has expired,
 * so a modal left open over lunch still works.
 */
export async function addPreviewedItem(formData: FormData): Promise<AddItemResult> {
  const { supabase, user } = await requireUser();

  const token = (formData.get("token") as string | null) ?? "";
  const name = (formData.get("name") as string | null)?.trim();
  const category = formData.get("category") as Category | null;
  const url = (formData.get("url") as string | null)?.trim();

  if (!name) return { error: "Name is required." };
  if (!category || !VALID_CATEGORIES.includes(category)) {
    return { error: "Choose a category." };
  }

  let held = recallProduct(token);
  if (!held) {
    if (!url) return { error: "That preview expired — fetch the link again." };
    try {
      const refetched = await fetchProductFromUrl(url);
      held = {
        url,
        name: refetched.name,
        category: refetched.category,
        buffer: refetched.buffer,
        contentType: refetched.contentType,
        expiresAt: 0,
      };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Couldn't fetch that link.",
      };
    }
  }

  const result = await processAndInsertItem(
    {
      name,
      category,
      buffer: held.buffer,
      contentType: held.contentType,
      productUrl: held.url,
    },
    { supabase, userId: user.id }
  );

  // Keep the photo around on failure so a retry doesn't re-open the shop.
  if (!result.error) forgetProduct(token);
  return result;
}
