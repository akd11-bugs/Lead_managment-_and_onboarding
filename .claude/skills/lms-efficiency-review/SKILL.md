---
name: lms-efficiency-review
description: Reviews LRM_blu code for real inefficiencies that matter at this scale — N+1 Prisma queries, unnecessary sequential awaits, repeated construction of expensive objects (SMTP transporters, JWT clients), and unbounded/unpaginated queries. Use before merging a new API route or lib function that touches the database or an external service, or when something feels slow.
---

# LRM_blu Efficiency Review

Targets the specific inefficiency patterns that actually show up in this codebase — a Next.js API layer over Prisma/Postgres with a few external services (Google Sheets, SMTP, Anthropic) — rather than generic micro-optimization.

## Use this skill when

- Adding a route or lib function that loops over leads/activities and queries per-item.
- Adding a new external-service client (SMTP transporter, JWT/OAuth client, HTTP client).
- Something is reported as slow, or a serverless function is timing out.
- Reviewing a batch operation (import, sync, bulk report) before merge.

## Analysis workflow

1. **N+1 queries.** Grep for a `.map`/`.forEach`/`for` loop containing an `await prisma.*` call. `importLeadRows` and `sync-leads-sheet/route.ts` already show the right shape: fetch existing rows once with a single `findMany({ where: { OR: [...] } })`, dedupe in memory, then a single `createMany`. Any new bulk path should match this — one query in, one write out, not N of either.
2. **Sequential awaits that don't depend on each other.** If two `await` calls don't use each other's result, they belong in `Promise.all([...])`. Check this especially in report-generation code that queries multiple unrelated tables (leads, activities, users) before composing an email.
3. **Expensive object construction inside a hot path.** `lib/googleSheets.ts` caches its `JWT` client at module scope (`let client: JWT | null = null`) precisely so the OAuth handshake isn't repeated per-request — that's the right pattern for reusable, credential-scoped clients. `lib/email.ts`'s `sendEmailAs`, by contrast, constructs a fresh personal `nodemailer` transporter on every call because the credentials are per-user and decrypted fresh each time; that's a deliberate tradeoff (can't safely cache a decrypted secret at module scope keyed only by process lifetime) — don't "fix" it by caching decrypted app passwords in memory.
4. **Unbounded queries.** Any `prisma.*.findMany` with no `take`/pagination on a table that can grow without bound (leads, activities) is a scale risk even if it works fine on today's seed data. Flag it; don't silently add pagination unless asked, since it can change API response shape for existing callers.
5. **Repeated recomputation of the same value in a loop.** E.g. re-normalizing the same header string per row instead of once per column; re-fetching the same user record per row instead of caching by id within the request (`sync-leads-sheet/route.ts`'s `ownerCache` `Map` is the existing pattern for this — reuse it, don't reinvent per new route).

## Decision rules

- A single extra query per *request* is fine. A query per *row/item* inside a loop over request data is not — that's the line to flag.
- Caching across requests (module-scope `let`/`Map`) is only safe for data that's either immutable for the process lifetime (a JWT client keyed by fixed service-account credentials) or explicitly invalidated (the Prisma client singleton pattern in `lib/db.ts`). Never cache per-user secrets or request-scoped data at module scope.
- Prefer `createMany`/batched writes over a loop of single `create` calls whenever the rows don't need individual generated IDs back.
- Don't chase efficiency on a code path that never sees more than a handful of rows (e.g. per-lead skill runs) — the loop-vs-batch distinction matters for portfolio-wide and import/sync paths, not single-record actions.

## Guardrails

- Don't introduce caching that could serve stale or cross-user data (e.g. never cache a decrypted credential, never cache a Prisma read across requests without an explicit invalidation story).
- Don't add pagination, batching, or `Promise.all` refactors to code that isn't actually a bottleneck — this is a review for real N+1s and re-fetches, not a mandate to rewrite every loop.
- Don't change a batch operation's atomicity (e.g. splitting one `createMany` into per-row `create` calls) in the name of "better error messages" — `importLeadRows` gets per-row error detail *and* single-query efficiency by validating and deduping in memory before one bulk write; match that shape rather than trading one for the other.
