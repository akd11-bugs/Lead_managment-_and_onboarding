import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SignOutButton } from '@/components/layout/SignOutButton'
import { requireUser } from '@/lib/session'
import { Clock } from 'lucide-react'

export default async function PendingApprovalPage() {
  const user = await requireUser()

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-amber-100 grid place-items-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Awaiting approval</CardTitle>
          <CardDescription>
            Signed in as {user.email}. An admin needs to assign you a role (Sales, Operations, or Admin) before you
            can access the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  )
}
