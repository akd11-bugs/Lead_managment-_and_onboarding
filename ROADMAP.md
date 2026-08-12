# LRM_blu — Roadmap

Status as of 2026-08-10. See `.claude/CLAUDE.md` for architecture, `README.md` for setup/deploy.

## Stack decisions (confirmed)

- **Backend / persistence: Prisma.** Already the ORM in place (`prisma/schema.prisma`). Local dev stays on SQLite; Phase 1 swaps the provider to Postgres — no ORM change needed, just a datasource + migration.
- **Hosting: Vercel.** Already the documented deploy target (`README.md` → "Deploy to Vercel"). Not yet actually deployed (no `.vercel/` dir in the repo).

## Phase 0 — Deploy-ready (in progress)

- [x] Dashboard, kanban, leads table run with zero env vars
- [x] LLM skills degrade gracefully (clear error if `ANTHROPIC_API_KEY` missing)
- [x] `spam-folder-check` bug fixed — no longer requires `SKILL_LIBRARY_PATH`
- [x] Kanban drag-and-drop fixed — whole card is draggable, not just a hidden handle
- [x] Stage changes in the lead dialog now reflect on the kanban board (`patchLead` calls `router.refresh()`)
- [x] Lead quality/effort tags (`low`/`medium`/`high`) + sort by date/quality/stage on `/leads`
- [ ] First real deploy to Vercel

## Phase 1 — Production infra (0/6)

| # | Item | Status |
|---|---|---|
| 1 | Postgres (Prisma Postgres, linked `db_cmsn3m1h01ien1adx065ypm0d`) | ✅ Done |
| 2 | `schema.prisma` provider → `postgresql` | ✅ Done |
| 3 | `DATABASE_URL` wired to hosted Postgres | ✅ Done — `.env`, gitignored |
| 4 | Bundle skill library into repo | ✅ Done — `skills-library/`, committed |
| 5 | Auth + roles (Clerk / Supabase Auth) | **Deferred — parked for later** |
| 6 | Background jobs for LLM skill streaming | Not started |

Items 1–3 done via Prisma Postgres (not Supabase/Neon as originally scoped — same outcome, different provider): migration history baselined at `prisma/migrations/20260810110139_init`, driver adapter (`@prisma/adapter-pg`) wired into `lib/db.ts`, connectivity verified via `scripts/verify-prisma.ts`.

Item 4 done by copying the 30 skill folders + `scripts/` from the external skill library into `skills-library/` at the repo root, committed (not gitignored — Vercel deploys from git). `lib/skills/runner.ts` now defaults `SKILL_LIBRARY_PATH` to `skills-library/` when the env var isn't set, so LLM and script-backed skills work with zero config, including on Vercel. Verified all three code paths (an LLM skill, `pipeline-hygiene-audit`, `spam-folder-check`) resolve correctly against the bundled copy.

Note: item 6 (background jobs) is also the mechanism F5 (Sequences) needs to materialize steps — build once, use for both.

### Item 5 detail — Auth & role-based access

Two roles at launch:

- **Admin** — sees every lead, every activity, every skill run, regardless of owner.
- **Sales** — sees only leads where they are the owner. Pipeline, leads table, dashboard KPIs, and skill runs all scope to "my leads" for this role.

Acceptance criteria:

- [ ] Log in as Admin → `/pipeline` and `/leads` show all leads across all owners
- [ ] Log in as Sales user A → `/pipeline` and `/leads` show only leads where `ownerId = A`
- [ ] Sales user A cannot view/edit a lead owned by Sales user B (direct URL to `/leads/[id]` also blocked, not just hidden from lists)
- [ ] Dashboard KPIs/funnel for a Sales user reflect only their own leads; Admin dashboard reflects the whole portfolio
- [ ] New lead created without an explicit owner (e.g. via Importer or Routing, F4) defaults to the creating user unless a routing rule assigns it elsewhere

**Schema:** replace the current placeholder ownership fields with a real `User` model —

`User { id, name, email, role: 'admin' | 'sales' }`

`Lead.ownerId` currently defaults to the hardcoded string `"self"` (`prisma/schema.prisma:22`) — this needs to become a real foreign key to `User.id` once auth exists. `ownerName` becomes redundant once `owner` can be resolved via relation and can likely be dropped.

**Needs:**
- Auth provider session → resolves to a `User` row with a `role`
- Every lead-scoped query (leads list, pipeline, dashboard aggregates, lead detail, activities, skill runs) gated by role: Admin = no filter, Sales = `WHERE ownerId = currentUser.id`
- API routes (`/api/leads`, `/api/activities`, `/api/skills/run`) enforce the same scoping server-side — not just hidden in the UI, since a Sales user hitting `/api/leads/[id]` directly for another owner's lead must be rejected
- Decide whether Sales users can *see* teammates' leads read-only (e.g. for handoffs) or are fully walled off — current ask implies fully walled off; flag if that changes

## Phase 2 — Feature set

New Prisma models required for this phase are called out per feature. None of these exist in `prisma/schema.prisma` yet.

### F1 — Tasks

- [ ] Create a task on a lead from the lead detail dialog
- [ ] Navigate to `/tasks` → see it bucketed by due date
- [ ] Mark done → it disappears from "Today"
- [ ] Task rows created with `source: "alert"` (dashboard alert → task, not just manual creation)

**Schema:** `Task { id, leadId, title, dueDate, done, source: 'manual' | 'alert' | 'sequence', createdAt }`

### F3 — Artifact (skill output actions)

- [ ] Run a skill (e.g. `ghosted-after-the-demo`)
- [ ] Click "Email draft" → opens `mailto:` with subject + body
- [ ] Click "Download .md" → file downloads

**Needs:** a parser that pulls subject/body out of the skill's markdown output for the mailto link (extends `lib/skills/parsers.ts`); no new schema strictly required, output already persisted on `SkillRun.outputMarkdown`.

### F4 — Routing

- [ ] Add a routing rule: `source = "linkedin"`, owner = Aarav
- [ ] Create a new lead with `source: "linkedin"`, no owner → verify it lands on Aarav

**Schema:** `RoutingRule { id, matchField, matchValue, ownerName, priority, createdAt }`
**Needs:** rule evaluation on lead creation (`POST /api/leads`).

### F5 — Sequences

- [ ] Create a sequence "Bank CISO follow-up" with 3 steps (Day 0 email, Day 3 task, Day 7 call)
- [ ] Enroll a lead → verify `SequenceEnrollment` created
- [ ] Reload dashboard → verify Day 0 step materialized as a Task on the lead

**Schema:** `Sequence { id, name }`, `SequenceStep { id, sequenceId, dayOffset, type, content }`, `SequenceEnrollment { id, leadId, sequenceId, startedAt, currentStepIndex }`
**Needs:** step materialization job — depends on F1 (Tasks) existing, and ideally on Phase 1 item 6 (background jobs) rather than a page-load-time check.

### Importer

- [ ] `/import` → drop `seed-import.csv` (test fixture, 50 rows, headers like "First Name", "Work Email", "Mobile", "Industry")
- [ ] Auto-match shows 4/6 columns mapped automatically
- [ ] Map remaining 2 manually, save mapping as "Test import v1"
- [ ] Preview shows 5 mapped rows correctly
- [ ] Commit → 50 leads appear on `/leads`
- [ ] Re-import same file → "Test import v1" appears as a saved mapping; picking it skips the mapping step

**Schema:** `ImportMapping { id, name, columnMap (JSON), createdAt }`
**Needs:** CSV parsing + fuzzy header-matching utility.

## Feature dependency notes

- **F1 before F5** — sequence steps materialize as Task rows, so Tasks needs to exist first.
- **F4 is independent** — can be built in parallel with anything else.
- **Importer benefits from F4 existing** — imported leads should pass through routing rules on creation, same as manually created ones.
- **Background job runner is shared infra** — needed by Phase 1 item 6 (async LLM skills) and F5 (sequence step materialization). Worth designing once.
- Given Importer and Sequences both do multi-row writes, doing the **Postgres migration (Phase 1, items 1–3) before or alongside F5/Importer** is safer than building them against file-based SQLite.

## Smoke tests (run after any phase lands)

`GET /`, `/pipeline`, `/leads`, `/skills`, `/tasks`, `/sequences`, `/import` — all return 200.
