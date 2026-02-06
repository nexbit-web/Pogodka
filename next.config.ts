import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.weatherapi.com",
        pathname: "/weather/64x64/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/icons.svg", // путь к файлу в public
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable", // кэш 1 год
          },
        ],
      },
    ];
  },
};

export default nextConfig;
