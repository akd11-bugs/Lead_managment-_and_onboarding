'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import type { SessionUser } from '@/lib/session'

// The login page renders standalone — no nav shell around a sign-in form.
export function AppShell({
  user,
  signOutButton,
  children,
}: {
  user: SessionUser | null
  signOutButton: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname()
  if (pathname === '/login' || !user) {
    return <>{children}</>
  }
  return (
    <div className="min-h-screen">
      <Sidebar user={user} />
      <div className="md:pl-60">
        <TopBar user={user} signOutButton={signOutButton} />
        <main className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  )
}
