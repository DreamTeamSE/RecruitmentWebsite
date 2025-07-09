import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable strict TypeScript and ESLint checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Performance optimizations
  poweredByHeader: false,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Optimize images
  images: {
    domains: [],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Font optimization
  optimizeFonts: true,
};

export default nextConfig;
