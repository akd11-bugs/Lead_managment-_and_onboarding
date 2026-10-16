import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Bare /rep can no longer sign anyone in: a field rep's organisation comes
// from the URL (/rep/<slug>), because their name + PIN credential carries no
// org of its own. Rather than show a form that would always fail, point them
// at the link their admin shared.
//
// Deliberately does NOT list organisations or accept a slug typed here —
// that would turn this page into a tenant-enumeration oracle.
export default function RepIndexPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Open your team&apos;s link</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Field sign-in happens on a link that is specific to your company, so we know which team
          you belong to. Your manager can share it with you. It looks like{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/rep/your-company</code>.
        </p>
        <p className="text-sm text-muted-foreground">
          Have a work email instead?{' '}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Sign in with Google
          </Link>
        </p>
      </div>
    </div>
  )
}
