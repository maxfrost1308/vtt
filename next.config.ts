import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_BASEPATH || undefined,
  env: {
    NEXT_PUBLIC_BASEPATH: process.env.NEXT_BASEPATH || '',
  },
  output: "standalone",
};

export default nextConfig;
