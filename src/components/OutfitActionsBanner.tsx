"use client";

import type { ClothingItem } from "@/lib/types";
import { CreateOutfitButton } from "./CreateOutfitButton";
import { GenerateOutfitsButton } from "./GenerateOutfitsButton";

/**
 * A dedicated, visually distinct banner for the two outfit-creation
 * entry points — deliberately not squeezed onto the category-tabs row,
 * since these are core actions that deserve their own presence.
 */
export function OutfitActionsBanner({ items }: { items: ClothingItem[] }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-accent-soft bg-gradient-to-r from-accent-soft/25 via-cream to-blush/25 p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="eyebrow text-accent">Outfits</p>
        <p className="mt-1.5 font-serif text-xl tracking-tight">
          Let AI put a look together, or build one yourself.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <CreateOutfitButton items={items} />
        <GenerateOutfitsButton items={items} />
      </div>
    </div>
  );
}
