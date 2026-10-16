import { redirect } from 'next/navigation'
import Link from 'next/link'
import { neonAuth } from '@/lib/auth'
import { resolveSession } from '@/lib/session'
import { SignupEmailForm } from '@/components/auth/SignupEmailForm'
import { AuthShell } from '@/components/auth/AuthShell'
import { BRAND_NAME } from '@/lib/branding'

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
    <AuthShell
      title={`Join ${BRAND_NAME}`}
      subtitle="Create your account to get started."
      quote={{
        line: 'No credit card. No new password — Google already proved it’s you.',
        attribution: 'Set up your workspace in under a minute',
      }}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-white underline underline-offset-4">
            Log in
          </Link>
        </>
      }
    >
      {googleEnabled && (
        <form action={signUpWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#07080c] transition-transform hover:scale-[1.01] active:scale-[0.99]"
          >
            Sign up with Google
          </button>
        </form>
      )}

      <details className={googleEnabled ? 'group mt-5' : 'group'} open={!googleEnabled}>
        {googleEnabled && (
          <summary className="cursor-pointer list-none text-center text-sm text-white/45 underline underline-offset-4 hover:text-white/70">
            Use email instead
          </summary>
        )}
        <div className={googleEnabled ? 'mt-4' : ''}>
          <SignupEmailForm />
        </div>
      </details>
    </AuthShell>
  )
}
