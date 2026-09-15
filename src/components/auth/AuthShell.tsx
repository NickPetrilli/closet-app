import type { ReactNode } from "react";
import { HangerIcon } from "@/components/HangerIcon";

/**
 * The frame both auth screens sit in: the neutral "Closet" mark, one raised
 * card, and an optional quiet note underneath.
 *
 * A server component with no client JS of its own, so the lock screen paints
 * from HTML alone on a slow phone connection. The forms inside are the only
 * client islands.
 */
export function AuthShell({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main
      className="flex flex-col items-center justify-center px-5 py-10 sm:px-6 sm:py-16"
      // Fills the screen exactly. body already pads for the notch and home
      // indicator, so a plain 100dvh would overflow by those insets and leave
      // the installed app scrolling a few pixels on an empty page. Inline
      // rather than an arbitrary utility so the env() names can't be mangled
      // by Tailwind's calc() whitespace normalization.
      style={{
        minHeight:
          "calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
      }}
    >
      <div className="w-full max-w-[25rem]">
        <header className="animate-fade-in flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-edge-subtle bg-surface-raised/70 text-accent shadow-card">
            <HangerIcon className="h-6 w-6" />
          </span>
          <p className="mt-3.5 font-serif text-2xl tracking-tight">Closet</p>
        </header>

        <section className="animate-fade-in mt-7 rounded-sheet border border-edge-subtle bg-surface-raised px-5 pt-8 pb-7 shadow-panel [animation-delay:90ms] min-[380px]:px-6 sm:px-9 sm:pt-10 sm:pb-9">
          {children}
        </section>

        {footer && (
          <div className="animate-fade-in meta mx-auto mt-6 max-w-[22rem] text-center text-ink-tertiary [animation-delay:180ms]">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}

/**
 * Eyebrow, serif heading, a short blush rule (the screen's one warm note), and
 * a line of copy. Shared so both screens open with the same rhythm.
 */
export function AuthHeading({
  eyebrow,
  title,
  children,
  id,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  /** Lets a form or tab panel point aria-labelledby at the heading. */
  id?: string;
}) {
  return (
    <div className="text-center">
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h1
        id={id}
        className="mt-2 font-serif text-[1.875rem] leading-tight tracking-tight text-balance"
      >
        {title}
      </h1>
      <span
        aria-hidden="true"
        className="mx-auto mt-4 block h-px w-10 bg-blush"
      />
      {children && (
        <p className="mt-4 text-sm leading-relaxed text-pretty text-ink-secondary">
          {children}
        </p>
      )}
    </div>
  );
}

