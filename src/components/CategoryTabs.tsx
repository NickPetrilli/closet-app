"use client";

import { FILTER_OPTIONS, type CategoryFilter } from "@/lib/types";

export function CategoryTabs({
  active,
  onChange,
}: {
  active: CategoryFilter;
  onChange: (filter: CategoryFilter) => void;
}) {
  return (
    <div className="relative min-w-0">
      <nav
        aria-label="Filter by category"
        className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1"
      >
        {FILTER_OPTIONS.map((option) => {
          const isActive = option.value === active;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.value)}
              className={`eyebrow shrink-0 cursor-pointer rounded-full border px-5 py-2.5 transition-all duration-200 ${
                isActive
                  ? "border-ink bg-ink text-cream shadow-sm"
                  : "border-line-dark bg-cream/50 text-ink-soft hover:border-accent hover:bg-cream hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </nav>
      {/* Fade hints that the row scrolls when the tabs don't all fit
          (e.g. the Outfits tab's action buttons take more room). */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-r from-transparent to-[var(--color-ground)]"
      />
    </div>
  );
}
