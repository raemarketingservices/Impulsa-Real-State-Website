import type { NextConfig } from 'next';
const config: NextConfig = { output: 'standalone', devIndicators: false, serverExternalPackages: ['node:sqlite'], experimental: { serverActions: { bodySizeLimit: '25mb' } }, async headers() { return [{ source: '/:path*', headers: [{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'SAMEORIGIN'}] }]; } };
export default config;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
