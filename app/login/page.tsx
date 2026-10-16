import { redirect } from 'next/navigation'
import Link from 'next/link'
import { neonAuth } from '@/lib/auth'
import { signInWithLockout } from '@/lib/loginLockout'
import { resolveSession } from '@/lib/session'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/components/auth/AuthShell'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; reason?: string; redeemed?: string }>
}) {
  const { from, error, reason, redeemed } = await searchParams
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID
  const redirectTo = from && from !== '/login' ? from : '/'

  // Neon Auth middleware (proxy.ts) can't do this check itself — see its
  // comment — so it happens here instead, in a plain Server Component.
  // Uses the full resolution (not just "does a Neon Auth session exist")
  // so a deactivated or unregistered identity lands on its own page
  // instead of bouncing back here from requireUser() on the next request.
  const resolution = await resolveSession()
  if (resolution.kind === 'ok') redirect(redirectTo)
  if (resolution.kind === 'inactive') redirect('/account-disabled')
  if (resolution.kind === 'no-app-user') redirect('/account-not-found')

  async function login(formData: FormData) {
    'use server'
    const email = String(formData.get('email') ?? '')
    const password = String(formData.get('password') ?? '')
    const result = await signInWithLockout(email, password)
    if (!result.ok) {
      const fromParam = from ? `&from=${encodeURIComponent(from)}` : ''
      const reasonParam = result.status === 423 ? '&reason=locked' : result.status === 429 ? '&reason=rate' : ''
      redirect(`/login?error=1${fromParam}${reasonParam}`)
    }
    redirect(redirectTo)
  }

  async function loginWithGoogle() {
    'use server'
    const { data, error: signInError } = await neonAuth.signIn.social({
      provider: 'google',
      callbackURL: redirectTo,
    })
    if (signInError || !data?.url) {
      redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ''}`)
    }
    redirect(data.url)
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Steadfast workspace."
      quote={{
        line: 'Leads don’t need another spreadsheet.',
        attribution: 'Steadfast — lead management that keeps up',
      }}
      footer={
        <>
          New here?{' '}
          <Link href="/signup" className="text-white underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      {redeemed && !error && (
        <p className="mb-4 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          Account created — log in with your new password.
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-md border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {reason === 'locked'
            ? 'Too many failed attempts — try again in 15 minutes.'
            : reason === 'rate'
              ? 'Too many attempts — try again later.'
              : 'Invalid email or password.'}
        </p>
      )}

      {googleEnabled && (
        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Sign in with Google
          </button>
        </form>
      )}

      {/* Opens by default without Google, or when a password attempt just
          failed (error=1 only ever comes from the credentials path below —
          see the `login` action's catch) so the error isn't hidden behind
          a collapsed disclosure. */}
      <details className={googleEnabled ? 'group mt-5' : 'group'} open={!googleEnabled || !!error}>
        {googleEnabled && (
          <summary className="cursor-pointer list-none text-center text-sm text-white/45 underline underline-offset-4 hover:text-white/70">
            Use a password instead
          </summary>
        )}
        <form action={login} className={googleEnabled ? 'mt-4 space-y-3' : 'space-y-3'}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/70">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoFocus={!googleEnabled}
              className="border-white/15 bg-white/[0.04] text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/70">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              className="border-white/15 bg-white/[0.04] text-white placeholder:text-white/30"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Sign in
          </button>
        </form>
      </details>
    </AuthShell>
  )
}
