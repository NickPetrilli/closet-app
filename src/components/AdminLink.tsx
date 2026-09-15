import Link from "next/link";

/**
 * Header shortcut to the local-only account switcher, so managing someone's
 * closet never means typing a URL. WardrobeView renders it only when the page
 * says the switcher is enabled, which is never true on the deployed site —
 * see src/lib/server/dev-accounts.ts.
 */
export function AdminLink() {
  return (
    <Link
      href="/dev/accounts"
      aria-label="Switch account (local development only)"
      title="Switch account — local development only"
      className="btn-label mb-1 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-edge bg-surface-raised/50 px-3 text-ink-secondary transition-colors duration-150 hover:border-accent hover:text-accent"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
        <path d="M4 20a8 8 0 0 1 16 0" />
      </svg>
      Admin
    </Link>
  );
}
