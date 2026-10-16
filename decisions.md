# Decisions

Why the code looks the way it does. Each entry records the decision, the
reasoning, the alternatives rejected, and the trade-off accepted. Newest
first within each section.

Written for: engineers joining this codebase, and anyone evaluating it for
purchase. It assumes you can read the code but not that you know why.

---

## Marketing site

### Landing page aesthetic: dark gradient, not Neo-Brutalist

**Decision.** `components/marketing/LandingPage.tsx` renders a dark
(`#07080c`) page with gradient washes and a blue accent (`#5b8cff`).

**Why.** The brief was "like tryprofound.com". Fetching that site showed no
WebGL, no parallax, and no 3D — its polish comes from scroll choreography,
animated product demos, and typographic restraint. Building a heavy
immersive experience would have looked *less* like the reference, not more.

**Rejected.** An earlier version of this page was Neo-Brutalist (cream
`#f5f3ec`, 2px black borders, hard offset shadows). It was replaced
wholesale. The postal/stamp motifs from that direction survive only as an
accent — see the next entry.

**Trade-off.** The brutalist version is gone and uncommitted; it is not
recoverable from git. Accepted because the two aesthetics cannot coexist on
one page without looking indecisive.

### Stamp perforation as accent, not system

**Decision.** `.stamp-edge` in `app/globals.css` punches postage-stamp
notches into an element's top and bottom edges. Used on the step numerals in
the "How it works" cards.

**Why.** The analogue/postal direction was the original brief and still has
value as a signature detail. Applied sparingly it distinguishes the page;
applied everywhere it would fight the dark aesthetic.

**Implementation note.** The mask uses **three** layers — a notch strip top,
a notch strip bottom, and a solid fill between them — composited by addition.
The obvious two-layer version with `mask-composite: intersect` makes the
element vanish entirely, because intersecting a top-only strip with a
bottom-only strip leaves an empty middle. This was hit and fixed during
development; don't "simplify" it back.

**Trade-off.** `--stamp-notch` must stay well under half the element's
height or perforations eat the content. Defaults (3px notch / 8px gap) suit
small chips; override the custom properties for large cards.

### WebGL hero: hand-written shader, not three.js

**Decision.** `components/marketing/HeroCanvas.tsx` is raw WebGL — one
fullscreen triangle running one fragment shader (domain-warped fbm noise).

**Why.** The effect is a single ambient gradient. three.js is ~600KB for a
scene graph, camera system, and material pipeline none of which this uses.
The hand-written version is ~2KB of shader source on the first page a
visitor ever loads.

**Trade-off.** Raw WebGL is harder to modify than a library API. Accepted
because the shader is self-contained and unlikely to grow. If this ever
needs real 3D, switch to three.js rather than extending this file.

**Safety.** Pauses via `IntersectionObserver` when scrolled off and on
`visibilitychange`; skipped entirely under `prefers-reduced-motion`; falls
back silently to the CSS gradient beneath it if the context is unavailable.

### Scroll animation: `motion`, not GSAP

**Decision.** `components/marketing/ScrollReveal.tsx` uses motion's
`useScroll` / `useTransform`.

**Why.** GSAP was requested. Its Standard License turns out to permit
commercial use free, with all plugins now free, and one prohibition
(building a no-code animation tool that competes with Webflow) that does not
apply to a CRM. So licensing was *not* the blocker.

The blocker was redundancy: `motion` v13 is already a dependency and exports
`useScroll`, `useTransform`, and `supportsScrollTimeline`. Adding GSAP would
ship two animation libraries doing the same job.

**Residual caveat.** GSAP's license does not explicitly address bundling into
a product resold to third parties — which is this product's situation. Not a
reason to avoid it outright, but a reason not to add it without need.

**Trade-off.** GSAP's ScrollTrigger has a nicer API for pinned, scrubbed
choreography. If the scroll work grows beyond per-word reveals and
scroll-linked transforms, revisit with a concrete reason.

### Lenis for smooth scroll — added after inspecting the reference site

**Decision.** `components/marketing/SmoothScroll.tsx` runs Lenis 1.3.27,
dynamically imported, mounted by `LandingPage` only.

**Why.** Inspecting neutomni.com's actual markup (rather than its rendered
HTML) showed its stack: GSAP 3.15 + ScrollTrigger + SplitText + MorphSVG,
**Lenis 1.3.21**, Lottie, and CircleType. Of those, Lenis contributes most of
the "expensive" feel — the weighted, eased scrolling that is present before
any animation fires. Their lerp values are mirrored here: `0.07` desktop,
`0.3` mobile.

This revises the entry above: that decision was made before seeing the
reference's real stack, and it was partly wrong about *why* to skip GSAP.
Licensing was never the blocker. GSAP remains unused because motion already
covers the reveals — but Lenis has no motion equivalent, so it was added.

**Scoped deliberately.** Smooth scroll is NOT applied app-wide. Hijacking
scroll inside a CRM makes long tables and the kanban board feel laggy and
breaks `scrollIntoView`. The component mounts only on the marketing page.

**Trade-off.** One more dependency, though MIT with zero transitive deps.
Dynamically imported so authenticated pages never load it. Skipped entirely
under `prefers-reduced-motion`, since smooth scroll is precisely what that
setting exists to disable, and falls back to native scrolling if the import
fails.

**Install note.** `npm install lenis` fails in this repo with
`Cannot read properties of null (reading 'edgesOut')` — a corrupted
resolution tree originating in `@neondatabase/auth`'s transitive
`@better-auth/api-key`, unrelated to Lenis. It was installed by fetching the
registry tarball, verifying its SHA-512 against the registry's published
integrity hash, extracting to `node_modules/lenis`, and adding matching
entries to `package.json` and `package-lock.json` by hand. **The underlying
npm tree problem is still there** and will bite the next `npm install`.

### Onboarding flow: scroll-advanced steps, not video

**Decision.** `components/marketing/OnboardingFlow.tsx` replaces the old
three-card "How it works" grid with a four-step sequence whose active step
lights up as you scroll, paired with a sticky preview pane.

**Why.** Modelled on redstone.software's numbered process section. Inspecting
that site showed something useful: it runs **no animation library at all**
— its "feature animations" are 14 `<video muted loop playsinline>` elements
with the real file in `data-src`, loaded and played only when scrolled into
view. verteal.com does the same with 4 videos (on Next.js + motion, the same
stack as here).

**Rejected: actual video.** That technique needs screen recordings of the
product, and there are none in this repo. The previews are animated DOM
instead — reusing the live-mock approach already established, so they stay
brandable and weigh nothing. The trade-off is that they are stylised rather
than literal captures.

**Implementation.** One `IntersectionObserver` across all steps, picking the
entry nearest the viewport's vertical centre, rather than a scroll handler —
no per-frame work on the main thread. Preview panels are stacked in a single
grid cell so the frame height is the tallest panel and never jumps when the
active step changes.

**If you later record real demos:** each step's `preview` is a React node, so
swapping one for a `<video muted loop playsinline poster=…>` is a one-line
change per step. Follow Redstone's pattern — lazy `data-src`, play on
intersect — rather than `autoplay`.

### Product screenshots replaced with live DOM

**Decision.** `components/marketing/AppMock.tsx` and `WhiteboardDemo.tsx`
recreate the dashboard, pipeline, leads table, lead profile, and whiteboard
as animated DOM. The five PNGs under `public/marketing/` are no longer
referenced.

**Why.** Two reasons, either sufficient. (1) The captures had the previous
tenant's wordmark and a real account name baked into the pixels — unusable
for a white-label sale. (2) A still frame cannot show the collaborative
cursors, which is the entire point of the whiteboard feature.

**Trade-off.** These mocks are stylised, not pixel-identical to the product,
and will drift as the real UI changes. Accepted because a screenshot drifts
too, just less visibly. `BRAND` in `AppMock.tsx` is the single string to
change when rebranding.

### Reveal animations never hide content server-side

**Decision.** `components/marketing/Reveal.tsx` renders fully visible markup
from the server and only hides an element *after* the client confirms it can
animate it back.

**Why.** The first implementation used motion's `initial={{ opacity: 0 }}`,
which serialises `opacity:0` into the server HTML. With JS blocked, slow, or
failed, the marketing copy was permanently invisible — verified by finding 18
`opacity:0` occurrences in the served HTML.

**Trade-off.** A brief flash of fully-visible content is possible before the
observer arms. Preferred over a page that can render blank.

### Dev-only `'unsafe-eval'` in the CSP

**Decision.** `next.config.mjs` adds `'unsafe-eval'` to `script-src` when
`NODE_ENV === 'development'` only.

**Why.** React's development build uses `eval()` for debugging features.
Without the token, the dev runtime fails and client components never finish
hydrating — animations silently never run. This was breaking every page in
dev, not just new work.

**Trade-off.** None in production: the token is absent from the production
CSP, verified by inspecting the built server's response headers. Production
React never calls `eval()`.

---

## UI components

### Badge and Tabs extended, not replaced

**Decision.** Third-party component snippets (21st.dev) were adapted into the
existing `components/ui/badge.tsx` and `tabs.tsx` rather than added as new
files.

**Why — Badge.** The existing Badge has 30 usages and 6 variants. The
snippet was a *demo* file with no `cva` and no implementation of the
`appearance` prop it called. Dropping it in would have broken every usage.
New variants (`primary`, `info`, `mono`) and `appearance="stroke"` were added
additively; all existing variants are untouched.

**Why — Tabs.** The snippet was plain `<div>`s with `onClick`: no
`role="tab"`, no arrow-key navigation, not keyboard-focusable. The existing
component is built on Radix, which provides all of that. Replacing it would
have been an accessibility regression on screens used all day. The *visual*
idea (sliding underline indicator) was ported onto the Radix base instead.

The snippet also had two defects worth recording: a ref callback returning a
value (rejected by React 19) and internal `activeIndex` state that ignored
the `activeTab` prop, so tab state would desync from its parent.

**Trade-off.** More work than pasting, and the result is not pixel-identical
to the source design. Accepted to preserve accessibility and avoid 30
breaking changes.

### Tab indicator measures the DOM

**Decision.** `TabsList` positions its underline from the active trigger's
`offsetLeft` / `offsetWidth`, watched by `MutationObserver` and
`ResizeObserver`.

**Why.** Tab labels are dynamic — `Activity (12)` changes width as the count
changes. Fixed widths or CSS-only approaches would misalign.

**Trade-off.** Two observers per tab list. Negligible at this scale, and
cheaper than mis-rendered UI.

### Auth pages: split-screen shell

**Decision.** `components/auth/AuthShell.tsx` wraps `/login` and `/signup`
with a form pane and an animated brand pane, reusing `HeroCanvas`.

**Why.** Requested from a 21st.dev component whose source needed an API key
we don't have. The shell was rebuilt instead. Critically, the reference was a
*create-account form*, which contradicts this product's deliberate
Google-first flow — Google sign-in proves email ownership, and the landing
page sells exactly that ("No new password"). Only presentation changed;
every server action, redirect, and the login lockout logic are untouched.

**Rejected.** `@paper-design/shaders-react`, the reference's gradient
dependency — `HeroCanvas` already does this.

---

## Infrastructure

### MCP server: hand-written protocol, no SDK

**Decision.** `app/api/agent/mcp/route.ts` exposes this CRM as an MCP server,
so Claude Desktop / Claude Code / any MCP client can operate a workspace.
Protocol in `lib/mcp/protocol.ts`, tools in `lib/mcp/tools.ts`.

**Why not `@modelcontextprotocol/sdk`.** It depends on express, hono, cors,
jose and ajv — a second HTTP framework inside a Next.js route handler. The
transport spec permits a plain `application/json` response instead of SSE,
and sessions are optional, so the subset an unattended CRM agent needs is
~150 lines with zero dependencies. (Also relevant: this repo's npm tree
currently cannot resolve new installs — see the Lenis entry.)

**Trade-off.** We own protocol compliance. Mitigated by implementing against
the published spec and verifying the real handshake end to end: `initialize`
returns a valid `InitializeResult`, `tools/list` returns all six tools, and
`tools/call` returns real CRM data. If MCP adds features we want
(resources, prompts, sampling, elicitation), reconsider the SDK rather than
growing this.

**Tools delegate, they don't reimplement.** Each tool calls the same helpers
the HTTP routes use — `validateLeadFields`, `findOrCreateCompany`,
`applyStageChange`. An agent therefore cannot create a record a human
couldn't, `move_lead_stage` still requires a `remark` and still fires the
org's workflow rules, and every write is attributed to `AI Agent` in the
timeline rather than to a person.

**Security.** Authenticated by the same per-org agent API key, so the key is
the tenant scope. `Origin` is validated per the spec's DNS-rebinding warning
(absent Origin is allowed — non-browser clients send none; a mismatched one
is rejected). Auth runs before JSON parsing so an unauthenticated flood never
reaches the parser.

**Verified:** 401 without a key, 401 with a bad key, 405 on GET, valid
handshake, pagination cursor, and tool errors returned as `isError: true`
results (which the model can see) rather than transport errors.

**NOT verified: cross-tenant isolation.** The database has only one
organization, so there was no second tenant to attempt access from.
Isolation is structural — every tool filters `orgId: ctx.orgId` — but it is
untested. This is the same gap the audit flagged as the highest-value test
investment.

### Agent API hardened before widening exposure

**Decision.** `lib/agentAuth.ts` now rate-limits, and
`GET /api/agent/v1/leads` is cursor-paginated.

**Why.** An MCP server multiplies traffic against these routes: agents poll
and retry far more aggressively than humans, and one MCP client can fan out
several calls per user turn.

Two separate limits, because they defend against different things. The
per-IP unauthenticated budget (20 / 5 min) is checked *before* the database
lookup, so an invalid-key flood can't force a query per attempt. The per-org
authenticated budget (600 / min) is deliberately generous but still bounds
what a single leaked key can do.

**On constant-time comparison.** The audit suggested `safeEqual` for the
agent key. Not applied: the key is matched by `findUnique` on a `@unique`
column, so the comparison happens inside Postgres on an index, not in JS.
There is no byte-at-a-time timing signal to walk, which is the specific
attack `safeEqual` exists to stop for keys compared in application code.

**Pagination.** Previously a hard `take: 50` with no cursor — an agent
literally could not see lead 51. Now keyset pagination (`cursor` + `skip: 1`)
ordered by `[createdAt desc, id desc]`; `createdAt` alone isn't unique, so
without the id tiebreak two leads created in the same tick could straddle a
page boundary.

**Trade-off.** The limiter is in-memory, so it resets on deploy and doesn't
coordinate across instances. Same caveat `lib/rateLimit.ts` already documents
for login. Fine on single-instance Render; revisit if this scales out.

### Health endpoint queries the database

**Decision.** `app/api/health/route.ts` runs `SELECT 1` and returns 503 if it
fails. Added to the middleware's public-path exclusion list in `proxy.ts`.

**Why.** The common production failure is the Node process being up while
Neon is unreachable. A process-only check reports healthy straight through
that outage.

**Trade-off.** One trivial query per probe. The response deliberately omits
version, migration state, and error detail — it is unauthenticated, so it
must not help anyone fingerprint the deployment.

### CI runs types and tests, lint is non-blocking

**Decision.** `.github/workflows/ci.yml` runs `tsc --noEmit`, `eslint`, and
`vitest run` on PRs. ESLint carries `continue-on-error: true`.

**Why.** 9 test files and 73 tests existed with nothing running them. Lint
currently reports 13 pre-existing errors unrelated to current work — gating
merges on those would make CI fail on arrival and train everyone to ignore
it.

**Deliberately excluded.** `npm run build` is NOT run in CI, because that
script executes `prisma db push` against a real database.

**Trade-off.** Lint can regress until the existing errors are cleared and
`continue-on-error` is removed. Tracked as the next step.

### `scratchpad/` and `.mcp.json` gitignored

**Decision.** Both added to `.gitignore`.

**Why.** Both were untracked but unignored — one `git add -A` away from being
committed. `scratchpad/` holds debug dumps and verification scripts;
`.mcp.json` is per-machine config that can reference local endpoints.

---

## Known gaps — NOT fixed here

These came out of a full audit and are recorded so they are not lost. They
are listed in rough priority order.

1. **Rep PIN login searches users across all orgs.** `lib/repAuth.ts:21`
   does `findMany({ where: { name } })` with no `orgId` filter. Org B adding
   a "John Smith" breaks org A's rep login (`ambiguous_name`), and the
   endpoint is a cross-org user-existence oracle. **Not fixed because it
   needs a design decision, not a one-line patch**: the rep login form
   submits only name + PIN, so there is no org context to filter by. Options:
   a per-org rep login URL, an org code field, or making PIN lookup global
   but keyed on a unique per-rep identifier. Needs an owner decision.
2. **Agent API has no rate limiting.** No `checkRateLimit` in
   `app/api/agent/**`; `lib/agentAuth.ts` does a plain DB lookup per request.
   Brute-forceable, and a valid key can flood writes.
3. **`prisma db push` runs on every production build** (`package.json`),
   against a Neon database that dev and prod currently share. A local schema
   edit can alter production columns on deploy. Should be `prisma migrate
   deploy`, and the environments should be split.
4. **No error tracking.** No Sentry or equivalent; failures surface only as
   `console.error` into an ephemeral log stream.
5. **No cross-tenant authorization tests.** `lib/session.test.ts` unit-tests
   `leadScope` well, but nothing asserts at the route level that org A cannot
   read org B. Highest-value test investment before resale.
6. **`xlsx` carries unfixable high-severity CVEs** and is imported into the
   client bundle by `components/leads/ImportLeadsDialog.tsx`.
7. **`GET /api/leads` is unpaginated** — fetches every lead with every
   activity.
8. **`.env.example` is stale** — documents retired variables and omits
   several required ones, so a buyer following it cannot boot the app.

The audit's positive finding is worth recording too: **every `[id]` API route
was checked and none leaks data across orgs.** `leadScope()` is applied
consistently, API keys are per-org and unique, and Liveblocks rooms are
namespaced by `orgId`.

---

## Onboarding documents stay in the browser (2026-10-16)

**Decision.** Onboarding documents — PAN, GST, incorporation certificates,
bank proofs — are stored in the uploader's browser (IndexedDB, `lib/docVault.ts`).
The server stores metadata only: filename, MIME type, byte size, SHA-256,
review status (`OnboardingDocument`).

**Why.** These are government identity documents. At scale that is thousands
of them belonging to other companies' customers. Holding them creates
liability out of proportion to any product value:

- A breach exposes identity documents, not CRM rows.
- The vendor becomes a data processor under DPDP/GDPR for the most sensitive
  category it touches.
- The vendor can be compelled to produce documents it holds.

Not holding the bytes removes all three. It is not a mitigation — the risk
does not exist, because the data is never received.

**How it is enforced.** `POST /api/leads/[id]/documents` rejects any payload
containing `content`, `data`, `base64`, `blob`, `file`, `bytes` or `dataUrl`.
The guard exists so a later careless client cannot quietly reintroduce
server-side storage and silently void the guarantee.

**What this costs — state it plainly, do not bury it.**

1. Documents are visible on the uploading browser only. Another device sees
   metadata and must re-collect to view.
2. Clearing site data destroys them irrecoverably.
3. No server-side virus scanning, OCR, or automated verification of content.

(1) and (2) are real product limitations, not edge cases. The UI must say so
at the point of upload.

**Rejected alternatives.**

- *Encrypted blobs in S3/R2.* Survives device loss, but the vendor holds
  ciphertext and therefore holds the documents; key-management becomes the
  whole problem, and a key-escrow request re-creates the compellability risk.
- *Ephemeral verify-then-discard.* There is still a window where the vendor
  holds the file, which is exactly the window a subpoena or breach targets.
- *BYO bucket (Drive/SharePoint).* Strongest isolation and the natural
  upgrade path for orgs that need multi-device access. Deferred, not
  rejected — it needs per-tenant OAuth that does not exist yet.

**Upgrade path.** If multi-device access becomes a blocker, add BYO bucket as
an opt-in per org. Keep browser-local as the default, because the default is
the promise.

---

## Per-org logo and vendor-neutral branding (2026-10-16)

**Decision.** `Organization` gains `logoUrl`, `logoDataUrl` and `brandColor`.
All app chrome renders `components/branding/OrgLogo.tsx`, which falls back to
a generated monogram. The product name comes from `BRAND_NAME`
(`lib/branding.ts`), set per deployment via `NEXT_PUBLIC_BRAND_NAME`.

**Why.** The product is sold white-label. A hardcoded vendor mark in the app
chrome is a defect for every tenant that is not the vendor. The fallback is a
neutral monogram rather than a vendor logo, so an org that has not uploaded a
mark still never displays someone else's brand.

`logoDataUrl` lets a small logo work with no object store at all, which keeps
onboarding a new tenant to one form field.

---

## Testing the tenant boundary, not just the helpers (2026-10-16)

**Decision.** Route handlers are tested directly against a mocked Prisma,
asserting the `where` clause of every query. Added
`app/api/leads/[id]/documents/route.test.ts` (18 tests) and
`lib/mcp/tools.test.ts` (9 tests). Suite went from 73 to 118.

**Why.** The existing 73 tests covered pure helpers in `lib/` only. `leadScope()`
had tests; nothing proved a route actually *called* it. For a product sold
white-label to multiple parties, an untested tenant boundary is the one
defect that cannot be recovered from reputationally.

The MCP tools are the sharpest case: an API-key holder reaches them with no
browser session and no middleware in front, so `ctx.orgId` is the entire
boundary.

**What the tests assert.**

- 401 before any database call when there is no session.
- 404, not 403, for another org's lead, so existence is not leaked.
- `orgId` is taken from the session and never from the request body. Both
  suites include a hostile payload supplying `orgId: 'org-b'`.
- No MCP tool issues a query carrying an org id other than the caller's.
- Every banned content field is rejected and writes nothing.

**Verified by mutation, not by reading.** Removing `orgId` from `get_lead`'s
where clause makes the suite fail; restoring it makes it pass. A test that
cannot fail proves nothing, so this was checked explicitly rather than
assumed.

**Known gaps, stated plainly.**

- Only the documents route and the MCP tools are covered this way. The other
  ~30 API routes still have no route-level tests.
- No test runs against a real database, so a Prisma-level mistake (a wrong
  relation, a missing index) would not be caught.
- `lib/repAuth.ts:21` cross-org bug remains open and is NOT covered.

---

## Documents surfaced on the onboarding page (2026-10-16)

**Decision.** `DocumentVaultPanel` renders on `/leads/[id]/onboarding`, below
the onboarding checklist, rather than as a tab inside `LeadRecordView`.

**Why.** `LeadRecordView` is shared by three entry points: the full page
(`/leads/[id]` via `LeadPageView`) and the Kanban modal (`LeadDetailDialog`).
Putting a browser-storage panel inside it would mount IndexedDB work inside a
dialog on the pipeline board, where it is neither expected nor useful. The
onboarding page is already the operations surface, already guarded for
admin/operations, and the documents are onboarding documents.

**The UI states both costs at the point of upload**, not in a help doc:
documents are visible on this device only, and clearing browser data destroys
them. A row whose bytes are not in the current browser shows "held elsewhere"
and offers no download, because offering one would be a lie.

---

## Graphify knowledge graph: configured but not built (2026-10-16)

**State.** `CLAUDE.md` instructs running `graphify query "<question>"` before
any grep or source read, and `graphify update .` after modifying code. The
CLI is installed at `~/.local/bin/graphify` and the skill is present at
`.claude/skills/graphify/`. **`graphify-out/` does not exist**, so none of
those instructions currently work: there is no `graph.json` to query.

**Why this is being written down rather than fixed silently.** The installed
CLI exposes `install`, `uninstall`, `path`, `explain`, `diagnose` and `clone`.
It has no `build`, `update` or `query` subcommand. Graph generation runs
through the `/graphify` skill, which is an interactive invocation, not
something to fabricate from a shell.

**Consequence for anyone (human or agent) reading CLAUDE.md.** The three
graph rules are currently dead letters. Follow the fallbacks instead: read
source directly, and ignore the "run graphify first" instruction until a
graph exists.

**To fix:** invoke `/graphify` in an interactive session to generate
`graphify-out/`. Once it exists, the CLAUDE.md rules become live and
`graphify update .` should follow code changes. Until then the instruction
block in CLAUDE.md is aspirational.

---

## The three "unverified" library files, now read (2026-10-16)

An authorization audit flagged three files it had not read. All three were
subsequently read in full. **None contains a tenant or traversal defect.**

**`lib/workflow.ts`** — runs org-configured automation when a stage changes.
Rules are fetched at line 57 with `where: { orgId: lead.orgId, ownerId:
lead.ownerId }`, so every rule that executes already belongs to the lead's
org. The `prisma.user.findUnique({ where: { id: rule.ownerId } })` at line 92
looks unscoped in isolation but reads an id that came from an org-scoped row.
The `call_webhook` payload (line 114) carries only the triggering lead's own
fields. Activities it writes carry `orgId: lead.orgId` (line 46).

**`lib/skills/runner.ts`** — `loadSkillText` joins `skillId` into a filesystem
path at line 71, which is the shape of a path-traversal bug. It is not one:
`runSkill` calls `getSkill(input.skillId)` first (line 39) and returns early
when it is unknown, and `getSkill` is an exact match against the hardcoded
`SKILLS` array (`lib/skills/catalog.ts:376`). A traversal string never reaches
`path.join`. The validation is indirect, so it is worth a comment at the call
site if that code is ever refactored.

**`lib/googleSheets.ts`** — reached only from the cron route, which fans out
per `OrgSheetConnector` row with its own `orgId` and a per-org cursor.

---

## Route-level tenant tests, verified by mutation (2026-10-16)

Added `test/routeHarness.ts` and `test/tenantIsolation.test.ts`: 17 tests
exercising real handlers from `/api/leads/[id]`, `/api/activities`,
`/api/views/[id]` and `/api/tasks/[id]` against a recording Prisma stub.
Assertions are on the WHERE clause the handler actually sent. Suite total is
now 135.

**Each test was proven to fail against a real injected vulnerability.** A
test that cannot fail proves nothing, so four mutations were applied to the
source, the suite was run, and the source restored and diffed byte-for-byte:

| Mutation | Caught by |
|---|---|
| `leadScope` removed from the activities GET filter | 2 tests |
| lead GET scoped by `id` alone | 2 tests |
| the `findFirst` guard before `lead.delete` removed | 2 tests |
| org + owner terms removed from the tasks guard | 1 test |

A fifth attempt failed to apply at all (it targeted `...leadScope(user),`
with a trailing comma; the source has none). The suite passed, which would
have read as "mutation not caught" if the applied-ness had not been asserted.
Mutation scripts now assert that the file actually changed before drawing any
conclusion from a green run.

**Note on `vi.mock` hoisting:** the mocks cannot live in the shared harness,
because Vitest hoists `vi.mock` to the top of the importing module and
refuses calls made inside a function. `test/routeHarness.ts` therefore holds
only the stub objects and mutable session state; each test file declares its
own `vi.mock` block at top level.

**Still untested:** 54 of 58 routes. The highest-value remaining targets are
`/api/leads/bulk` (writes many rows, and its second query has no org term of
its own), `/api/companies/[id]` DELETE (cascades a `person.deleteMany`), and
`/api/external/reports` (aggregates a whole org behind one static key).

---

## Integration tests against a real database (2026-10-16)

**Decision.** A local Postgres in Docker, loaded with the pre-wipe production
backup plus a synthetic second org, backs 12 integration tests in
`test/integration.test.ts`. One command sets it up: `scripts/test-db.sh`.

**Why this was possible at all.** The 2026-10-16 wipe was taken with a full
JSON backup. That backup turned out to be more valuable as a test fixture
than as a restore artifact: it is 64 real leads, 64 companies, 8 users and
161 audit rows with genuine shape, which no hand-written seed would match.

**What these tests prove that the mocked route tests cannot.** The mocked
tests assert the WHERE clause a handler *sends*. They cannot prove Prisma
interprets it correctly, or that a schema `@relation` is right. These run the
real `leadScope()` filter against real rows in two orgs:

- An admin in org B, querying with their scope, receives none of org A's 64
  leads.
- Fetching org A's lead **by its real primary key** under org B's scope
  returns null.
- The same id queried *without* scope DOES return the row. This is the
  control: without it, the previous test could pass because the fixture was
  empty or the id was wrong.
- `lead.company.orgId` always equals `lead.orgId` across the restored data,
  which is the only check here that would catch a wrong relation.

**Opt-in by design.** The suite is `describe.skip` unless
`TEST_DATABASE_URL` is set, so `npx vitest run` and CI are unaffected
(135 pass, 12 skip). With the variable set: 147 pass.

**Neon is never touched.** `scripts/test-db.sh` writes only to
`localhost:5433`. Verified after the run: Neon still reports 0 orgs, 0 leads,
0 users.

**`scripts/restore-backup.mjs` can repopulate ANY database it is pointed at.**
It takes its URL from `DATABASE_URL`. Pointed at Neon it would restore
production. That is useful and deliberate, but it means the script is a
loaded gun and the URL must be passed consciously.

**Still not covered.** These tests exercise the scope filters, not the route
handlers, against the real DB. A route that forgets to call `leadScope()`
entirely is caught by the mocked suite, not this one. The two layers are
complementary and neither is sufficient alone.

---

## Rep login scoped by organisation (2026-10-16)

**The bug.** `lib/repAuth.ts` searched `User.name` across every tenant and
accepted a login only when exactly one match existed *in the entire
database*. Two customers each employing a "Priya" therefore locked **both**
out, with a generic "Invalid name or PIN" neither admin could diagnose,
because the collision lived in a tenant they could not see. One customer
could inflict this on another simply by hiring.

Not a data leak: `lib/repSession.ts` re-reads the user row and derives
`orgId` from the database, never the cookie, and all four rep routes filter
by it. The failure was availability, not confidentiality.

**Why it was written that way.** Field reps authenticate with name + PIN and
have no email, so nothing in the request said which tenant they belonged to.
With nothing to narrow by, a global search was the only option, and
rejecting an ambiguous match was the safe branch — picking the first would
have logged a rep into the wrong org.

**The fix.** Organisation now comes from the URL. `Organization.slug` is a
unique, URL-safe identifier; `/rep/<slug>` resolves it server-side and passes
`orgId` to `verifyRepLogin(orgId, name, pin)`, which uses `findFirst` scoped
to that org. `@@unique([orgId, name])` makes a duplicate within one org
impossible, which the settings UI had always claimed but never enforced.

**Email is now the primary path.** Staff with a work email sign in at
`/login`; the existing domain-match flow offers "join <org>" or "create a new
organisation", and they land in the full app as a sales user with no new
code. The PIN form remains only for field staff who genuinely have no email.
Bare `/rep` no longer renders a login form — it would always fail without an
org — and instead points at the admin-shared link. It deliberately does not
list organisations or accept a typed slug, which would make it a
tenant-enumeration oracle. An unresolvable slug returns the same generic
401 as a bad PIN, for the same reason.

**Proven against real data, not just reasoned about.** With a "Priya" seeded
in two orgs of the local test database: the old global lookup returned 2
matches (both locked out); the new scoped lookup logged each into the correct
org. `test/integration.test.ts` now carries that as a regression test, plus
checks that every org has a slug and that slugs are unique.

**Operational notes.**

- `proxy.ts` matched `pathname === '/rep'` exactly. Left alone, `/rep/acme`
  would have been redirected to `/login` and field sign-in broken outright.
  Widened to `startsWith('/rep/')`.
- `scripts/backfill-org-slugs.mjs` is idempotent and de-duplicates by
  appending `-2`, `-3`. **It must run on any database with existing orgs**,
  or their reps cannot sign in at all. Neon currently has no orgs, so there
  is nothing to backfill there yet; new orgs need a slug assigned at
  creation (not yet wired — see below).
- The slug column is nullable so existing rows survive the migration. The
  login route 404s an unresolvable slug rather than falling back to the old
  global search.

**Gap now closed (same day).** `createOrganization()` in `lib/org.ts` assigns
a slug at creation, so every org has a working `/rep/<slug>` from its first
moment. All three creation paths (Google sign-in, email signup, the
create-admin script) route through that one function, so fixing it there
covered all of them.

Slug generation lives in `lib/orgSlug.ts`:

- Reserved words (`api`, `login`, `admin`, `rep`, …) are suffixed `-org` so a
  slug can never shadow a real route.
- Unusable names (empty, punctuation-only, non-Latin) fall back to `org`
  rather than producing an empty slug and an unreachable page.
- Collisions append `-2`, `-3`. Two customers both called "Acme Industries"
  get `acme-industries` and `acme-industries-2`.
- `uniqueOrgSlug` checks then inserts, which is racy. The unique index is the
  real guard: `createOrganization` catches P2002 on `slug` and retries with a
  fresh candidate, up to five times, then falls back to creating the org
  without a slug rather than failing signup outright.

Verified end-to-end against the local database, not only by unit test: three
orgs created (including a deliberate name collision and a reserved word) all
received distinct slugs, and each slug resolved back to its own org the way
the login route resolves it. The guard was then mutation-tested — removing
`slug` from the create call fails three tests.

---

## Open issues cleared (2026-10-16, later)

**`views/[id]` guard now includes orgId.** It filtered by `userId` alone,
which pinned the tenant only transitively (a User belongs to one org today).
Now `{ id, userId, orgId }`.

**Local dev no longer points at production.** `.env.local` (gitignored, and
loaded in preference to `.env` by Next.js) sets `DATABASE_URL` to the Docker
Postgres. `scripts/use-local-db.sh` writes it; `rm .env.local` reverts.

`prisma.config.ts` had to change too: it used `import 'dotenv/config'`, which
reads only `.env`, so the Prisma CLI and any `node script.mjs` would have
kept talking to Neon while Next.js talked to Docker — the worst possible
split. It now loads `.env.local` first (dotenv does not overwrite already-set
vars, so order matters).

**Ops queue is now the assignee's own queue.** `/onboarding` filtered only on
`stage: 'onboarding'`, so every operations user saw the whole org's backlog.
It now defaults to `assignedOpsId: user.id`, with a "Show all" toggle;
admins still see everything. Cards carry email, phone and website inline,
because the ops member's next action is almost always to call, and ageing is
flagged at 7 days (the main pipeline's 21-day staleness rule is far too slow
for onboarding).

**CLAUDE.md corrected.** It claimed SQLite and Next.js 15; the stack is
Postgres/Neon and Next.js 16, and the layout section still described a
single-tenant schema with "no User for v1". Added a multi-tenancy section
stating the `leadScope` / `findFirst` / 404-not-403 rules up front, since
that is the single thing a new contributor most needs before writing a query.

### A correction

I previously recorded that onboarding sub-stage changes write no Activity.
**That was wrong.** `app/api/leads/[id]/route.ts` has always created an
`onboarding_step` Activity with `authorName: user.name`. The claim came from
reading a comment in `lib/leadStage.ts` describing the sub-pipeline as
"separate" and not checking the PATCH route that actually handles it.

The behaviour is now pinned by two tests in `test/tenantIsolation.test.ts`
(an Activity naming the actor on a real move; none when the value is
unchanged), and mutation-verified: replacing `user.name` with a constant
fails the suite.

### First-signup smoke test

Run against a scratch org on the local database, since Neon is empty and
nobody had verified bootstrap on an empty DB. Ten checks pass: slug assigned,
founding admin created, stages self-seed to five in order, first lead
created and org-scoped, other orgs invisible, and `/rep/<slug>` resolves.
The probe cleans up after itself.
