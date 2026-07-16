"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mixHex, suggestionSwatches, vibeGradient } from "@/lib/color";
import {
  CATEGORY_OPTIONS,
  type Category,
  type ClothingItem,
} from "@/lib/types";
import { GarmentGlyph, ModelFigure } from "./GarmentGlyph";

export function ItemDetailPanel({
  item,
  onClose,
  onUpdate,
}: {
  /** null when closed; the panel stays mounted so it can slide out. */
  item: ClothingItem | null;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ClothingItem>) => void;
}) {
  const open = item !== null;

  // Keep rendering the last item while sliding out.
  const lastItemRef = useRef<ClothingItem | null>(null);
  if (item) lastItemRef.current = item;
  const shown = item ?? lastItemRef.current;

  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  useEffect(() => {
    setActiveSourceIndex(0);
  }, [shown?.id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Suggestion swatches stay stable per item, regardless of edits.
  const suggestions = useMemo(
    () => (shown ? suggestionSwatches(shown.primaryColorHex) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown?.id]
  );

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop — wardrobe stays visible, dimmed */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={shown ? `Details for ${shown.name}` : "Item details"}
        className={`absolute top-0 right-0 h-full w-full max-w-2xl overflow-y-auto border-l border-line-dark bg-cream transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {shown && (
          <div className="flex min-h-full flex-col">
            {/* Hero — item rendered on the user, scene vibe follows the color */}
            <div
              className="relative h-[420px] shrink-0 overflow-hidden transition-[background] duration-500"
              style={{ background: vibeGradient(shown.primaryColorHex) }}
            >
              <ModelFigure className="absolute left-1/2 top-[6%] h-[88%] -translate-x-1/2 text-ink/40" />
              <GarmentGlyph
                category={shown.category}
                colorHex={shown.primaryColorHex}
                className="absolute left-1/2 top-[24%] w-[19%] -translate-x-1/2 drop-shadow-sm"
              />

              {/* Editable name chip */}
              <div className="absolute top-5 left-5 border border-line-dark bg-cream px-4 py-2.5">
                <input
                  value={shown.name}
                  onChange={(e) => onUpdate(shown.id, { name: e.target.value })}
                  aria-label="Item name"
                  size={Math.max(shown.name.length, 4)}
                  className="max-w-[16rem] bg-transparent font-serif text-xl leading-none focus:outline-none"
                />
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center border border-line-dark bg-cream text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden="true"
                >
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>

              {/* Isolated cutout, floating bottom-right */}
              <GarmentGlyph
                category={shown.category}
                colorHex={shown.primaryColorHex}
                className="absolute right-6 bottom-6 w-28 drop-shadow-md"
              />

              {/* Source photo thumbnails */}
              <div className="absolute bottom-6 left-6 flex gap-1.5 border border-line bg-cream/95 p-1.5">
                {shown.sourcePhotoUrls.map((url, index) => {
                  const isActive = index === activeSourceIndex;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveSourceIndex(index)}
                      aria-pressed={isActive}
                      aria-label={`Source photo ${index + 1}`}
                      className={`relative flex h-12 w-16 items-center justify-center border transition-colors ${
                        isActive
                          ? "border-ink"
                          : "border-line hover:border-line-dark"
                      }`}
                      style={{
                        background: vibeGradient(
                          mixHex(shown.primaryColorHex, "#8D8478", 0.2)
                        ),
                      }}
                    >
                      <GarmentGlyph
                        category={shown.category}
                        colorHex={mixHex(shown.primaryColorHex, "#57503F", 0.2)}
                        className="w-7"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form */}
            <div className="flex flex-1 flex-col gap-8 px-8 py-8">
              {/* Name / Category */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="eyebrow text-muted">Name</p>
                  <input
                    value={shown.name}
                    onChange={(e) =>
                      onUpdate(shown.id, { name: e.target.value })
                    }
                    className="mt-2.5 w-full border border-line-dark bg-transparent px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <p className="eyebrow text-muted">Category</p>
                  <div className="relative mt-2.5">
                    <select
                      value={shown.category}
                      onChange={(e) =>
                        onUpdate(shown.id, {
                          category: e.target.value as Category,
                        })
                      }
                      className="w-full appearance-none border border-line-dark bg-transparent px-3.5 py-2.5 pr-9 text-sm focus:border-ink focus:outline-none"
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      viewBox="0 0 12 8"
                      className="pointer-events-none absolute top-1/2 right-3.5 h-2 w-3 -translate-y-1/2 text-ink-soft"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      aria-hidden="true"
                    >
                      <path d="M1 1.5l5 5 5-5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Colors */}
              <div>
                <p className="eyebrow text-muted">Colors</p>
                <div className="mt-4 grid grid-cols-2 divide-x divide-line border-t border-line pt-6">
                  {/* Primary */}
                  <div className="pr-7">
                    <p className="text-sm font-medium">Primary color</p>
                    <div className="mt-4 flex items-center gap-4">
                      <span
                        className="h-12 w-12 shrink-0 border border-line-dark"
                        style={{ backgroundColor: shown.primaryColorHex }}
                      />
                      <div>
                        <p className="eyebrow text-muted">Selected</p>
                        <p className="mt-0.5 text-sm font-medium tracking-[0.06em] uppercase">
                          {shown.primaryColorHex}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 flex items-baseline justify-between">
                      <p className="text-xs text-ink-soft">Image suggestions</p>
                      <p className="text-[10px] text-muted">Click to apply</p>
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      {suggestions.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          aria-label={`Apply ${hex} as primary color`}
                          onClick={() =>
                            onUpdate(shown.id, { primaryColorHex: hex })
                          }
                          className={`h-9 w-9 border transition-transform hover:-translate-y-0.5 ${
                            hex === shown.primaryColorHex
                              ? "border-ink ring-1 ring-ink ring-offset-2 ring-offset-cream"
                              : "border-line-dark"
                          }`}
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // Stub — real eyedropper-on-image flow comes with the
                        // image pipeline in a later pass.
                      }}
                      className="eyebrow mt-7 w-full border border-line-dark px-4 py-3 text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-cream"
                    >
                      Pick primary color from image
                    </button>
                  </div>

                  {/* Secondary */}
                  <div className="pl-7">
                    <p className="text-sm font-medium">
                      Secondary color{" "}
                      <span className="eyebrow ml-1.5 text-muted">
                        Optional
                      </span>
                    </p>
                    {shown.secondaryColorHex ? (
                      <div className="mt-4">
                        <div className="flex items-center gap-4">
                          <span
                            className="h-12 w-12 shrink-0 border border-line-dark"
                            style={{
                              backgroundColor: shown.secondaryColorHex,
                            }}
                          />
                          <div>
                            <p className="eyebrow text-muted">Selected</p>
                            <p className="mt-0.5 text-sm font-medium tracking-[0.06em] uppercase">
                              {shown.secondaryColorHex}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate(shown.id, { secondaryColorHex: null })
                          }
                          className="eyebrow mt-5 text-muted transition-colors hover:text-ink"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-sm text-muted">
                          No distinct secondary color detected.
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdate(shown.id, {
                              secondaryColorHex: mixHex(
                                shown.primaryColorHex,
                                "#F4F1EA",
                                0.55
                              ),
                            })
                          }
                          className="eyebrow mt-5 border border-line-dark px-4 py-3 text-ink-soft transition-colors hover:border-ink hover:bg-ink hover:text-cream"
                        >
                          Add secondary color
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Helper text */}
              <p className="mt-auto border-t border-line pt-5 text-xs leading-relaxed text-muted">
                Primary colors come from the image. A secondary is suggested
                only when a distinct color has meaningful coverage.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
