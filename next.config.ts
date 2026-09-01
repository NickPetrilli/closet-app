import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default (1mb) is too small for real photo uploads in the add-item flow.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
