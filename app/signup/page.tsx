import { redirect } from 'next/navigation'
import Link from 'next/link'
import { neonAuth } from '@/lib/auth'
import { resolveSession } from '@/lib/session'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SignupEmailForm } from '@/components/auth/SignupEmailForm'

// Google-first, mirroring app/login/page.tsx — Google sign-in already proves
// email ownership, so a brand-new identity lands on /account-not-found which
// handles org creation / join-request directly. The email+password path
// below is the de-emphasized fallback, still gated behind its own
// SignupToken link-verification step since typing an email proves nothing.
export default async function SignupPage() {
  const googleEnabled = !!process.env.GOOGLE_CLIENT_ID

  const resolution = await resolveSession()
  if (resolution.kind === 'ok') redirect('/')
  if (resolution.kind === 'inactive') redirect('/account-disabled')
  if (resolution.kind === 'no-app-user') redirect('/account-not-found')

  async function signUpWithGoogle() {
    'use server'
    const { data, error: signInError } = await neonAuth.signIn.social({
      provider: 'google',
      callbackURL: '/',
    })
    if (signInError || !data?.url) {
      redirect('/signup?error=1')
    }
    redirect(data.url)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Join bluSwap</CardTitle>
          <CardDescription>Create your account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          {googleEnabled && (
            <form action={signUpWithGoogle}>
              <Button type="submit" className="w-full">
                Sign up with Google
              </Button>
            </form>
          )}

          <details className={googleEnabled ? 'mt-4 group' : 'group'} open={!googleEnabled}>
            {googleEnabled && (
              <summary className="cursor-pointer list-none text-center text-sm text-muted-foreground underline underline-offset-2">
                Use email instead
              </summary>
            )}
            <div className={googleEnabled ? 'mt-3' : ''}>
              <SignupEmailForm />
            </div>
          </details>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-2">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
