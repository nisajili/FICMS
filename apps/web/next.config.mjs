/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The web app runs in-browser only; API traffic is proxied via NEXT_PUBLIC_API_URL.
  // Keeping server runtime lean.
  output: 'standalone',
  transpilePackages: ['@ficms/ui', '@ficms/config', '@ficms/types'],
  experimental: {
    // Allow server components to safely read env at request time.
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
