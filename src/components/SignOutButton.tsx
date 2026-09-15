"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { clearServiceWorkerCaches } from "./ServiceWorkerRegistrar";

/**
 * Clears this device's cached photos, then ends the session. The order
 * matters: once signOut() redirects to /sign-in this component is gone, and
 * the next person to sign in here shouldn't be served the last one's images.
 *
 * signOut() never resolves normally. Its redirect rejects the action promise
 * with Next's redirect error, which has to propagate (not be caught) so the
 * router performs the navigation, so there's deliberately no try/catch here.
 */
export function SignOutButton({ className = "" }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await clearServiceWorkerCaches();
      await signOut();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={className}
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
