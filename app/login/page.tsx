import { redirect } from 'next/navigation'
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
          <CardTitle className="text-xl">LRM_blu</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            {redeemed && !error && (
              <p className="text-sm text-emerald-600">Account created — log in with your new password.</p>
            )}
            {error && <p className="text-sm text-rose-600">Invalid email or password.</p>}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          {googleEnabled && (
            <>
              <div className="my-3 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>
              <form action={loginWithGoogle}>
                <Button type="submit" variant="outline" className="w-full">
                  Sign in with Google
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
