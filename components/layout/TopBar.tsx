'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NewLeadDialog } from '@/components/leads/NewLeadDialog'
import { ImportLeadsDialog } from '@/components/leads/ImportLeadsDialog'
import type { SessionUser } from '@/lib/session'

// signOutButton is rendered server-side and passed in as an element — it's a
// Server Component (server action + Prisma import) and can't be imported
// directly into this Client Component without pulling `pg`/Node builtins
// into the browser bundle.
export function TopBar({ user, signOutButton }: { user: SessionUser; signOutButton: React.ReactNode }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function runSearch() {
    if (!query.trim()) return
    router.push(`/leads?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 md:px-6 backdrop-blur">
      <div className="md:hidden font-semibold">LRM_blu</div>
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            placeholder="Search leads, companies, POCs…"
            className="pl-9 h-9 bg-muted/40"
            aria-label="Search"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <ImportLeadsDialog />
        <NewLeadDialog>
          <Button size="sm">
            <Plus className="h-4 w-4" />
            New Lead
          </Button>
        </NewLeadDialog>
        <div className="hidden sm:flex items-center gap-1.5 pl-2 ml-1 border-l">
          <span className="text-sm font-medium">{user.name}</span>
          <Badge variant="outline" className="text-[10px] capitalize">
            {user.role}
          </Badge>
        </div>
        {signOutButton}
      </div>
    </header>
  )
}