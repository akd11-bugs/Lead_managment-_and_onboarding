# LRM_blu — Architecture & Conventions

## What this is

A web-based Lead Management System that productizes a 30-skill B2B lead-generation library as in-app features. The LMS is the operator's *tool*; the skill library is the *methodology*.

## Stack

| Layer | Tech | File |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | `next.config.mjs`, `tsconfig.json` |
| Styling | Tailwind CSS v3 + shadcn/ui | `tailwind.config.ts`, `components/ui/*` |
| Database | Prisma + SQLite | `prisma/schema.prisma`, `lib/db.ts` |
| State | Zustand (UI only) | `lib/store.ts` |
| Drag & Drop | @dnd-kit | `components/kanban/*` |
| Charts | Recharts | `components/dashboard/*` |
| LLM | Anthropic SDK (Claude Sonnet 4.5) | `lib/skills/runner.ts` |
| Scripts | Python 3 (stdlib only) | `app/api/skills/script/*` |

## Layout

```
app/
  layout.tsx              # Root layout. Sidebar + TopBar.
  page.tsx                # Dashboard — skill-driven alerts + KPIs.
  pipeline/page.tsx       # Kanban board.
  leads/page.tsx          # Leads table.
  leads/[id]/page.tsx     # Lead detail. Activity timeline + skill actions.
  skills/page.tsx         # 30 skill cards, categorized.
  skills/[skillId]/page.tsx # Skill run + report.
  api/skills/run/route.ts # Unified skill runner (POST).
  api/skills/script/route.ts # Python-backed skills (2 of 30).
  api/skills/llm/route.ts    # Claude-backed skills (28 of 30).
  api/leads/route.ts     # CRUD leads.
  api/activities/route.ts # CRUD activities.

lib/
  db.ts                   # Prisma client singleton.
  store.ts                # Zustand (filters, current user, sidebar).
  types.ts                # Lead, Activity, Stage, Source, SkillRun types.
  skills/
    catalog.ts            # 30 skill entries. Source of truth.
    runner.ts             # Dispatches to script or LLM.
    parsers.ts            # Markdown → structured JSON for rendering.
    prompts.ts            # Builds the prompt sent to Claude.

components/
  kanban/                 # KanbanBoard, KanbanColumn, LeadCard, LeadDetailDialog.
  layout/                 # Sidebar, TopBar.
  leads/                  # LeadForm, ActivityTimeline, SkillActionsPanel.
  dashboard/              # StatTile, AlertBanner, ActivityFeed, FunnelChart.
  ui/                     # shadcn primitives.

prisma/
  schema.prisma           # Lead, Activity, SkillRun (no User for v1).
  seed.ts                 # 25 leads across all stages.
```

## Pipeline Stages

`new → contacted → follow_up → qualified → proposal → won | lost` (7 stages).

Stage colors are defined in `tailwind.config.ts` under `colors.stage.*`.

## Skill Runner (Hybrid)

The library at `~/Desktop/b2b-lead-generation-claude-skills-main/` has 30 skills. The LMS exposes them all.

Two skills have deterministic Python scripts and run **free / instant**:

- `pipeline-hygiene-audit` → `scripts/pipeline_hygiene.py`
- `spam-folder-check` → `scripts/email_auth_check.py`

The other 28 run via **Claude Sonnet 4.5** (~ $0.05–0.30 per run).

The runner dispatch is in `lib/skills/runner.ts`. The catalog entry tells the runner which path to take.

## Conventions

- **TypeScript strict** — no `any` in production code.
- **Server components by default** — opt into `"use client"` only when needed (drag-drop, dialogs, lookup).
- **API routes** for everything that touches the database or runs skills.
- **No fabricated data** — same rule as the skill library. If we don't have it, we say so.
- **Skills never modify CRM data** — they produce reports. The user applies the changes.

## Skill Library Reference

The 30 skills are referenced from `~/Desktop/b2b-lead-generation-claude-skills-main/`. Path is `SKILL_LIBRARY_PATH` in `.env`. The catalog (`lib/skills/catalog.ts`) maps skill IDs to display metadata. The runner reads the corresponding `SKILL.md` from disk at run time.

## LMS-Specific Skills

Three new skills live in `.claude/skills/`:

- `lms-data-export-helper` — clean CRM export for any skill to consume.
- `lms-alert-triage` — process the dashboard's suggested skills, prioritize.
- `lms-skill-history-recap` — summarize what skills have been run and what was applied.

These follow the same `SKILL.md` format (YAML frontmatter, "Use this skill when", decision rules, guardrails) as the parent library.
