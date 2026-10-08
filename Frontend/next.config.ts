import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      {
        source: "/auth/register",
        destination: "/auth/signup",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
