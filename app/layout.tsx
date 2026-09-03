import './globals.css'
import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { AppShell } from '@/components/layout/AppShell'
import { SignOutButton } from '@/components/layout/SignOutButton'
import type { SessionUser } from '@/lib/session'

export const metadata: Metadata = {
  title: 'bluSwap — Lead Management',
  description: 'Skill-driven lead management system. CRM with built-in B2B diagnostics.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const user = (session?.user as SessionUser | undefined) ?? null

  return (
    <html lang="en">
      <body>
        <AppShell user={user} signOutButton={<SignOutButton />}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
