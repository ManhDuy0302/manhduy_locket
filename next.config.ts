import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.10", "192.168.1.4"],
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  // cacheComponents: true,
};

export default nextConfig;
