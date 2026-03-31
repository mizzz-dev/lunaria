/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@lunaria/ui', '@lunaria/shared', '@lunaria/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.discordapp.com' },
    ],
  },
};
module.exports = nextConfig;
