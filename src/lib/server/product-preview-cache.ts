import { randomUUID } from "node:crypto";
import type { Category } from "@/lib/types";

/**
 * Holds a fetched-but-not-yet-saved product between the two halves of the
 * Add Item link flow: one action opens the shop's page and shows what it
 * found, a second saves it once the user agrees.
 *
 * In memory on purpose. The link flow only ever runs on a local dev machine
 * (it needs a real browser window — see product-fetch.ts), so there is exactly
 * one process and nothing to share state with. The alternative, handing the
 * full-size photo down to the browser and back up again, would move megabytes
 * through the page for no benefit.
 *
 * Entries expire so a browsed-and-abandoned preview can't pin a photo in
 * memory, and the map is capped so a long session can't grow without bound.
 */
interface PendingProduct {
  url: string;
  name: string;
  category: Category | null;
  buffer: Buffer;
  contentType: string;
  expiresAt: number;
}

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 20;

const pending = new Map<string, PendingProduct>();

function sweep() {
  const now = Date.now();
  for (const [token, entry] of pending) {
    if (entry.expiresAt <= now) pending.delete(token);
  }
  // Still too many? Drop the oldest — Map keeps insertion order.
  while (pending.size > MAX_ENTRIES) {
    const oldest = pending.keys().next();
    if (oldest.done) break;
    pending.delete(oldest.value);
  }
}

export function rememberProduct(
  product: Omit<PendingProduct, "expiresAt">
): string {
  sweep();
  const token = randomUUID();
  pending.set(token, { ...product, expiresAt: Date.now() + TTL_MS });
  return token;
}

/** Null when the token is unknown or has expired; the caller re-fetches then. */
export function recallProduct(token: string): PendingProduct | null {
  sweep();
  return pending.get(token) ?? null;
}

export function forgetProduct(token: string): void {
  pending.delete(token);
}
