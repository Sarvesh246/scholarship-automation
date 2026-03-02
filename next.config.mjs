/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
};

export default nextConfig;

