/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;

