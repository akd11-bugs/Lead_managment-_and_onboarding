import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string; redeemed?: string }>
}) {
  const { from, error, redeemed } = await searchParams
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID

  async function login(formData: FormData) {
    'use server'
    try {
      await signIn('credentials', {
        email: formData.get('email'),
        password: formData.get('password'),
        redirectTo: from && from !== '/login' ? from : '/',
      })
    } catch (err) {
      if (err instanceof AuthError) {
        redirect(`/login?error=1${from ? `&from=${encodeURIComponent(from)}` : ''}`)
      }
      throw err
    }
  }

  async function loginWithGoogle() {
    'use server'
    await signIn('google', { redirectTo: from && from !== '/login' ? from : '/' })
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
          {error && <p className="mb-3 text-sm text-rose-600">Invalid email or password.</p>}

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
