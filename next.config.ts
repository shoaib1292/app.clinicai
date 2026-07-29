import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  instrumentationHook: false,
  allowedDevOrigins: [
    'app.clinicai.pk',
    'clinicai.pk',
  ],
  serverExternalPackages: ['@sentry/nextjs'],
};

export default nextConfig;
