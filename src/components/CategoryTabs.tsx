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
            className={`eyebrow shrink-0 border px-5 py-2.5 transition-colors duration-200 ${
              isActive
                ? "border-ink bg-ink text-cream"
                : "border-line-dark text-ink-soft hover:border-ink hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </nav>
  );
}
