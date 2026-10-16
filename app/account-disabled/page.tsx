import { redirect } from 'next/navigation'
import { neonAuth } from '@/lib/auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SignOutButton } from '@/components/layout/SignOutButton'
import { Ban } from 'lucide-react'

// Landed on by requireUser()/requireAnyUser()/app/login/page.tsx when a
// Neon Auth identity matches a Steadfast User whose isActive is false. Keeping
// this as its own target (instead of folding into /login, which only has a
// raw Neon Auth session to check) is what stops a deactivated account from
// looping between here and /login — see lib/session.ts's resolveSession.
export default async function AccountDisabledPage() {
  const { data } = await neonAuth.getSession()
  if (!data?.user?.email) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
            <Ban className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Account disabled</CardTitle>
          <CardDescription>
            The account for {data.user.email} has been deactivated. Ask your admin to reactivate it if this is
            unexpected.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  )
}
