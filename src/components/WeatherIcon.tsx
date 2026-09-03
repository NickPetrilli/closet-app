import type { WeatherIcon as WeatherIconKey } from "@/lib/types";

/**
 * Hand-drawn weather glyphs, matching the app's line-art style: 24×24,
 * currentColor stroke, 1.25 weight, round caps. Keyed off the icon name the
 * WMO code maps to (src/lib/server/weather-core.ts), so the card never has to
 * know about weather codes.
 */

/** Shared cloud body, sitting high enough to leave room for precipitation. */
const CLOUD =
  "M8 15.6h8.15a3.4 3.4 0 0 0 .4-6.78 4.9 4.9 0 0 0-9.35-1.12A3.55 3.55 0 0 0 8 15.6Z";

/** A three-stroke asterisk centred on (x, y). */
function snowflake(x: number, y: number, r: number): string {
  const dx = r * 0.87;
  const dy = r * 0.5;
  return (
    `M${x} ${y - r}V${y + r}` +
    `M${x - dx} ${y - dy}L${x + dx} ${y + dy}` +
    `M${x - dx} ${y + dy}L${x + dx} ${y - dy}`
  );
}

export function WeatherIcon({
  icon,
  isDay = true,
  className = "",
}: {
  icon: WeatherIconKey;
  isDay?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icon === "sun" &&
        (isDay ? (
          <>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
          </>
        ) : (
          // Clear at night reads as a crescent rather than a sun.
          <path d="M20.2 14.8A8.6 8.6 0 0 1 9.2 3.8a8.6 8.6 0 1 0 11 11Z" />
        ))}

      {icon === "cloud-sun" && (
        <>
          <circle cx="8.6" cy="7.6" r="2.9" />
          <path d="M8.6 2.3v1.4M8.6 11.5v1.4M3.3 7.6h1.4M12.5 7.6h1.4M4.9 3.9l1 1M11.3 10.3l1 1M12.3 3.9l-1 1M5.9 10.3l-1 1" />
          <path
            d={CLOUD}
            transform="translate(1.6 2.4) scale(0.92)"
            className="fill-cream"
          />
        </>
      )}

      {icon === "cloud" && <path d={CLOUD} transform="translate(0 2)" />}

      {icon === "fog" && (
        <>
          <path d={CLOUD} transform="translate(0 0.5)" />
          <path d="M5.8 19.2h9.4M8.4 21.7h8" />
        </>
      )}

      {icon === "drizzle" && (
        <>
          <path d={CLOUD} />
          <path d="M9.6 18.3l-.6 1.6M12.6 18.3l-.6 1.6M15.6 18.3l-.6 1.6" />
        </>
      )}

      {icon === "rain" && (
        <>
          <path d={CLOUD} />
          <path d="M9.9 18.1l-1.2 3.1M13.1 18.1l-1.2 3.1M16.3 18.1l-1.2 3.1" />
        </>
      )}

      {icon === "snow" && (
        <>
          <path d={CLOUD} />
          <path d={snowflake(9.8, 19.6, 1.7)} />
          <path d={snowflake(15, 19.6, 1.7)} />
        </>
      )}

      {icon === "storm" && (
        <>
          <path d={CLOUD} />
          <path d="M13 17.5l-3.1 3.6h2.7l-1.1 2.6" />
        </>
      )}
    </svg>
  );
}
