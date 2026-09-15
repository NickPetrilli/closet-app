import type { Metadata } from "next";
import { AuthHeading, AuthShell } from "@/components/auth/AuthShell";
import { UnlockForm } from "@/components/auth/UnlockForm";
import { isGateConfigured } from "@/lib/gate";

export const metadata: Metadata = {
  title: "Unlock · Closet",
};

// FAMILY_CODE is read per request. Prerendered at build time, this page would
// keep showing "not set up yet" after the variable is added until a redeploy.
export const dynamic = "force-dynamic";

/**
 * The lock screen in front of everything. Middleware sends anyone without a
 * session or a valid gate cookie here, and a correct code moves them on to
 * /sign-in.
 */
export default function UnlockPage() {
  if (!isGateConfigured()) {
    return (
      <AuthShell>
        <AuthHeading eyebrow="Almost ready" title="Not open just yet">
          The family code for this closet hasn&rsquo;t been set up. Once it
          has, you&rsquo;ll be able to come in from here.
        </AuthHeading>
      </AuthShell>
    );
  }

  return (
    <AuthShell footer="Don't have the code? Ask whoever shared the closet with you.">
      <AuthHeading eyebrow="Welcome" title="A private closet">
        Enter the family code to continue.
      </AuthHeading>
      <UnlockForm />
    </AuthShell>
  );
}
