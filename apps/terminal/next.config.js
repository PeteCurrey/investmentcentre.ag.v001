/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@meridian/core',
    '@meridian/risk',
    '@meridian/execute',
    '@meridian/signals',
    '@meridian/adapters',
    '@meridian/automation',
    '@meridian/registry',
    '@meridian/edge',
    '@meridian/ui',
  ],
};

module.exports = nextConfig;
