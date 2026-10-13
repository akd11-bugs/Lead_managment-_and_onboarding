import { redirect } from 'next/navigation'
import Link from 'next/link'
import { neonAuth } from '@/lib/auth'
import { signInWithLockout } from '@/lib/loginLockout'
import { resolveSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">bluSwap</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {redeemed && !error && (
            <p className="mb-3 text-sm text-emerald-600">Account created — log in with your new password.</p>
          )}
          {error && (
            <p className="mb-3 text-sm text-rose-600">
              {reason === 'locked'
                ? 'Too many failed attempts — try again in 15 minutes.'
                : reason === 'rate'
                  ? 'Too many attempts — try again later.'
                  : 'Invalid email or password.'}
            </p>
          )}

          {googleEnabled && (
            <form action={loginWithGoogle}>
              <Button type="submit" className="w-full">
                Sign in with Google
              </Button>
            </form>
          )}

          {/* Opens by default without Google, or when a password attempt just
              failed (error=1 only ever comes from the credentials path below —
              see the `login` action's catch) so the error isn't hidden behind
              a collapsed disclosure. */}
          <details className={googleEnabled ? 'mt-4 group' : 'group'} open={!googleEnabled || !!error}>
            {googleEnabled && (
              <summary className="cursor-pointer list-none text-center text-sm text-muted-foreground underline underline-offset-2">
                Use a password instead
              </summary>
            )}
            <form action={login} className={googleEnabled ? 'mt-3 space-y-3' : 'space-y-3'}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required autoFocus={!googleEnabled} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
              </div>
              <Button type="submit" variant={googleEnabled ? 'outline' : 'default'} className="w-full">
                Sign in
              </Button>
            </form>
          </details>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{' '}
            <Link href="/signup" className="underline underline-offset-2">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
