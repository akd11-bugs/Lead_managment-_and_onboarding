import './globals.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { getOptionalUser } from '@/lib/session'
import { AppShell } from '@/components/layout/AppShell'
import { SignOutButton } from '@/components/layout/SignOutButton'
import { ThemeProvider } from '@/components/layout/ThemeProvider'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
// Only consumed via font-mono on the marketing landing page today (its
// eyebrows, nav, and HalftoneWordmarkFooter) — loaded at the root so next/font
// can self-host + subset it once, same as Inter above.
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500', '700'] })

export const metadata: Metadata = {
  title: 'Steadfast: the step between a spreadsheet and a CRM',
  description: 'Skill-driven lead management system. CRM with built-in B2B diagnostics.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getOptionalUser()

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider>
          <AppShell user={user} signOutButton={<SignOutButton />}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  )
}
