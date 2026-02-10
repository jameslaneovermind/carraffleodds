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
      {
        protocol: 'https',
        hostname: 'www.revcomps.com',
      },
      {
        protocol: 'https',
        hostname: 'revcomps.com',
      },
      {
        protocol: 'https',
        hostname: 'images.elitecompetitions.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'www.clickcompetitions.co.uk',
      },
      {
        protocol: 'https',
        hostname: 'www.luckydaycompetitions.com',
      },
      {
        protocol: 'https',
        hostname: 'llfgames.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.botb.com',
      },
      {
        protocol: 'https',
        hostname: '**.botb.com',
      },
    ],
  },
};

export default nextConfig;
