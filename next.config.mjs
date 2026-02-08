/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.dreamcargiveaways.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'media.dreamcargiveaways.co.uk',
      },
      {
        protocol: 'https',
        hostname: '**.7daysperformance.co.uk',
      },
      {
        protocol: 'https',
        hostname: '7daysperformance.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: '7days-production.s3.eu-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
