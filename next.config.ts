import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "*": [
        "./public/**/*.pdf",
        "./public/**/*.jpg",
        "./public/**/*.jpeg",
        "./public/**/*.png",
      ],
    },
  },
};

export default nextConfig;
