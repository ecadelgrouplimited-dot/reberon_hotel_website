import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import { resolve } from 'node:path';

// One .env for the whole monorepo.
loadEnvConfig(resolve(import.meta.dirname, '../..'), process.env.NODE_ENV !== 'production', { info: () => {}, error: console.error }, true);

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@reberon/contracts', '@reberon/utils'],
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    deviceSizes: [320, 640, 960, 1280, 1920, 2560],
    imageSizes: [96, 160, 240],
    qualities: [75],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default config;
