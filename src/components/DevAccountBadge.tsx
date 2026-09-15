import Link from "next/link";
import { getSession } from "@/lib/auth";
import { isDevSwitcherEnabled } from "@/lib/server/dev-accounts";

/**
 * A small corner chip naming the account this dev machine is signed in as,
 * linking to the switcher. Renders nothing unless the local-only switcher is
 * enabled, so it never appears on the deployed site.
 */
export async function DevAccountBadge() {
  if (!isDevSwitcherEnabled()) return null;
  const { user } = await getSession();

  return (
    <Link
      href="/dev/accounts"
      className="meta fixed bottom-3 left-3 z-[80] rounded-full border border-edge bg-surface-raised/95 px-3 py-1.5 text-ink-secondary shadow-card backdrop-blur-sm transition-colors hover:text-ink"
      // Kept out of the way of the app's own controls, and clearly labelled as
      // a development affordance rather than part of the product.
      title="Local development only — switch account"
    >
      dev · {user?.email ?? "signed out"}
    </Link>
  );
}
