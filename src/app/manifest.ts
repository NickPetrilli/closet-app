import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

/**
 * Next serves this at /manifest.webmanifest and injects the <link> itself.
 * Colors are the resolved hexes of the palette tokens in globals.css.
 *
 * theme_color is --color-ground rather than --color-ink: it tints the phone's
 * status bar in standalone mode, and the ink navy would sit as a dark band
 * above a pale-blue page. Ground makes the app run edge to edge in one color.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Neutral, not per-person: the manifest is fetched without a session
    // (middleware skips it) and one installed app can be shared by accounts.
    name: APP_NAME,
    short_name: APP_NAME,
    description: `${APP_TAGLINE} — a quiet place for the things you wear.`,
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#edf3fa", // --color-surface, the splash screen
    theme_color: "#edf3fa", // --color-surface, the status bar
    categories: ["lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // Full-bleed and padded to the 80% safe zone, so a launcher can crop it
      // to whatever shape it likes without clipping the J.
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
