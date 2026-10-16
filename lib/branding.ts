// Single source of truth for the vendor-neutral product name.
//
// The product is sold white-label, so the name must never be hardcoded at
// call sites. Set NEXT_PUBLIC_BRAND_NAME per deployment to rebrand without a
// code change. Per-ORG branding (logo, accent) is separate and lives on the
// Organization row — see components/branding/OrgLogo.tsx.
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || 'Steadfast'
