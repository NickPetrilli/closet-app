import type { Metadata } from "next";
import { APP_NAME } from "@/lib/config";

/**
 * Shown by the service worker when a navigation can't reach the network.
 * Deliberately static and dependency-free — no Supabase, no client JS — so it
 * renders from the cache with nothing but its own HTML.
 */
export const metadata: Metadata = {
  title: `Offline — ${APP_NAME}`,
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-muted/30 text-accent">
        <CloudOffIcon className="h-8 w-8" />
      </span>

      <p className="eyebrow mt-7 text-ink-tertiary">No connection</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">
        You&rsquo;re offline
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
        {APP_NAME} needs a connection to load your wardrobe. Everything is safe
        where it is — try again once you&rsquo;re back on.
      </p>

      <a
        href="/"
        className="btn-label mt-8 cursor-pointer rounded-full border border-edge bg-ink px-7 py-3 text-on-accent transition-colors hover:bg-accent"
      >
        Try again
      </a>
    </main>
  );
}

function CloudOffIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 17.6h8.15a3.4 3.4 0 0 0 .4-6.78 4.9 4.9 0 0 0-9.35-1.12A3.55 3.55 0 0 0 8 17.6Z" />
      <path d="M4.4 3.6l15.2 16.8" />
    </svg>
  );
}
