import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/session'
import { readJsonBody } from '@/lib/http'
import { getStageDefinitions } from '@/lib/pipelineConfig'

export const dynamic = 'force-dynamic'

const ELEMENT_TYPES = ['sticky', 'rect', 'circle', 'arrow', 'freepath', 'stamp', 'funnel']

const FUNNEL_BOX_W = 150
const FUNNEL_BOX_H = 92
const FUNNEL_GAP = 80

// Lays out a funnel box (+ connecting arrows) per real pipeline stage, left
// to right. Called on demand from the "Insert pipeline funnel" toolbar
// action (see app/api/whiteboard/elements/funnel/route.ts) — the board no
// longer seeds this automatically, so a fresh whiteboard starts blank.
// 'not_interested' is left out, same as the dashboard's own open-pipeline
// view — a funnel reads left-to-right toward winning the deal, not losing it.
export async function seedFunnel(orgId: string) {
  const stages = (await getStageDefinitions(orgId)).filter((s) => s.key !== 'not_interested')
  let x = 40
  let prevRightEdge: number | null = null
  for (const stage of stages) {
    await prisma.whiteboardElement.create({
      data: {
        orgId,
        type: 'funnel',
        x,
        y: 40,
        w: FUNNEL_BOX_W,
        h: FUNNEL_BOX_H,
        dataJson: JSON.stringify({ k: stage.label, stageKey: stage.key, won: stage.key === 'onboarding' }),
      },
    })
    if (prevRightEdge !== null) {
      await prisma.whiteboardElement.create({
        data: {
          orgId,
          type: 'arrow',
          x: prevRightEdge,
          y: 40 + FUNNEL_BOX_H / 2,
          dataJson: JSON.stringify({ x2: x, y2: 40 + FUNNEL_BOX_H / 2, system: true }),
        },
      })
    }
    prevRightEdge = x + FUNNEL_BOX_W
    x += FUNNEL_BOX_W + FUNNEL_GAP
  }
}

function serialize(el: { id: string; type: string; x: number; y: number; w: number | null; h: number | null; color: string | null; text: string | null; dataJson: string }) {
  return {
    id: el.id,
    type: el.type,
    x: el.x,
    y: el.y,
    w: el.w,
    h: el.h,
    color: el.color,
    text: el.text,
    ...JSON.parse(el.dataJson),
  }
}

// One org-wide whiteboard — every org member reads and writes the same set
// of elements (same flat-tenant convention as everything else), no owner
// scoping. No live push between simultaneously-open tabs: each client
// re-fetches this list on its own cadence (see components/whiteboard/*) —
// there's no websocket layer in this app to push changes instantly.
export async function GET() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const elements = await prisma.whiteboardElement.findMany({ where: { orgId: user.orgId } })

  // A funnel box only ever stores its position + which stage it represents
  // (dataJson.stageKey) — its count/value are computed live, every read,
  // from the real Lead table, never cached in the row. Otherwise it would
  // go stale the moment someone closes a deal, same reasoning as the
  // dashboard's own funnel.
  const stageTotals = await prisma.lead.groupBy({
    by: ['stage'],
    where: { orgId: user.orgId },
    _count: { _all: true },
    _sum: { estimatedVolume: true },
  })
  const byStage = new Map(stageTotals.map((s) => [s.stage, { count: s._count._all, value: s._sum.estimatedVolume ?? 0 }]))

  const out = elements.map((el) => {
    const base = serialize(el)
    if (el.type === 'funnel' && typeof base.stageKey === 'string') {
      const totals = byStage.get(base.stageKey) ?? { count: 0, value: 0 }
      return { ...base, count: totals.count, value: totals.value }
    }
    return base
  })

  return NextResponse.json({ elements: out })
}

// Wipes every element for this org — the whiteboard's "Reset board" action.
// Deliberately org-wide, not per-user: this is one shared board.
export async function DELETE() {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  await prisma.whiteboardElement.deleteMany({ where: { orgId: user.orgId } })
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request) {
  const user = await requireApiUser()
  if (user instanceof NextResponse) return user
  const body = await readJsonBody(req)
  if (body instanceof NextResponse) return body

  const type = String(body.type ?? '')
  if (!ELEMENT_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of ${ELEMENT_TYPES.join(', ')}` }, { status: 400 })
  }
  if (typeof body.x !== 'number' || typeof body.y !== 'number') {
    return NextResponse.json({ error: 'x and y are required numbers' }, { status: 400 })
  }

  // Everything that isn't a shared column (x/y/w/h/color/text) rides in
  // dataJson instead — an arrow's x2/y2, a stamp's emoji, a freehand path's
  // point list — rather than adding a column only one type ever uses.
  const { type: _t, x: _x, y: _y, w: _w, h: _h, color: _c, text: _text, ...rest } = body
  void _t; void _x; void _y; void _w; void _h; void _c; void _text

  const el = await prisma.whiteboardElement.create({
    data: {
      orgId: user.orgId,
      type,
      x: body.x,
      y: body.y,
      w: typeof body.w === 'number' ? body.w : null,
      h: typeof body.h === 'number' ? body.h : null,
      color: body.color ?? null,
      text: body.text ?? null,
      dataJson: JSON.stringify(rest),
      createdById: user.id,
    },
  })
  return NextResponse.json({ element: serialize(el) })
}
