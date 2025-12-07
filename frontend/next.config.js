/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // This enables standalone output for Docker deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mediumrare.imgix.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'bc.imgix.net',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true, // Disable image optimization for external images in Docker
  },
}

module.exports = nextConfig

