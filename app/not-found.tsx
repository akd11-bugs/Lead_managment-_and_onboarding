import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Compass } from 'lucide-react'

// Next.js's own fallback for every unmatched route and every explicit
// notFound() call — same centered-card house style as account-not-found,
// account-disabled, and pending, rather than Next's bare unbranded default.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
            <Compass className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Page not found</CardTitle>
          <CardDescription>That page doesn&apos;t exist, or you don&apos;t have access to it.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button size="sm">Back to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
