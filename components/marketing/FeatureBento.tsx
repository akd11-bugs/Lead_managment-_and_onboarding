'use client'

import { Kanban, Sparkles, ShieldCheck, KeyRound, Plug, BarChart3 } from 'lucide-react'
import { BentoGrid, BentoCard } from '@/components/ui/bento-grid'
import { PipelineFunnel } from '@/components/dashboard/PipelineFunnel'
import { RepPerformance } from '@/components/dashboard/RepPerformance'
import { SourceROI } from '@/components/dashboard/SourceROI'
import { ActivityFeedView } from '@/components/dashboard/ActivityFeed'
import { FUNNEL_DATA, ACTIVITY_DEMO, REPS_DEMO, SOURCES_DEMO } from './RealAppShowcase'

// "Everything else" as a bento grid. Each cell carries a REAL dashboard
// component as its background rather than a decorative image, so the layout
// is doing double duty: it shows breadth, and every tile is evidence.
//
// Cells that have no component to borrow (audit log, rep PIN) carry no
// background instead of an invented one.

/** Wraps a product component so it sits legibly behind a dark bento label. */
function Behind({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 top-28 origin-top scale-[0.82] px-4">
      <div className="rounded-lg bg-background p-3 text-foreground shadow-xl">{children}</div>
    </div>
  )
}

export function FeatureBento() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <BentoGrid className="lg:grid-rows-3">
        <BentoCard
          Icon={Kanban}
          name="Pipeline"
          description="Stages your team already uses."
          className="lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3"
          background={
            <Behind>
              <PipelineFunnel data={FUNNEL_DATA} />
            </Behind>
          }
        />
        <BentoCard
          Icon={BarChart3}
          name="Reports"
          description="Pipeline, conversion, activity. Exportable."
          className="lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-4"
          background={
            <Behind>
              <SourceROI rows={SOURCES_DEMO} />
            </Behind>
          }
        />
        <BentoCard
          Icon={Sparkles}
          name="38 sales skills"
          description="Playbooks that run on your real pipeline."
          className="lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-2"
        />
        <BentoCard
          Icon={Plug}
          name="Agent API"
          description="Six tools over MCP, scoped to a key you revoke."
          className="lg:col-start-3 lg:col-end-4 lg:row-start-2 lg:row-end-4"
          background={
            <Behind>
              <ActivityFeedView items={ACTIVITY_DEMO.slice(0, 3)} live={false} interactive={false} />
            </Behind>
          }
        />
        <BentoCard
          Icon={KeyRound}
          name="Rep access"
          description="Field reps log in with a PIN, no email needed."
          className="lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4"
          background={
            <Behind>
              <RepPerformance rows={REPS_DEMO} />
            </Behind>
          }
        />
      </BentoGrid>

      <p className="mt-4 text-center text-sm text-white/35">
        Plus companies, tasks, calendar, whiteboard, audit log and email.
      </p>
    </div>
  )
}
