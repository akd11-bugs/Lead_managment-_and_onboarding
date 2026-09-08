---
name: lms-error-handling-review
description: Audits or writes error handling in LRM_blu's API routes and lib functions against this codebase's established conventions (status code meaning, auth/validation helpers, timeouts on external calls, no leaking internals to clients). Use when adding a new API route, wrapping an external call (SMTP, Google Sheets, Anthropic), or reviewing existing error handling for gaps.
---

# LRM_blu Error Handling Review

Encodes the error-handling conventions already established across `app/api/**/route.ts` and `lib/*.ts`, so new code matches instead of drifting.

## Use this skill when

- Writing a new API route.
- Wrapping a call to an external service (SMTP/nodemailer, Google Sheets API, Anthropic SDK, any `fetch`).
- Reviewing a route or lib function for missing error handling.
- Something failed with an unhelpful bare `500` and the fix is to make the failure mode legible, not just to patch the one instance.

## Status code conventions already in use here

- **400** — client sent something invalid (bad JSON via `readJsonBody`, failed a format check like `EMAIL_PATTERN`, missing a required field). Body: `{ error: "<specific, user-actionable message>" }`.
- **401** — `requireApiUser()` found no valid session, or a static Bearer key (`safeEqual` against `CRON_SYNC_API_KEY` / `REPORTS_API_KEY` / `DAILY_REPORT_API_KEY`) didn't match.
- **404** — a scoped lookup (`prisma.lead.findFirst({ where: { id, ...leadScope(user) } })`) found nothing — either it doesn't exist or the caller isn't scoped to see it. Don't distinguish the two in the response (avoids leaking existence of other users' data).
- **429** — `checkRateLimit` tripped. Include `Retry-After`.
- **502** — a downstream call this route depends on (email send, external API) threw. `console.error` the real error server-side, return a generic client-facing message.
- **503** — the route is intentionally disabled because required env config is absent (`CRON_SYNC_API_KEY`, `LEADS_SHEET_ID`, etc.). This is a *configuration* state, not a bug — distinguish it from 502 in review.

## Analysis workflow

1. Identify which category above the failure belongs to before choosing a status code — don't default to 500 for anything you didn't explicitly plan for; an *unplanned* exception becoming a framework-level 500 is the acceptable fallback, not the goal.
2. For any new external call (network, SMTP, third-party API): does it have an explicit timeout? `lib/email.ts`'s `sendEmailAs` and `app/api/settings/email/route.ts`'s verify call both set `connectionTimeout`/`greetingTimeout`/`socketTimeout` at 10s — nodemailer's own defaults allow a multi-minute hang, which reads as "the feature is broken" when it's actually just slow, and outlives most serverless function timeouts.
3. For any `catch` block: does the message returned to the client leak internals (stack trace, DB error text, third-party error body)? It shouldn't. Does the real error get logged server-side (`console.error`) before being swallowed? It should — a caught-and-silenced error with no log line is undebuggable later ([[lms-debug-investigate]]).
4. For any secret/key comparison: is it using `safeEqual` (constant-time), not `===`? A plain `!==` on a static API key is a timing side-channel.
5. For any decrypt of stored credentials (`lib/crypto.ts`'s `decrypt`): is a `DecryptionError` (e.g. from a rotated `CREDENTIAL_ENCRYPTION_KEY`) handled with a fallback path rather than a hard failure? See `sendEmailAs`'s fallback to the shared mailbox.
6. Does a partial-batch operation (bulk import, bulk sync) report *which* rows failed and why, rather than failing the whole batch on one bad row? See `importLeadRows`'s per-row `skipped` list as the pattern to match.

## Decision rules

- Never return a caught error's `.message` directly to the client for anything touching a DB, SMTP credential, or third-party API key — always a hand-written, generic message.
- Always `console.error` before returning a generic error — the log line is often the only way anyone (including a future debugging session) sees what actually happened.
- A route disabled by missing env config returns 503 with a message naming which env var is missing — that's a deliberate design choice here (self-documenting ops), keep it.
- Prefer widening a single row's `skipped` reason over failing an entire import/sync batch, unless the failure is systemic (auth, connection) rather than row-specific.

## Guardrails

- Don't add retry logic or fallbacks for failure modes that can't actually happen here — that's scope creep, not error handling.
- Don't swallow an exception without at least a `console.error` — silent catches are worse than no catch.
- Don't change an existing route's status code semantics without checking every caller (client-side fetch handling, GitHub Actions `exit 1` threshold, etc.) that depends on it.
