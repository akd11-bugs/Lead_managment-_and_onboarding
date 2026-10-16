# Execution flow

How a request travels through this codebase, file by file. Written for an
engineer new to the repo who needs to find where to put a change.

Every path below was traced against the actual source, not inferred.

---

## 1. Entry points

There are five ways into this system. They do **not** share an auth path.

| # | Entry | Who calls it | Authenticated by |
|---|---|---|---|
| 1 | Browser pages (`app/**/page.tsx`) | Staff in a browser | Neon Auth session cookie |
| 2 | Internal API (`app/api/**`) | This app's own frontend | Same session cookie |
| 3 | Rep form (`/rep`, `app/api/rep/*`) | Field reps | `rep_session` cookie (PIN login) |
| 4 | Agent API (`app/api/agent/v1/*`) | External AI agents | Per-org API key header |
| 5 | Cron + reports (`app/api/cron/*`, `api/external/*`) | GitHub Actions, external tools | Per-org / shared static key |

Plus one unauthenticated endpoint: `app/api/health/route.ts`.

**Process entry** is `app/layout.tsx` (root layout → `AppShell`). Every
request first passes through `proxy.ts` (Next.js middleware).

---

## 2. The middleware gate — `proxy.ts`

Runs before every matched request.

```
request
  → proxy.ts  (default export `proxy`)
      ├─ is it a state-changing /api/* call?  (POST/PATCH/PUT/DELETE)
      │     └─ yes → compare Origin header against x-forwarded-host
      │              (falls back to nextUrl.host for local/direct)
      │              mismatch → 403, request ends here        [CSRF defence]
      │
      ├─ is the path public?
      │     /login · /signup · /signup/complete · /invite/redeem
      │     /rep · "/" (root branches on session itself)
      │     └─ yes → NextResponse.next(), no session required
      │
      └─ otherwise → protect(req)  = neonAuth.middleware({ loginUrl: '/login' })
                      no valid session cookie → redirect /login
```

The `config.matcher` regex additionally **excludes whole API prefixes** from
the session check, because they authenticate themselves:
`api/auth`, `api/invites/redeem`, `api/signup`, `api/external`, `api/cron`,
`api/agent`, `api/rep`, `api/health`.

> Middleware runs on the Edge runtime and **cannot reach Prisma**. That is
> why role/org gating lives in `lib/session.ts`, not here.

---

## 3. Page request — the common path

Example: a user opens `/leads`.

```
proxy.ts (session ok)
  → app/layout.tsx
      ├─ getOptionalUser()            lib/session.ts
      └─ <AppShell user>              components/layout/AppShell.tsx
             ├─ user == null OR path is /login|/rep  → render children bare
             └─ otherwise → Sidebar + TopBar + CommandPalette + <main>
  → app/leads/page.tsx                (Server Component)
      ├─ requireUser()                lib/session.ts
      │     └─ resolveSession()       ← react `cache`-wrapped, once per render
      │           ├─ neonAuth.getSession()      identity only (email)
      │           └─ prisma.user.findUnique({ email })   ← our own User row
      │                 no row      → redirect /account-not-found
      │                 !isActive   → redirect /account-disabled
      │                 role=pending→ redirect /pending
      ├─ leadScope(user)              lib/session.ts   ← TENANT BOUNDARY
      └─ prisma.lead.findMany({ where: leadScope(user) })
  → HTML streamed to browser
```

**`leadScope()` is the single most important function in the codebase.** It
returns `{ orgId: { in: user.visibleOrgIds } }` for admin/operations, and
additionally `ownerId: user.id` for sales. The `orgId` filter applies to
every role and is never bypassed. Any new lead query must spread it in.

---

## 4. Root route — the session fork

`/` is the one path that serves two entirely different pages.

```
app/page.tsx
  → resolveSession()
      ├─ kind === 'no-session'  → <LandingPage />        ← public marketing
      └─ anything else          → requireUser()
                                   isOperations → redirect /onboarding
                                   otherwise    → dashboard
```

This is why the middleware treats `/` as public: the page itself decides.

---

## 5. Internal API request

Example: moving a lead between stages from the Kanban board.

```
browser fetch POST /api/leads/[id]/stage
  → proxy.ts            Origin check → session check
  → app/api/leads/[id]/stage/route.ts
      ├─ requireApiUser()         lib/session.ts   → 401 NextResponse if absent
      ├─ readJsonBody(req)        lib/http.ts      → 400 NextResponse if unparseable
      ├─ prisma.lead.findFirst({ where: { id, ...leadScope(user) } })
      │        not found → 404    ← this is how cross-org access is denied:
      │                              another org's id simply doesn't match
      ├─ applyStageChange(...)    lib/leadStage.ts ← shared business logic
      │        ├─ writes Lead.stage
      │        ├─ creates an Activity row
      │        └─ updates lead.lastActivityAt
      └─ logAudit(...)            lib/audit.ts     → AuditLog row
```

**Convention:** helpers like `requireApiUser` and `readJsonBody` return a
`NextResponse` on failure. Routes check `instanceof NextResponse` and return
it directly. Watch for this — it looks like a value but it's an early exit.

`applyStageChange` is the *single* stage-change path, shared by the Kanban
board, the lead dialog, the rep form, and the agent API. Change stage
behaviour there, not in a route.

---

## 6. Rep form — a separate auth world

Reps never have a Neon Auth session.

```
POST /api/rep/login
  → checkRateLimit(`rep-login:${ip}`, 20, 15min)   lib/rateLimit.ts
  → verifyRepLogin(name, pin)                      lib/repAuth.ts
        ├─ prisma.user.findMany({ where: { name } })   ⚠ see decisions.md
        ├─ bcrypt.compare(pin, user.pinHash)
        └─ per-account lockout: 5 attempts / 15 min
  → setRepSessionCookie(userId)                    lib/repSession.ts
        HMAC-SHA256 token, 10h expiry, httpOnly, secure in prod

subsequent POST /api/rep/activities
  → getRepSessionUser()                            lib/repSession.ts
        ├─ timingSafeEqual on the HMAC
        └─ re-reads the User row every request  ← deactivation takes effect
                                                   immediately, not at expiry
```

⚠ The user lookup in `lib/repAuth.ts:21` has **no `orgId` filter**. See
`decisions.md` → Known gaps #1.

---

## 7. Agent API — external writes

```
POST /api/agent/v1/leads        (header: x-agent-key)
  → proxy.ts                    ← matcher EXCLUDES api/agent, no session check
  → requireAgentOrg(req)        lib/agentAuth.ts
        prisma.organization.findUnique({ where: { agentApiKey } })
        → the key IS the tenant scope
  → validateLeadFields(...)     shared with the UI's own create path
  → duplicate check → 409 with a `duplicate` payload
  → prisma.lead.create({ data: { ..., orgId: org.id } })
```

Contract lives in `docs/agent-api.openapi.json`. No rate limiting on this
surface yet — `decisions.md` → Known gaps #2.

---

## 8. Marketing page render

```
app/page.tsx  (no session)
  → components/marketing/LandingPage.tsx          Server Component
      ├─ <Nav>                                    static
      ├─ <Hero>
      │     ├─ <HeroCanvas/>          'use client' → WebGL shader, rAF loop,
      │     │                            paused by IntersectionObserver
      │     ├─ <RevealOnMount>        CSS keyframe only, no JS dependency
      │     └─ <AppFrame><DashboardMock/>   'use client' → counts up in view
      ├─ <ProductDemo/>               'use client'
      │     ├─ tab state + auto-advance (stops on first click)
      │     └─ panels: PipelineMock · LeadProfileMock · LeadsMock
      │                · WhiteboardDemo (own chrome, animated cursors)
      ├─ <Manifesto>
      │     └─ <ScrollWordReveal>     'use client' → useScroll/useTransform,
      │                                  one opacity slice per word
      ├─ <HowItWorks>                 .stamp-edge numerals
      ├─ <Privacy> · <FinalCta> · <Footer>
```

Client/server split: the page itself is a Server Component; only the
animated pieces opt into `'use client'`.

---

## 9. Where to make a change

| Task | File |
|---|---|
| Change who can see which leads | `lib/session.ts` → `leadScope()` |
| Change stage-change behaviour | `lib/leadStage.ts` → `applyStageChange()` |
| Add a public (no-session) route | `proxy.ts` → `isPublicPage` **and** `config.matcher` |
| Add an audited action | `lib/audit.ts` → action union, then `logAudit()` |
| Rebrand the marketing mocks | `components/marketing/AppMock.tsx` → `BRAND` |
| Rate-limit an endpoint | `lib/rateLimit.ts` → `checkRateLimit()` at route top |
| Change the CSP | `next.config.mjs` → `CSP` array |
| Add a DB field | `prisma/schema.prisma`, then `npx prisma generate` |

---

## 10. Cross-cutting helpers

| File | Responsibility |
|---|---|
| `lib/db.ts` | Prisma singleton (`globalForPrisma` guard in non-prod) |
| `lib/session.ts` | `resolveSession` · `requireUser` · `requireApiUser` · `leadScope` · role predicates |
| `lib/http.ts` | `readJsonBody` · `safeEqual` — both return `NextResponse` on failure |
| `lib/rateLimit.ts` | In-memory limiter. **Resets on deploy, not shared across instances** |
| `lib/audit.ts` | `logAudit()` → `AuditLog` |
| `lib/crypto.ts` | AES-256-GCM at-rest encryption, token generation |
| `lib/ssrfGuard.ts` | Blocks private/loopback/metadata IPs; re-resolves DNS per call |
| `lib/jobRun.ts` | Per-org cron success/failure → `JobRun` |
| `lib/email.ts` | Nodemailer; precedence: user Gmail → org SMTP → env fallback |

---

# Onboarding documents: the browser vault

Added 2026-10-16. This flow is unusual and worth reading before touching it,
because the file bytes deliberately never enter the server process.

## Entry point

`/leads/[id]/onboarding` (`app/leads/[id]/onboarding/page.tsx`)
A Server Component. Guards with `requireUser()`, then restricts to
`isAdmin || isOperations || lead.ownerId === user.id`. Renders
`OnboardingProgressPanel` and, below it, `DocumentVaultPanel`.

## Upload path

```
DocumentVaultPanel.onPick(file)              [browser]
  └─ putDocument(file, leadId)               lib/docVault.ts
       ├─ hashFile(file)                     crypto.subtle SHA-256
       ├─ localKey = `${leadId}:${sha.slice(0,32)}`
       └─ IndexedDB.put({ localKey, blob })  ← BYTES STOP HERE
  └─ POST /api/leads/[id]/documents          metadata only
       ├─ requireApiUser()                   401 if no session
       ├─ authorizeLead(user, leadId)        404 if another org or not owned
       ├─ validateDocumentMetadata(body)     lib/documentPolicy.ts
       │    └─ carriesContent()              400 if ANY content field present
       └─ prisma.onboardingDocument.create({ orgId: user.orgId, ... })
```

The POST body carries `fileName`, `mimeType`, `byteSize`, `sha256`,
`localKey`, `kind`. It never carries the file. `validateDocumentMetadata`
rejects the request outright if `content`, `data`, `base64`, `blob`, `file`,
`bytes` or `dataUrl` is present, so a careless future client cannot quietly
turn this into server-side storage.

## Read path

```
DocumentVaultPanel.load()
  └─ GET /api/leads/[id]/documents           metadata rows, org-scoped
  └─ for each row: hasDocument(localKey)     lib/docVault.ts
       └─ IndexedDB.count(localKey)          is it in THIS browser?
```

A row whose bytes are absent renders as "held elsewhere" with no download
affordance, because there is nothing to download. Viewing uses
`openDocumentUrl()` -> `URL.createObjectURL(blob)`, revoked after 60s.

## Where the org boundary is enforced

| Step | File | Mechanism |
|---|---|---|
| Session | route.ts | `requireApiUser()` returns 401 |
| Lead access | route.ts `authorizeLead` | `orgId` + conditional `ownerId` |
| Row creation | route.ts | `orgId: user.orgId`, never from the body |
| Row listing | route.ts | `where: { orgId, leadId }` |

A client-supplied `orgId` in the POST body is ignored. There is a test for
exactly that (`app/api/leads/[id]/documents/route.test.ts`).
