// Simple in-memory, per-process rate limiter. Render runs this app as a
// single long-lived instance (not serverless functions), so an in-memory
// map is meaningful, real protection here — it just won't coordinate across
// multiple instances if this app is ever scaled horizontally, and it resets
// on every deploy/restart. Good enough for the abuse this guards against
// (login/signup/invite spam from a given IP), not a substitute for the
// per-account lockouts that already exist alongside it.

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

// Bounds memory growth from a long-running process seeing many distinct IPs
// — opportunistically sweep expired entries once the map gets big, rather
// than running a timer.
function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

// `key` should already include a namespace (e.g. "rep-login:1.2.3.4") so
// different endpoints don't share the same counter for the same IP.
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  if (buckets.size > 5000) sweep(now)

  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  bucket.count += 1
  return { allowed: true, retryAfterSeconds: 0 }
}

// Render (and most non-Vercel hosts) sit behind a reverse proxy — the real
// client IP arrives via X-Forwarded-For, not the socket address.
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
