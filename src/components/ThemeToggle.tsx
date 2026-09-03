"use client";

import { useEffect, useState } from "react";
import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  type Theme,
} from "@/lib/theme";

/**
 * Light/dark switch, sitting beside the location gear in the header.
 *
 * The theme is already applied by the inline script in the document head
 * before first paint, so this only has to read what was decided and let her
 * change it. It renders the icon for the theme it would switch TO, which is
 * how a single-button toggle stays legible.
 */
export function ThemeToggle() {
  // Starts null so the first render matches the server's HTML; the real value
  // arrives in the effect below. Rendering a guessed theme here would trip
  // hydration, since the server cannot know the choice.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "dark" : "light");
  }, []);

  // Follow the OS while she has not made an explicit choice, so changing the
  // system theme at dusk updates an open tab.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        return;
      }
      apply(e.matches ? "dark" : "light", { remember: false });
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function apply(next: Theme, { remember = true }: { remember?: boolean } = {}) {
    document.documentElement.setAttribute("data-theme", next);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", THEME_COLORS[next]);
    setTheme(next);
    if (!remember) return;
    // Blocked site data throws rather than no-opping; the theme should still
    // change for this session.
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* not remembered across reloads — acceptable */
    }
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => apply(next)}
      // Before the effect runs `theme` is null and the label would be a guess,
      // so describe the control rather than the destination.
      aria-label={theme ? `Switch to ${next} mode` : "Switch between light and dark mode"}
      title={theme ? `Switch to ${next} mode` : "Light and dark mode"}
      className="mb-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-edge bg-surface-raised/50 text-ink-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
    >
      {/* Both icons are always present and cross-faded, so the button never
          pops in after hydration and never shows the wrong one first. */}
      <span className="relative block h-4 w-4">
        <SunIcon
          className={`absolute inset-0 h-4 w-4 transition-opacity duration-150 ${
            theme === "dark" ? "opacity-100" : "opacity-0"
          }`}
        />
        <MoonIcon
          className={`absolute inset-0 h-4 w-4 transition-opacity duration-150 ${
            theme === "dark" ? "opacity-0" : "opacity-100"
          }`}
        />
      </span>
    </button>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.5 14.6A8.5 8.5 0 1 1 9.4 3.5a7 7 0 0 0 11.1 11.1Z" />
    </svg>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.2M12 19.8V22M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2 12h2.2M19.8 12H22M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  );
}
