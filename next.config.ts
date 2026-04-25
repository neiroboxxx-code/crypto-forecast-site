import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": [
      "./public/**/*.pdf",
      "./public/**/*.jpg",
      "./public/**/*.jpeg",
      "./public/**/*.png",
    ],
  },
};

export default nextConfig;
