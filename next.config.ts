import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers applied to all routes
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],

  // Redirect www to non-www (if custom domain is added later)
  // redirects: async () => [],

  // Silence noisy source map warnings in production
  productionBrowserSourceMaps: false,

  // Suppress server-side console noise in production
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
