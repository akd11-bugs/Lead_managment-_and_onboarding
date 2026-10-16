import Image from 'next/image'

// White-label logo slot. Every onboarded org supplies its own mark; this
// component is the single place that decides what to show when they have not
// yet. The fallback is a generated monogram — deliberately NOT a vendor logo,
// because the product ships to other companies under their own brand.
//
// Precedence: uploaded data URI -> external URL -> generated monogram.

export type OrgBranding = {
  name: string
  logoUrl?: string | null
  logoDataUrl?: string | null
  brandColor?: string | null
}

/** First letter of each of the first two words: "Northwind Traders" -> "NT". */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function OrgLogo({
  org,
  size = 24,
  className = '',
}: {
  org: OrgBranding
  size?: number
  className?: string
}) {
  const src = org.logoDataUrl || org.logoUrl

  if (src) {
    return (
      <Image
        src={src}
        alt={org.name}
        width={size * 5}
        height={size * 5}
        className={`w-auto object-contain ${className}`}
        style={{ height: size }}
        // Org-supplied URLs are arbitrary hosts; skip the optimizer rather
        // than maintain an allowlist in next.config for tenant domains.
        unoptimized
      />
    )
  }

  return (
    <span
      aria-label={org.name}
      role="img"
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-semibold leading-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: org.brandColor ?? 'rgba(255,255,255,0.10)',
        color: org.brandColor ? '#fff' : 'rgba(255,255,255,0.75)',
      }}
    >
      {monogram(org.name)}
    </span>
  )
}
