import { redirect } from 'next/navigation'
import { neonAuth } from '@/lib/auth'
import { findOrgByEmailDomain } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SignOutButton } from '@/components/layout/SignOutButton'
import { AccountNotFoundActions } from '@/components/auth/AccountNotFoundActions'
import { UserX } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Landed on by requireUser()/requireAnyUser() when a Neon Auth identity
// (typically first-time Google sign-in) has no matching Steadfast User row.
// Used to be a dead end with two passive links — now it actually acts on
// the verified email: a company-domain match offers "request to join",
// everything else (a personal-email domain, or no match) offers creating a
// brand-new org directly, no separate signup-link step needed since Google
// already proved this person owns this email address.
export default async function AccountNotFoundPage() {
  const { data } = await neonAuth.getSession()
  if (!data?.user?.email) redirect('/login')

  const email = data.user.email.trim().toLowerCase()
  const matchedOrg = await findOrgByEmailDomain(email)

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
            <UserX className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">No account found</CardTitle>
          <CardDescription>There&apos;s no Steadfast account for {email} yet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AccountNotFoundActions
            matchedOrg={matchedOrg ? { id: matchedOrg.id, name: matchedOrg.name } : null}
            suggestedName={data.user.name ?? ''}
          />
          <div className="flex justify-center border-t pt-3">
            <SignOutButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
