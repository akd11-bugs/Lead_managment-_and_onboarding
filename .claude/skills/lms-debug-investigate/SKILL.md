---
name: lms-debug-investigate
description: Root-causes a reported bug in LRM_blu (a route, cron job, email send, or sync failing) by separating "is it triggering" from "is it succeeding" and tracing through the actual code path instead of guessing. Use when the user reports something "isn't working," "is failing," or "is erroring."
---

# LRM_blu Debug Investigate

A structured way to go from "X isn't working" to a verified root cause in this codebase, without fabricating a diagnosis from pattern-matching alone.

## Use this skill when

- The user reports a feature, route, or cron job as broken, erroring, or silent.
- An error surfaces with no visible stack trace (a bare 500, a hung request, a job marked green that produced no effect).
- You're tempted to propose a fix before you've actually seen the failure.

## Analysis workflow

1. **Split "not triggering" from "triggering but failing."** These have disjoint causes and disjoint fixes:
   - Not triggering: cron schedule misconfigured, GitHub Actions paused (60-day inactivity default), webhook not registered, feature flag off.
   - Triggering but failing: the handler runs and throws, times out, or silently no-ops.
   Check the outer layer first (did it fire at all?) before reading the inner handler.
2. **Follow the actual call chain**, not the file that seems related. For an API route: entry (`app/api/**/route.ts`) → auth/validation (`requireApiUser`, `readJsonBody`, `safeEqual`) → business logic (`lib/*.ts`) → external I/O (`prisma`, `nodemailer`, `googleSheets.ts`, Anthropic SDK). A bare `500` almost always means an *unhandled* exception below the route's own `try/catch` — find where the exception boundary actually is before guessing what threw.
3. **Distinguish log sources and be explicit about which one you're missing:**
   - GitHub Actions run logs (trigger + shell-level HTTP status) — readable via the GitHub API without auth for a public repo, or `gh run view --log` if the CLI is authenticated.
   - Vercel/host function logs (the actual stack trace) — usually need dashboard access or `vercel logs`; say so plainly if you don't have it rather than inferring the cause.
   - Application-level `console.error` calls already in the route (grep for them near the failing path first — most routes here log before returning a generic client-facing error).
4. **Correlate timestamps.** A cron job that failed for a 15-minute window and then recovered on its own points at something transient (a deploy in progress, a DB connection blip, an upstream API hiccup) rather than a code bug — say so instead of proposing a code fix for a window that already closed.
5. **Reproduce locally when you can't read remote logs.** If you have the relevant env var values (check `.env`, never fabricate a value), call the route directly with `curl`/a script to get the real error instead of speculating.

## Decision rules

- Never state a root cause you haven't confirmed against an actual log line, response body, or local repro. If you only have a status code and no body, say exactly that ("this narrows it to X vs Y, but I can't confirm without the response body / stack trace") and ask for the missing piece — don't fill the gap with a plausible-sounding guess.
- A `401`/`503` from a route in this codebase means an intentional check failed (bad key, missing config) — those return a JSON error body and are cheap to diagnose from the body alone. A bare `500` means something below the route's own guardrails threw — that needs the real stack trace, not the shell-level HTTP status.
- If the same failure recurs on a fixed cadence (every run, every Nth run), suspect code. If it clusters in a time window and then stops, suspect infra/environment and ask if anything was redeployed/restarted around then.
- Prefer adding a `console.error(err)` at the point of failure over adding retries or fallbacks — you cannot fix what you can't see, and swallowing the error further makes the next investigation harder.

## Output format

```
## What's confirmed
- <fact, with its source: log line / status code / repro output>

## What's still unknown
- <the missing piece, and where it would come from>

## Most likely cause
<one sentence, only if evidence supports it — otherwise say "insufficient evidence yet">

## Next step to confirm
<the single most informative thing to check next>
```

## Guardrails

- Don't propose a code change until the failure is confirmed, not just plausible.
- Don't treat "the trigger succeeded" (e.g. a green GitHub Actions run) as "the feature worked" — check the actual response body/effect.
- Don't ask the user to paste logs you could fetch yourself (GitHub API, local repro) — only ask when you've verified you actually lack access.
