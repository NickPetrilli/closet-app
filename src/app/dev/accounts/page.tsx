import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HangerIcon } from "@/components/HangerIcon";
import { APP_NAME } from "@/lib/config";
import { switchToAccount } from "@/lib/actions/dev-auth";
import { getSession } from "@/lib/auth";
import { listDevAccounts, isDevSwitcherEnabled } from "@/lib/server/dev-accounts";

export const metadata: Metadata = { title: "Switch account · dev" };

// The account list comes from the live project, so it must never be cached.
export const dynamic = "force-dynamic";

/**
 * Local-only: sign in as any account with one click, for loading clothes into
 * someone's closet from this machine (the Aritzia link mode only runs here).
 * Returns a 404 anywhere the switcher is disabled.
 */
export default async function DevAccountsPage() {
  if (!isDevSwitcherEnabled()) notFound();

  const [accounts, { user }] = await Promise.all([
    listDevAccounts(),
    getSession(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {/* The mark doubles as the way back to the closet. */}
      <Link
        href="/"
        className="inline-flex items-center gap-2.5 text-ink transition-colors hover:text-accent"
        aria-label="Back to the closet"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-edge-subtle bg-surface-raised/70 text-accent shadow-card">
          <HangerIcon className="h-5 w-5" />
        </span>
        <span className="font-serif text-xl tracking-tight">{APP_NAME}</span>
      </Link>

      <p className="eyebrow mt-8 text-accent">Local development only</p>
      <h1 className="mt-1.5 font-serif text-3xl tracking-tight">
        Switch account
      </h1>
      <p className="meta mt-3 text-ink-secondary">
        Signs this machine in as any account, no password needed. Disabled on
        the deployed site. Whoever is signed in here owns the items an Aritzia
        link adds.
      </p>

      <p className="meta mt-6 rounded-control border border-edge bg-surface-sunken px-4 py-3 text-ink-secondary">
        Currently signed in as{" "}
        <span className="text-ink">{user?.email ?? "nobody"}</span>
      </p>

      {accounts.length === 0 ? (
        <p className="mt-8 rounded-card border border-edge-subtle bg-surface-raised p-6 text-center text-ink-secondary">
          No accounts yet. Create one through the normal sign-up page, then come
          back here.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {accounts.map((account) => {
            const isCurrent = account.id === user?.id;
            return (
              <li
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-edge-subtle bg-surface-raised p-4 shadow-card"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {account.firstName ?? "(no name)"}
                  </p>
                  <p className="meta truncate text-ink-tertiary">
                    {account.email}
                  </p>
                  <p className="meta mt-1 text-ink-secondary">
                    {account.itemCount} {account.itemCount === 1 ? "piece" : "pieces"} ·{" "}
                    {account.outfitCount}{" "}
                    {account.outfitCount === 1 ? "outfit" : "outfits"}
                  </p>
                </div>
                {/* The marker keeps the switch button's pill size, so rows line up. */}
                {isCurrent ? (
                  <span className="btn-label shrink-0 rounded-full border border-edge px-5 py-2.5 text-ink-tertiary">
                    Signed in
                  </span>
                ) : (
                  <form action={switchToAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <button
                      type="submit"
                      className="btn-label btn-secondary shrink-0 cursor-pointer rounded-full px-5 py-2.5"
                    >
                      Switch to {account.firstName ?? account.email}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
