import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  // pdfkit loads AFM metrics from disk via __dirname; bundling breaks paths (ENOENT for Helvetica.afm).
  serverExternalPackages: ['better-sqlite3', 'pdfkit'],
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
