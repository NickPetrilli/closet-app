"use client";

import { useActionState, useRef, useState, type KeyboardEvent } from "react";
import { signIn, signUp, type AuthFormState } from "@/lib/actions/auth";
import { MAX_FIRST_NAME_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth-rules";
import { AuthHeading } from "./AuthShell";
import {
  Field,
  FormError,
  INPUT_CLASS,
  PasswordInput,
  SubmitButton,
} from "./AuthFields";

export type AuthMode = "sign-in" | "create";

const MODES: { value: AuthMode; label: string }[] = [
  { value: "sign-in", label: "Sign in" },
  { value: "create", label: "Create account" },
];

const initialState: AuthFormState = {};

/**
 * One card, two modes. Email lives up here so it carries across a switch:
 * someone who starts typing into the wrong tab doesn't have to type it twice.
 * Each mode's own form owns its action state, so an error from one never
 * shows up under the other, and switching away clears it.
 */
export function SignInForm({ initialMode }: { initialMode: AuthMode }) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const tabRefs = useRef<Record<AuthMode, HTMLButtonElement | null>>({
    "sign-in": null,
    create: null,
  });

  function choose(next: AuthMode) {
    setMode(next);
    // Keep the choice across a reload without adding a history entry per tap.
    // Next's router picks up native history calls, so this doesn't fight it.
    const url = next === "create" ? "?mode=create" : window.location.pathname;
    window.history.replaceState(null, "", url);
  }

  // Tabs pattern: one tab stop for the group, arrows move between tabs.
  function handleTabKey(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = mode === "sign-in" ? "create" : "sign-in";
    choose(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Sign in or create an account"
        className="flex gap-1 rounded-full border border-edge-subtle bg-surface-sunken/50 p-1"
      >
        {MODES.map((option) => {
          const active = option.value === mode;
          return (
            <button
              key={option.value}
              ref={(el) => {
                tabRefs.current[option.value] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${option.value}`}
              aria-selected={active}
              aria-controls={`panel-${option.value}`}
              tabIndex={active ? 0 : -1}
              onClick={() => choose(option.value)}
              onKeyDown={handleTabKey}
              className={`btn-label min-h-10 flex-1 cursor-pointer rounded-full px-2 whitespace-nowrap transition-colors duration-250 ${
                active
                  ? "bg-accent text-on-accent shadow-card"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Keyed by mode so the swap fades in instead of snapping, and so each
          form's action state starts clean when it's shown. */}
      <div
        key={mode}
        role="tabpanel"
        id={`panel-${mode}`}
        aria-labelledby={`tab-${mode}`}
        className="animate-fade-in mt-8"
      >
        {mode === "sign-in" ? (
          <SignInPanel email={email} onEmailChange={setEmail} />
        ) : (
          <CreateAccountPanel email={email} onEmailChange={setEmail} />
        )}
      </div>
    </>
  );
}

interface PanelProps {
  email: string;
  onEmailChange: (email: string) => void;
}

// All inputs below are controlled on purpose: React 19 resets an uncontrolled
// form after every action completes, errors included, so a wrong password
// would otherwise clear the email along with it. Success redirects, so there
// is never a filled form left behind to clear.

function SignInPanel({ email, onEmailChange }: PanelProps) {
  // Passed straight to useActionState, not wrapped, so the form still submits
  // before hydration on a slow connection.
  const [state, formAction, isPending] = useActionState(signIn, initialState);
  const [password, setPassword] = useState("");

  return (
    <>
      <AuthHeading eyebrow="Welcome back" title="Sign in to your closet" />

      <form action={formAction} className="mt-7 flex flex-col gap-5">
        <Field id="sign-in-email" label="Email">
          <EmailInput id="sign-in-email" value={email} onChange={onEmailChange} />
        </Field>

        <Field id="sign-in-password" label="Password">
          <PasswordInput
            id="sign-in-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            enterKeyHint="go"
          />
        </Field>

        {!isPending && <FormError message={state.error} />}

        <div className="mt-1">
          <SubmitButton pending={isPending} label="Sign in" pendingLabel="Signing in…" />
        </div>
      </form>

      <PasswordNote />
    </>
  );
}

function CreateAccountPanel({ email, onEmailChange }: PanelProps) {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");

  return (
    <>
      <AuthHeading eyebrow="New here" title="Start your own closet">
        Every account gets a closet of its own.
      </AuthHeading>

      <form action={formAction} className="mt-7 flex flex-col gap-5">
        <Field id="create-first-name" label="First name">
          <input
            id="create-first-name"
            name="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            maxLength={MAX_FIRST_NAME_LENGTH}
            autoComplete="given-name"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className={INPUT_CLASS}
          />
        </Field>

        <Field id="create-email" label="Email">
          <EmailInput id="create-email" value={email} onChange={onEmailChange} />
        </Field>

        <Field
          id="create-password"
          label="Password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
        >
          <PasswordInput
            id="create-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            enterKeyHint="go"
            aria-describedby="create-password-hint"
          />
        </Field>

        {!isPending && <FormError message={state.error} />}

        <div className="mt-1">
          <SubmitButton
            pending={isPending}
            label="Create account"
            pendingLabel="Creating your closet…"
          />
        </div>
      </form>

      <PasswordNote />
    </>
  );
}

/**
 * No emails can be sent from this app, so there is no reset link to offer.
 * Said on both tabs: on "Create account" it's a heads-up before it matters.
 */
function PasswordNote() {
  return (
    <p className="meta mt-7 border-t border-edge-subtle pt-5 text-center text-pretty text-ink-tertiary">
      Forgot your password? Ask whoever set up the closet to reset it.
    </p>
  );
}

function EmailInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      id={id}
      name="email"
      type="email"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      autoComplete="email"
      inputMode="email"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="next"
      className={INPUT_CLASS}
    />
  );
}
