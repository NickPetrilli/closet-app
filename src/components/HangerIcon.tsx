/**
 * The app's little hanger mark. Shared by the auth screens' brand lockup and
 * the local dev pages, so the two can't drift apart.
 */
export function HangerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.6 6.6a2.4 2.4 0 1 1 3.35 2.2c-.58.25-.95.8-.95 1.43V11" />
      <path d="M12 11l8.25 5.5c.8.53.42 1.75-.53 1.75H4.28c-.95 0-1.33-1.22-.53-1.75L12 11Z" />
    </svg>
  );
}
