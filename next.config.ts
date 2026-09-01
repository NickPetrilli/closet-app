import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default (1mb) is too small for real photo uploads in the add-item flow.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  // Puppeteer and the local background-removal model (@imgly + its
  // onnxruntime-node engine) are local-dev only — see canAddItems in
  // src/app/page.tsx. Left untouched, Next's file tracing pulls all three
  // into the deployed function anyway (~380MB, mostly bundled ONNX model
  // weights), about 8x over Vercel's function size limit. Excluding them
  // keeps the deployed bundle small; local `next dev` is unaffected since
  // tracing only runs for `next build`.
  outputFileTracingExcludes: {
    "/": [
      "./node_modules/@imgly/**",
      "./node_modules/onnxruntime-node/**",
      "./node_modules/puppeteer/**",
      "./node_modules/puppeteer-core/**",
    ],
  },
};

export default nextConfig;
