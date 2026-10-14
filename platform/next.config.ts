import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // Uploads go through server actions: job posters (shrunk by the browser first) and order drafts
      // (Word/PDF, up to 10 MB, checked again on the server)
      bodySizeLimit: "11mb",
    },
  },
};

export default nextConfig;
