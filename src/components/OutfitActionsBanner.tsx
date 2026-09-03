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
    <div className="flex flex-col gap-5 rounded-card border border-accent-muted bg-gradient-to-r from-accent-muted/25 via-surface-raised to-blush/25 p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div>
        <p className="eyebrow text-accent">Outfits</p>
        <p className="mt-1.5 font-serif text-lg tracking-tight sm:text-xl">
          Let AI put a look together, or build one yourself.
        </p>
      </div>
      <div className="flex w-full shrink-0 flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <CreateOutfitButton items={items} />
        <GenerateOutfitsButton items={items} />
      </div>
    </div>
  );
}
