import type { NextConfig } from "next";

/**
 * Next.js Configuration
 *
 * `output: 'standalone'` is critical for Docker production builds.
 * It tells Next.js to trace and bundle only the files needed at runtime
 * into a self-contained `.next/standalone` directory. This produces a
 * minimal Docker image (~100MB) instead of shipping the entire node_modules
 * tree (~1GB+).
 *
 * The standalone output is consumed in the final stage of the multi-stage
 * Dockerfile (see Dockerfile, Stage 3: runner).
 */
const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
