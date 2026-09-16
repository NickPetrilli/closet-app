"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MAX_FIRST_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth-rules";
import {
  GATE_COOKIE,
  GATE_MAX_AGE_SECONDS,
  currentGateToken,
  isSitePassword,
  isGateConfigured,
  isGateCookieValid,
} from "@/lib/gate";
import { getSupabase } from "@/lib/supabase/server";

/** Shape for useActionState: success redirects, so only errors come back. */
export interface AuthFormState {
  error?: string;
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function unlock(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if (!isGateConfigured()) {
    return { error: "The password for this closet hasn't been set up yet." };
  }

  const password = field(formData, "password");
  if (!password.trim()) return { error: "Enter the password." };

  if (!(await isSitePassword(password))) {
    // A small, fixed delay makes guessing the password by script slow.
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { error: "That password isn't right." };
  }

  const token = await currentGateToken();
  (await cookies()).set(GATE_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE_SECONDS,
  });
  redirect("/sign-in");
}

export async function signIn(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("signIn failed:", error.message);
    return { error: "That email and password don't match." };
  }

  redirect("/");
}

export async function signUp(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  // Re-checked here, not just in middleware: a Server Action can be called
  // without ever loading the page it lives on.
  const gate = (await cookies()).get(GATE_COOKIE)?.value;
  if (!(await isGateCookieValid(gate))) {
    return { error: "Enter the closet password first." };
  }

  const firstName = field(formData, "firstName").trim();
  const email = field(formData, "email").trim();
  const password = field(formData, "password");

  if (!firstName) return { error: "Tell us your first name." };
  if (firstName.length > MAX_FIRST_NAME_LENGTH) {
    return { error: "That name is a little long." };
  }
  if (!email) return { error: "Enter your email." };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName } },
  });

  if (error) {
    console.error("signUp failed:", error.message);
    if (/already registered|already exists/i.test(error.message)) {
      return { error: "There's already an account for that email. Sign in instead." };
    }
    if (/password/i.test(error.message)) {
      // Supabase's own minimum (6 by default) is stricter than ours until it
      // is lowered in the dashboard; pass its wording through.
      return { error: error.message };
    }
    return { error: "Couldn't create that account. Try again." };
  }

  if (!data.session) {
    // Supabase returns no session when "Confirm email" is on, and it can't
    // send that email to anyone outside the project team anyway.
    return {
      error:
        "Account created, but Supabase is waiting on an email confirmation. Turn off \"Confirm email\" in Supabase, then sign in.",
    };
  }

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
