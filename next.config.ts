import type { NextConfig } from 'next';
const onGithubPages = process.env.GITHUB_ACTIONS === 'true';
const nextConfig: NextConfig = { output: 'export', images: { unoptimized: true }, basePath: onGithubPages ? '/casozero' : '' };
export default nextConfig;
