import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
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
  // Matches the manifest's theme_color: --color-surface.
  themeColor: "#edf3fa",
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
    <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
