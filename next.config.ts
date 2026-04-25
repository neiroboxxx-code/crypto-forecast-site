import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./public/**/*.pdf"],
  },
};

export default nextConfig;
