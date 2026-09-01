"use server";

import { fetchAritziaProduct } from "@/lib/server/aritzia-fetch";
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
  return processAndInsertItem({ name, category, buffer, contentType: file.type });
}

export async function addItemFromUrl(formData: FormData): Promise<AddItemResult> {
  const url = (formData.get("url") as string | null)?.trim();
  if (!url) return { error: "Paste a product link." };

  try {
    const product = await fetchAritziaProduct(url);
    return processAndInsertItem({
      name: product.name,
      category: product.category,
      buffer: product.buffer,
      contentType: product.contentType,
      productUrl: url,
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Couldn't fetch that link.",
    };
  }
}
