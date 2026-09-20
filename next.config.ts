import type { NextConfig } from 'next';
const onGithubPages = process.env.GITHUB_ACTIONS === 'true';
const nextConfig: NextConfig = { ...(onGithubPages ? { output: 'export' as const } : {}), trailingSlash: onGithubPages, images: { unoptimized: true }, basePath: onGithubPages ? '/casozero' : '' };
export default nextConfig;
