import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm, type AuthMode } from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in · Closet",
};

/**
 * Sign in or create an account. Middleware only lets people reach this page
 * once they're past the password gate, and sends signed-in users home.
 *
 * `?mode=create` opens straight onto "Create account", so a link sent to
 * someone new lands on the tab they need.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { mode } = await searchParams;
  const initialMode: AuthMode = mode === "create" ? "create" : "sign-in";

  return (
    <AuthShell>
      <SignInForm initialMode={initialMode} />
    </AuthShell>
  );
}
