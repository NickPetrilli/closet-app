"use client";

import { useEffect, useRef } from "react";
import { FILTER_OPTIONS, type CategoryFilter } from "@/lib/types";

export function CategoryTabs({
  active,
  onChange,
}: {
  active: CategoryFilter;
  onChange: (filter: CategoryFilter) => void;
}) {
  const activeRef = useRef<HTMLButtonElement>(null);

  // On narrow screens the strip scrolls; keep the selected tab in view so it's
  // never hidden off the edge after a change.
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [active]);

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
            ref={isActive ? activeRef : undefined}
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
  );
}
