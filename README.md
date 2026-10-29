<div align="center">

# ⚡ Steadfast

### The open-source CRM that turns a lead-gen playbook into software

**Multi-tenant · AI-native · MCP-first**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-Postgres-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![Claude](https://img.shields.io/badge/LLM-Claude_Sonnet_4.5-D97757?logo=anthropic&logoColor=white)](https://www.anthropic.com)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#contributing)

[Features](#-features) · [Architecture](#-architecture) · [Quickstart](#-quickstart) · [MCP](#-mcp--agent-integrations) · [Contributing](#-contributing)

</div>

---

## Why Steadfast exists

Most CRMs are a database with a UI bolted on. Steadfast starts from the other direction: a **30-skill B2B lead-generation methodology** — pipeline hygiene, spam-folder checks, ICP scoring, outreach QA, and more — productized as first-class, clickable features tied to live pipeline data. Every skill either runs free and instant (deterministic Python) or runs on Claude when it needs judgment. No fabricated output, ever — if the data isn't there, the skill says so instead of guessing.

On top of that: a real-time collaborative whiteboard that *understands what you write on it*, a drag-and-drop pipeline, public lead-intake forms with configurable fields, business-card scanning (OCR + QR), and a Model Context Protocol server so any AI agent — Claude, or your own tooling — can read and act on your pipeline directly.

## ✨ Features

| | |
|---|---|
| 🗂️ **7-stage Kanban pipeline** | Drag leads through `new → contacted → follow_up → qualified → proposal → won/lost`, powered by `@dnd-kit` |
| 🧠 **30-skill AI playbook** | 2 skills run as free deterministic Python scripts; 28 run on Claude Sonnet 4.5 for judgment calls — all dispatched through one unified runner |
| 🖊️ **AI whiteboard** | A real-time, multiplayer (Liveblocks) canvas — sticky notes are watched on-device (NER, zero API cost) and the board quietly suggests "log this activity" or "create this lead" as you type |
| 🏢 **True multi-tenancy** | Every row is organization-scoped at the query layer, not just the UI — see [`lib/session.ts`](lib/session.ts)'s `leadScope()` and our [tenant isolation tests](test/tenantIsolation.test.ts) |
| 🌐 **Public lead intake** | Shareable, no-login intake forms per organization, with admin-configurable fields (fixed + custom), QR/business-card capture, and Google Sheets write-back |
| 🔌 **MCP-native** | A full [Model Context Protocol](https://modelcontextprotocol.io) server exposes your pipeline as tools for Claude or any MCP client — plus bring-your-own external MCP servers, merged straight into the tool list |
| 🔑 **Agent API** | A scoped, key-authenticated REST surface (`/api/agent/v1/*`) for external automations to create leads, move stages, and log activity — safely, without touching the admin UI |
| 📊 **Skill-driven dashboard** | KPIs and alerts that tell you *which* skill to run next, based on what's actually wrong in your pipeline right now |
| 🎭 **Field reps, no login** | A slug-based `/rep/<org>` flow for reps who need to work leads without an email/password account |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 16 App Router                   │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐ │
│  │  Pipeline  │  │   Leads    │  │ Whiteboard │  │  Skills   │ │
│  │  (Kanban)  │  │   Table    │  │ (Liveblocks│  │  Runner   │ │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘ │
│        └──────────────┴──────────────┴──────────────┘        │
│                           │                                   │
│                   API Routes (REST)                           │
│        ┌──────────────────┴──────────────────┐               │
│        │                                     │               │
│  ┌─────▼──────┐                      ┌───────▼────────┐      │
│  │   Prisma   │                      │  Claude Sonnet │      │
│  │  (Postgres │                      │   4.5 + Python  │      │
│  │   / Neon)  │                      │  hybrid runner  │      │
│  └────────────┘                      └────────────────┘      │
└─────────────────────────────────────────────────────────────┘
        │                                        │
        ▼                                        ▼
┌──────────────────┐                  ┌─────────────────────┐
│  MCP endpoint     │                  │  Agent API (keyed)   │
│  /api/agent/mcp   │◄── any MCP ──────│  /api/agent/v1/*     │
│  + BYO MCP merge  │     client       │  external automations │
└──────────────────┘                  └─────────────────────┘
```

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript (strict, no `any`) |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Database | Prisma + Postgres (Neon in production) |
| State | Zustand (UI-only — never source of truth) |
| Drag & drop | `@dnd-kit` |
| Real-time | Liveblocks (presence/cursors on the whiteboard) |
| Charts | Recharts |
| LLM | Anthropic SDK, Claude Sonnet 4.5 |
| Scripts | Python 3, stdlib only |

Full conventions and multi-tenancy rules live in [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — read this before touching any Prisma query.

## 🚀 Quickstart

```bash
git clone https://github.com/<your-org>/steadfast.git
cd steadfast
npm install
cp .env.example .env   # fill in DATABASE_URL at minimum
npx prisma db push
npx prisma db seed
npm run dev
```

App runs at **http://localhost:3000**. The two script-backed skills (pipeline hygiene, spam-folder check) work immediately with zero API key. The other 28 need `ANTHROPIC_API_KEY`.

For local development against a disposable Postgres instance with realistic seeded data:

```bash
./scripts/test-db.sh       # stands up Docker Postgres, restores sample data
./scripts/use-local-db.sh  # points .env.local at it
```

### Before shipping a change

```bash
npx tsc --noEmit
npx vitest run
npx next build
```

## 🔌 MCP & agent integrations

Steadfast speaks [MCP](https://modelcontextprotocol.io) both ways:

- **As a server** — point Claude (or any MCP client) at `/api/agent/mcp` with a per-org agent key, and it can read leads, move pipeline stages, and log activity as native tools.
- **As a hub** — register any third-party MCP server's URL + token in Settings, and its tools are merged automatically into Steadfast's own tool list. Bring your own automation stack; Steadfast doesn't gate it.

## 🔐 Multi-tenancy, taken seriously

`orgId` is the only boundary between customers — there is no cross-org visibility by design. Every lead query is scoped through [`leadScope()`](lib/session.ts), ids are resolved with `findFirst` + an explicit `orgId` term (never a bare `findUnique`), and another org's row 404s rather than 403s, so its existence is never confirmed to the wrong tenant. This is enforced by tests, not just convention — see [`test/tenantIsolation.test.ts`](test/tenantIsolation.test.ts) and [`test/integration.test.ts`](test/integration.test.ts).

## 🗺️ Roadmap

See [`ROADMAP.md`](ROADMAP.md) for current status and what's next.

## 🤝 Contributing

Issues and PRs are welcome. Please:

1. Open an issue describing the change before a large PR.
2. Run `npx tsc --noEmit && npx vitest run` before submitting.
3. Follow the conventions in [`.claude/CLAUDE.md`](.claude/CLAUDE.md) — especially the multi-tenancy rules; a PR that bypasses `leadScope()` or uses a bare `findUnique` on a client-supplied id won't be merged.

## 📄 License

Apache 2.0 — see [`LICENSE`](LICENSE).

---

<div align="center">

Built on a real 30-skill B2B lead-generation methodology, not a generic CRM template.

</div>
</content>
