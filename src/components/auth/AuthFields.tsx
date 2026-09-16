"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

/**
 * Form pieces shared by the unlock, sign-in and create-account forms.
 *
 * Inputs are text-base (16px) on purpose. The rest of the app uses 14px fields,
 * but iOS Safari zooms the whole page into any focused input under 16px, and
 * on these screens that would happen on the very first tap.
 */
export const INPUT_BASE_CLASS =
  "w-full appearance-none border border-edge bg-transparent px-3.5 text-ink transition-colors duration-150 placeholder:text-ink-tertiary focus:border-ink";

/**
 * Height and size are kept out of the base so a caller can choose its own:
 * two conflicting utilities in one class list resolve by stylesheet order, not
 * by which comes last in the string.
 */
export const INPUT_CLASS = `${INPUT_BASE_CLASS} h-12 text-base`;

export function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="eyebrow block text-ink-tertiary">
        {label}
      </label>
      <div className="mt-2.5">{children}</div>
      {hint && (
        <p id={`${id}-hint`} className="meta mt-2 text-ink-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * A password input with a Show/Hide toggle. On a phone keyboard a mistyped
 * password is invisible, and the only error the server can give back is "that
 * doesn't match", so being able to look is worth the extra control.
 */
export function PasswordInput({
  id,
  className,
  ...props
}: { id: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // The right padding is always added, whatever styling the caller
        // passes, so text can never run under the Show button.
        className={`${className ?? INPUT_CLASS} pr-[4.5rem]`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-controls={id}
        aria-pressed={visible}
        aria-label={visible ? "Hide password" : "Show password"}
        // 44px tall and wide enough to hit with a thumb, tucked inside the
        // field's right edge rather than hanging off it.
        className="btn-label absolute inset-y-0 right-0 flex min-w-[4rem] cursor-pointer items-center justify-center px-3 text-ink-tertiary transition-colors duration-150 hover:text-ink"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/**
 * The server's message after a failed attempt.
 *
 * Callers render it only while no attempt is in flight, so a retry that fails
 * again unmounts and remounts it: the fade replays, which shows the second
 * attempt really happened, and role="alert" announces it again to VoiceOver
 * even when the wording is identical.
 */
export function FormError({
  message,
  centered = false,
}: {
  message?: string;
  centered?: boolean;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={`animate-fade-in text-sm leading-snug text-pretty text-error ${
        centered ? "text-center" : ""
      }`}
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  pending,
  label,
  pendingLabel,
}: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn-label btn-primary flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full px-6"
    >
      {pending && <Spinner />}
      {pending ? pendingLabel : label}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5 animate-spin motion-reduce:hidden"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
