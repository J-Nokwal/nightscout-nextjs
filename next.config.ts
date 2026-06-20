import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*", "192.168.18.163"],
  async rewrites() {
    // Strip .json suffix from v1 API paths — xDrip+, Spike, and other uploaders
    // request /api/v1/entries.json, /api/v1/treatments.json, etc.
    return [
      // Strip .json suffix — xDrip+, Spike, and other uploaders append .json
      {
        source: "/api/v1/:path([^/]+)\\.json",
        destination: "/api/v1/:path",
      },
      // Top-level /pebble alias used by Garmin Connect IQ and some watch faces
      {
        source: "/pebble",
        destination: "/api/v1/pebble",
      },
    ];
  },
};

export default nextConfig;
