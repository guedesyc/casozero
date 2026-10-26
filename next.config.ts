import type { NextConfig } from 'next';
const onGithubPages = process.env.GITHUB_ACTIONS === 'true';

/** Cabeçalhos de segurança do site (a exportação estática do GitHub Pages não aceita headers). */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  ...(onGithubPages ? { output: 'export' as const } : { headers: async () => [{ source: '/:path*', headers: securityHeaders }] }),
  poweredByHeader: false,
  trailingSlash: onGithubPages,
  images: { unoptimized: true },
  basePath: onGithubPages ? '/casozero' : '',
};
export default nextConfig;
