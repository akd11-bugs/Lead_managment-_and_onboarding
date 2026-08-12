import { promises as fs } from 'fs'
import path from 'path'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { STAGES, STAGE_LABELS, STAGE_DESCRIPTIONS, SOURCES, SOURCE_LABELS, type Stage } from '@/lib/types'
import { requireUser, isAdmin } from '@/lib/session'
import { prisma } from '@/lib/db'
import { UserManagement } from '@/components/settings/UserManagement'

async function checkSkillLibrary() {
  const libPath = process.env.SKILL_LIBRARY_PATH || path.join(process.cwd(), 'skills-library')
  const found = await fs
    .access(path.join(libPath, 'pipeline-hygiene-audit', 'SKILL.md'))
    .then(() => true)
    .catch(() => false)
  return { libPath, found }
}

export default async function SettingsPage() {
  const user = await requireUser()
  const skillLibrary = await checkSkillLibrary()
  const users = isAdmin(user)
    ? await prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      })
    : []
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Pipeline stages, sources, and skill library status.</p>
      </div>

      {isAdmin(user) && <UserManagement initialUsers={users as never} />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pipeline stages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {STAGES.map((s) => (
            <div key={s} className="flex items-start justify-between gap-3 py-1.5">
              <div>
                <p className="text-sm font-medium">{STAGE_LABELS[s]}</p>
                <p className="text-xs text-muted-foreground">{STAGE_DESCRIPTIONS[s]}</p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px]">
                {s}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lead sources</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {SOURCES.map((s) => (
            <div key={s} className="flex items-center gap-2 py-1">
              <Badge variant="outline" className="font-mono text-[10px]">
                {s}
              </Badge>
              <span className="text-sm">{SOURCE_LABELS[s]}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Skill library status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <EnvCheck label="Anthropic API key" envVar="ANTHROPIC_API_KEY" />
          <div className="flex items-center gap-2">
            {skillLibrary.found ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            )}
            <span className="font-medium">Skill library</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs ml-auto truncate">
              {skillLibrary.found ? `found at ${skillLibrary.libPath}` : `missing — expected ${skillLibrary.libPath}`}
            </code>
          </div>
          <EnvCheck label="Anthropic model" envVar="ANTHROPIC_MODEL" checkValue="claude-sonnet-4-5" />
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Pipeline Hygiene Audit and Spam Folder Check work without an API key (local Python).
            Other skills require <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function EnvCheck({ label, envVar, checkValue }: { label: string; envVar: string; checkValue?: string }) {
  const value = process.env[envVar]
  const ok = !!value
  return (
    <div className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
      )}
      <span className="font-medium">{label}</span>
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs ml-auto truncate">
        {ok ? `${envVar} = ${value.slice(0, 8)}…` : `${envVar} not set`}
      </code>
    </div>
  )
}