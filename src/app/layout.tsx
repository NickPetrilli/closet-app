import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: `${APP_TAGLINE} — a quiet place for the things you wear.`,
  applicationName: APP_NAME,
  // Installed on iOS: run without Safari's chrome, and label the home-screen
  // icon "Closet" — "Jenna's Closet" would be truncated there anyway.
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Closet",
  },
  other: {
    // Next emits only the standardised `mobile-web-app-capable` for
    // appleWebApp.capable. iOS before 16.4 reads the apple- prefixed name and
    // nothing else, so it launches inside Safari's chrome without this.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // The light surface. The inline theme script rewrites this meta before first
  // paint when dark is active, so the phone's status bar matches the app.
  themeColor: THEME_COLORS.light,
  width: "device-width",
  initialScale: 1,
  // Lets the page fill the screen behind the notch and home indicator; the
  // safe-area padding in globals.css keeps content clear of both.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning covers exactly one level: the data-theme the
    // inline script stamps on <html> before React hydrates. Without it React
    // reports a mismatch on every load, since the server cannot know the theme.
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Must run before first paint, or dark-mode users get a white flash
            on every load. See src/lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
