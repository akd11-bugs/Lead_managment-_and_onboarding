# LRM_blu — Lead Management System

A web-based CRM that **productizes your B2B lead-generation skills** as features inside the UI. Instead of running skill diagnostics by hand, the LMS surfaces them as buttons, alerts, and reports tied to live CRM data.

## What it does

- **Kanban pipeline** — drag leads across 7 stages (New → Contacted → Follow Up → Qualified → Proposal → Won / Lost)
- **Lead detail** — activities, notes, source, value, owner
- **Skills launcher** — all 30 of your B2B lead-gen skills live as buttons
- **Hybrid runner** — 2 script-backed skills run instantly via Python (free), 28 use Claude (judgment)
- **Skill-driven dashboard** — auto-suggests which skills to run based on lead data
- **Skill history** — every run is logged, per-lead

## Stack

- **Next.js 16** + TypeScript + App Router
- **Tailwind CSS** + **shadcn/ui** (Radix primitives)
- **Prisma** + **SQLite** (file-based, zero setup)
- **@dnd-kit** for the kanban
- **Recharts** for skill report visualizations
- **Anthropic SDK** for the 28 LLM-driven skills

## Setup (local)

```bash
# Install deps
npm install

# Copy env template and edit
cp .env.example .env
# Add your ANTHROPIC_API_KEY (only needed for the 28 LLM-driven skills)
# Pipeline Hygiene Audit and Spam Folder Check work without a key

# Initialize database
npx prisma db push
npm run db:seed

# Dev
npm run dev
```

App runs at **http://localhost:3000**.

## Deploy to Vercel (demo mode)

The fastest path to a public URL. **Demo mode = SQLite reseeds on every cold start**, so data does not persist between deploys but the app is always populated with 25 leads.

### Step 1 — Import on Vercel
1. Go to **https://vercel.com/new**
2. Sign in with GitHub (`akshat1234e`)
3. Click **"Import"** next to `akshat1234e/LRM_blu`
4. Click **Deploy** — Vercel will detect Next.js automatically

That's it. The first deploy will take ~2 minutes. The `postbuild` script runs `prisma db push` and `tsx prisma/seed.ts` so the DB is always ready.

### Step 2 — Set environment variables

After the first deploy, go to **Settings → Environment Variables** and add:

| Name | Value | Required for |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | 28 LLM-driven skills (Pipeline Hygiene and Spam Folder Check work without it) |
| `SKILL_LIBRARY_PATH` | absolute path | Optional — only needed to override the bundled `skills-library/`. **See note below.** |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Optional, defaults to Sonnet 4.5 |

#### SKILL_LIBRARY_PATH on Vercel
The 30 skills are bundled directly into the repo at `skills-library/` (committed, not gitignored — Vercel deploys from git, so a gitignored copy would never reach production). `SKILL_LIBRARY_PATH` is no longer required: `lib/skills/runner.ts` defaults to `skills-library/` at the repo root and only needs the env var if you want to point at a different location.

### Step 3 — Custom domain (optional)

Settings → Domains → add `lrm-blu.com` (or whatever you own). Free on Vercel.

## Demo-mode limitations

| Thing | Behavior on Vercel |
|---|---|
| Leads you create | Persist in Postgres — no longer reset on cold start |
| Skill runs (LLM) | Work if `ANTHROPIC_API_KEY` is set |
| Spam Folder Check | Works — it's a guided checklist, no shell-out required |
| Pipeline Hygiene Audit | May not work on Vercel — spawns `python3` via `child_process`, which serverless functions don't reliably support |
| Cookies / sessions | Stateless for now — auth is on the roadmap, not yet built |

## Path to production

See `ROADMAP.md` for current status. Postgres and the bundled skill library are done; auth/roles and background jobs for LLM skills are still open.

See `.claude/CLAUDE.md` for the architecture overview.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build (auto-runs db push + seed via postbuild)
- `npm run db:seed` — reseed the database manually
- `npm run db:studio` — open Prisma Studio

## Architecture

See `.claude/CLAUDE.md` for the full architecture and conventions.

## Skills

The 30 skills from `~/Desktop/b2b-lead-generation-claude-skills-main/` are referenced directly (no copy). Three new LMS-specific skills live in `.claude/skills/`.
