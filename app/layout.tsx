import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { getOptionalUser } from '@/lib/session'
import { AppShell } from '@/components/layout/AppShell'
import { SignOutButton } from '@/components/layout/SignOutButton'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Steadfast: the step between a spreadsheet and a CRM',
  description: 'Skill-driven lead management system. CRM with built-in B2B diagnostics.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser()

  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="font-sans">
        <AppShell user={user} signOutButton={<SignOutButton />}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
