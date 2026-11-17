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
  // Uploads added after server start are not in Next's static file list; serve them via a route.
  async rewrites() {
    return [{ source: '/uploads/:file', destination: '/api/uploads/:file' }]
  },
  // The app uses plain <img> tags; no remote hosts are allowed so /_next/image cannot be used as an open proxy.
  images: {
    remotePatterns: [],
  },
}

export default withPayload(nextConfig)
