"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOutfit } from "@/lib/actions/outfits";
import type { ClothingItem } from "@/lib/types";
import { OutfitFormModal, type OutfitFormValues } from "./OutfitFormModal";

/**
 * Entry point for building an outfit by hand. The form itself lives in
 * OutfitFormModal, shared with the edit action in OutfitDetailPanel.
 */
export function CreateOutfitButton({ items }: { items: ClothingItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: OutfitFormValues) {
    const result = await createOutfit(values);
    if (result.error) return result;
    router.refresh();
    return {};
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="eyebrow flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-dark px-5 py-2.5 text-ink transition-colors hover:border-ink sm:w-auto sm:justify-start"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 2v12M2 8h12" />
        </svg>
        Create Outfit
      </button>

      <OutfitFormModal
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        title="Create an outfit"
        submitLabel="Save Outfit"
        pendingLabel="Saving…"
        onSubmit={handleSubmit}
      />
    </>
  );
}
