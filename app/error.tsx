'use client'

import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

// Next.js requires this to be a client component (it receives error/reset
// as runtime props, not server-rendered data) and renders it for any
// uncaught render/runtime error below the root layout. Logs server-side for
// us to actually see it, and shows only a generic message to the user —
// error.message can be a raw exception string, never safe to render as-is.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app error boundary]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center space-y-2">
          <div className="h-10 w-10 rounded-full bg-muted grid place-items-center">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">Something went wrong</CardTitle>
          <CardDescription>
            That wasn&apos;t supposed to happen. Try again, or come back in a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="sm" onClick={reset}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
