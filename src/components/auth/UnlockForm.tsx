"use client";

import { useActionState, useState } from "react";
import { unlock, type AuthFormState } from "@/lib/actions/auth";
import { FormError, INPUT_BASE_CLASS, SubmitButton } from "./AuthFields";

const initialState: AuthFormState = {};

export function UnlockForm() {
  // The Server Action goes to useActionState directly rather than through a
  // client wrapper, so the form still submits if it's tapped before the page
  // has hydrated on a slow connection.
  const [state, formAction, isPending] = useActionState(unlock, initialState);

  // Controlled on purpose: React 19 resets an uncontrolled form after every
  // action completes, errors included, which would wipe a mistyped code she
  // only needs to fix one letter of.
  const [password, setPassword] = useState("");

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <div>
        <label htmlFor="closet-password" className="sr-only">
          Closet password
        </label>
        <input
          id="closet-password"
          name="password"
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          // A single-purpose screen: putting the cursor in the only field is
          // the expected thing, and iOS won't force the keyboard open for it.
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Password"
          aria-invalid={Boolean(state.error) && !isPending}
          className={`${INPUT_BASE_CLASS} h-14 text-center font-serif text-2xl tracking-[0.12em] placeholder:font-sans placeholder:text-base placeholder:tracking-normal`}
        />
      </div>

      {!isPending && <FormError message={state.error} centered />}

      <SubmitButton pending={isPending} label="Enter" pendingLabel="Checking…" />
    </form>
  );
}
