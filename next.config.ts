import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
};

// Sentry configuration
const sentryConfig = {
  // Suppress source map upload logs
  silent: true,
  
  // Upload source maps for better stack traces
  widenClientFileUpload: true,
  
  // Hide source maps from browser devtools in production
  hideSourceMaps: true,
};

export default withSentryConfig(nextConfig, sentryConfig);
