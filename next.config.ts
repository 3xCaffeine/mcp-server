import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // This allows production builds to successfully complete even if
    // your project has ESLint errors or warnings.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
