import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default (1mb) is too small for real photo uploads in the add-item flow.
    //
    // This raises Next's own limit only. On Vercel the platform caps a
    // serverless function's request body at 4.5 MB and enforces it at the edge,
    // so anything larger is rejected with a 413 before this setting — or any of
    // our code — is consulted. Photos are therefore resized in the browser
    // first; see src/lib/prepare-photo.ts. The generous value here still helps
    // local development, which has no such cap.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  // Puppeteer (the Aritzia link-fetch mode) can't run on Vercel regardless
  // of size — no display for a real browser, and a headless one would just
  // hit the same bot detection a real browser avoids. Background removal no
  // longer needs a local model (see src/lib/server/remove-bg-api.ts), so
  // Puppeteer is the only thing still excluded from the deployed bundle;
  // the link-fetch tab is hidden accordingly (see canFetchFromLink in
  // src/app/page.tsx). Local `next dev` is unaffected — tracing only runs
  // for `next build`.
  outputFileTracingExcludes: {
    "/": ["./node_modules/puppeteer/**", "./node_modules/puppeteer-core/**"],
  },
};

export default nextConfig;
