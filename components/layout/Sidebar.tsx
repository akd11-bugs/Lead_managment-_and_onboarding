import Link from 'next/link'
import {
  LayoutDashboard,
  KanbanSquare,
  Building2,
  Users,
  Sparkles,
  Settings,
  Github,
  ListChecks,
  ClipboardCheck,
  BarChart3,
  CalendarDays,
  PenTool,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionUser } from '@/lib/session'
import { OrgLogo } from '@/components/branding/OrgLogo'
import { BRAND_NAME } from '@/lib/branding'

export function Sidebar({ user }: { user: SessionUser }) {
  const operations = user.role === 'operations'
  const admin = user.role === 'admin'

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-30 border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <OrgLogo org={{ name: BRAND_NAME }} size={24} />
          <span className="text-base tracking-tight">{BRAND_NAME}</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4 text-sm">
        {operations ? (
          <NavSection title="Operations">
            <NavItem href="/onboarding" icon={<ClipboardCheck className="h-4 w-4" />}>
              Onboarding queue
            </NavItem>
          </NavSection>
        ) : (
          <>
            <NavSection title="Workspace">
              <NavItem href="/" icon={<LayoutDashboard className="h-4 w-4" />}>
                Dashboard
              </NavItem>
              <NavItem href="/pipeline" icon={<KanbanSquare className="h-4 w-4" />}>
                Pipeline
              </NavItem>
              <NavItem href="/leads" icon={<Users className="h-4 w-4" />}>
                Leads
              </NavItem>
              <NavItem href="/companies" icon={<Building2 className="h-4 w-4" />}>
                Companies
              </NavItem>
              <NavItem href="/tasks" icon={<ListChecks className="h-4 w-4" />}>
                Tasks
              </NavItem>
              <NavItem href="/whiteboard" icon={<PenTool className="h-4 w-4" />}>
                Whiteboard
              </NavItem>
              <NavItem href="/calendar" icon={<CalendarDays className="h-4 w-4" />}>
                Calendar
              </NavItem>
              {admin && (
                <NavItem href="/onboarding" icon={<ClipboardCheck className="h-4 w-4" />}>
                  Onboarding queue
                </NavItem>
              )}
              {admin && (
                <NavItem href="/reports" icon={<BarChart3 className="h-4 w-4" />}>
                  Reports
                </NavItem>
              )}
            </NavSection>
            <NavSection title="Services">
              <NavItem href="/services" icon={<Sparkles className="h-4 w-4" />}>
                Services
              </NavItem>
            </NavSection>
          </>
        )}
        <NavSection title="System">
          <NavItem href="/settings" icon={<Settings className="h-4 w-4" />}>
            Settings
          </NavItem>
        </NavSection>
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Github className="h-3 w-3" />
          <span>30 skills · hybrid runner</span>
        </div>
      </div>
    </aside>
  )
}

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <p className="px-2 mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function NavItem({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-2 py-1.5 text-foreground/80 hover:bg-accent hover:text-foreground transition-colors'
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}