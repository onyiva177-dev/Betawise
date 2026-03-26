/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warnings won't fail the build
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Keep type checking on — catches real bugs
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options',       value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection',       value: '1; mode=block' },
        ],
      },
      {
        source: '/api/payments/mpesa/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ]
  },
}

module.exports = nextConfig
