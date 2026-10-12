import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Job posters are uploaded through a server action. Browsers shrink them first, so this is a safety margin.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
