/** @type {import('next').NextConfig} */
const nextConfig = {
  // Needed for @react-pdf/renderer
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {
    resolveAlias: {
      canvas: '',
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
