import { withPayload } from '@payloadcms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ULJE: makine prodhuese me 6GB RAM — zvogëloni memori'in e paktë të webpack
  // (build më i ngadaltë, por nuk vdes nga OOM). Hiqni nëse rritet RAM-i.
  experimental: {
    webpackMemoryOptimizations: true,
  },
  typescript: {
    // Typecheck bazohet te `npm run lint` (tsc --noEmit); e anashkalojmë këtu
    // për të kursyer ~1GB RAM gjatë `next build` në server.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

export default withPayload(nextConfig)
