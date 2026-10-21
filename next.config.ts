import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a verification build run beside a live dev server without clobbering its .next folder:
  //   NEXT_DIST_DIR=.next-build npm run build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // The parent folder has its own package-lock.json (Remotion), which made Next treat it as the
  // workspace root and watch far more files than the app needs.
  turbopack: { root: path.resolve(__dirname) },
  // Netlify build settings from the deploy branch.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // The seeded SQLite file is only opened at runtime, so file tracing cannot see it. Without this the
  // serverless bundle has no database and every page that needs the family fails.
  outputFileTracingIncludes: {
    "/**": ["./dev.db"],
  },
};

export default nextConfig;
