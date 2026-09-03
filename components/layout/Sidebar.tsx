import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Sparkles,
  Settings,
  Github,
  Mail,
  ListChecks,
  Megaphone,
  PhoneCall,
  Handshake,
  LineChart,
  ClipboardCheck,
  BarChart3,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SERVICES } from '@/lib/services/catalog'
import type { SessionUser } from '@/lib/session'

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  'lead-capture': <Users className="h-4 w-4" />,
  'paid-ads': <Megaphone className="h-4 w-4" />,
  outbound: <PhoneCall className="h-4 w-4" />,
  calls: <Handshake className="h-4 w-4" />,
  deals: <Handshake className="h-4 w-4" />,
  reports: <LineChart className="h-4 w-4" />,
}

export function Sidebar({ user }: { user: SessionUser }) {
  const operations = user.role === 'operations'
  const admin = user.role === 'admin'

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 z-30 border-r bg-muted/30">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center font-semibold">
          <Image src="/logo-bluswap.webp" alt="bluSwap" width={132} height={38} className="h-7 w-auto" priority />
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
              <NavItem href="/tasks" icon={<ListChecks className="h-4 w-4" />}>
                Tasks
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
              <NavItem href="/services/email" icon={<Mail className="h-4 w-4" />}>
                Email
              </NavItem>
              {SERVICES.map((s) => (
                <NavItem key={s.slug} href={`/services/${s.slug}`} icon={SERVICE_ICONS[s.slug]}>
                  {s.name}
                </NavItem>
              ))}
            </NavSection>
            <NavSection title="Skills">
              <NavItem href="/skills" icon={<Sparkles className="h-4 w-4" />}>
                All Skills
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