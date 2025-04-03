/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Optional: Enables static export if needed,
  images: {
    unoptimized: true, // Required for static export
  },
  async rewrites() {
    return [
      {
        source: '/api/db/:path*',
        destination: 'https://database-production-0fe5.up.railway.app/:path*',
      },
    ];
  }
 };

export default nextConfig;