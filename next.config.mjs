// A CSP tight enough to matter, loose enough not to break the app:
// - script-src needs 'unsafe-inline' because Next.js App Router injects
//   inline bootstrap/hydration scripts with no nonce plumbing set up here.
//   A nonce-based CSP (see Next.js docs) would remove this but requires
//   wiring a per-request nonce through proxy.ts — worth doing later, not
//   included in this pass to avoid risking hydration breakage app-wide.
// - style-src needs 'unsafe-inline' because recharts and @dnd-kit both set
//   inline style="" attributes at render/drag time (not just <style>
//   blocks) — there's no practical way to nonce those.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Render terminates TLS at the edge — safe to tell browsers to always use
  // https for this origin going forward.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: SECURITY_HEADERS,
      },
    ]
  },
}

export default nextConfig
