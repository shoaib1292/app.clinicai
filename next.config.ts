import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    'app.clinicai.pk',
    'clinicai.pk',
    'localhost',
    '*.localhost',
  ],
  serverExternalPackages: ['@sentry/nextjs'],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
