import {
  Kanban, Users, Building2, CheckSquare, CalendarDays, BarChart3,
  Sparkles, PenLine, ShieldCheck, KeyRound, Mail, Plug,
} from 'lucide-react'

// Breadth, not depth. The tabbed tour above shows four surfaces well, but it
// caps at four — a visitor who reads only the tour concludes the product is
// four screens. Every item here maps to a route that actually exists; if one
// is removed from the app, remove it here rather than letting the page
// overclaim.

const FEATURES: { icon: typeof Kanban; name: string; body: string }[] = [
  { icon: Kanban, name: 'Pipeline board', body: 'Drag deals through the stages your team already uses. Stale leads flag themselves.' },
  { icon: Users, name: 'Leads & contacts', body: 'Sortable, filterable, searchable. Every contact tied to the company it belongs to.' },
  { icon: Building2, name: 'Companies', body: 'One record per company, shared across every deal and contact under it.' },
  { icon: CheckSquare, name: 'Tasks', body: 'Follow-ups that belong to a lead, not to someone’s private to-do list.' },
  { icon: CalendarDays, name: 'Calendar', body: 'Calls and meetings in one view, attached to the deals they move.' },
  { icon: BarChart3, name: 'Reports', body: 'Pipeline value, conversion and activity. Exportable, with a scoped API key.' },
  { icon: Sparkles, name: '38 sales skills', body: 'Qualification, outreach and diagnostic playbooks that run against your real pipeline.' },
  { icon: PenLine, name: 'Whiteboard', body: 'A shared canvas with live cursors and a funnel that reads your actual data.' },
  { icon: ShieldCheck, name: 'Audit log', body: 'Every stage change, edit and export recorded with who did it and when.' },
  { icon: KeyRound, name: 'Rep PIN access', body: 'Field reps log in with a PIN. No email account to provision or pay for.' },
  { icon: Mail, name: 'Email & onboarding', body: 'Bring your own mailbox. Track onboarding steps per customer to handover.' },
  { icon: Plug, name: 'Agent API (MCP)', body: 'Six tools over the Model Context Protocol, scoped to a per-org key you revoke.' },
]

export function FeatureGrid() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <div className="grid gap-px overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.07] sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(f => {
          const Icon = f.icon
          return (
            <div key={f.name} className="group bg-[#07080c] p-6 transition-colors hover:bg-white/[0.02]">
              <Icon
                className="h-5 w-5 text-white/35 transition-colors group-hover:text-[#5b8cff]"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <h3 className="mt-4 text-sm font-semibold text-white">{f.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/50">{f.body}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
