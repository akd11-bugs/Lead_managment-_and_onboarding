// A CSP tight enough to matter, loose enough not to break the app:
// - script-src needs 'unsafe-inline' because Next.js App Router injects
//   inline bootstrap/hydration scripts with no nonce plumbing set up here.
//   A nonce-based CSP (see Next.js docs) would remove this but requires
//   wiring a per-request nonce through proxy.ts — worth doing later, not
//   included in this pass to avoid risking hydration breakage app-wide.
// - script-src also needs 'wasm-unsafe-eval' for lib/aiExtraction.ts's
//   client-side models (transformers.js/onnxruntime-web, WASM execution) —
//   this is the narrow CSP3 token for instantiating WebAssembly, not the
//   much broader 'unsafe-eval'.
// - style-src needs 'unsafe-inline' because recharts and @dnd-kit both set
//   inline style="" attributes at render/drag time (not just <style>
//   blocks) — there's no practical way to nonce those.
// - connect-src allows Hugging Face's model CDN so the browser can download
//   the small NER/zero-shot/embedding models directly (cached in the
//   browser after the first use) — those calls never touch our server, so
//   this costs us nothing per use, only a trust boundary on huggingface.co.
//   It also needs cdn.jsdelivr.net — separately from the model weights,
//   onnxruntime-web (transformers.js's inference engine) loads its own WASM
//   runtime (.wasm/.mjs) from there, not from Hugging Face.
// - script-src needs cdn.jsdelivr.net too — that WASM runtime loader is a
//   dynamically-imported <script>, which script-src-elem falls back to
//   script-src for. It also needs blob: — onnxruntime-web dynamically
//   imports its own glue code from a blob: URL it constructs at runtime.
// - worker-src allows a blob: worker — onnxruntime-web runs its WASM
//   backend off the main thread via a worker constructed from a blob URL.
// - React's development build uses eval() for debugging features (component
//   stacks across environments). Without 'unsafe-eval' in dev, the dev
//   runtime fails and client components never finish hydrating — animations
//   and other effects silently never run. Production React never calls
//   eval(), so this token is added in dev only and the deployed CSP is
//   unchanged.
const DEV = process.env.NODE_ENV === 'development'

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${DEV ? " 'unsafe-eval'" : ''} https://cdn.jsdelivr.net blob:`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://huggingface.co https://*.hf.co https://cdn.jsdelivr.net",
  "worker-src 'self' blob:",
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
