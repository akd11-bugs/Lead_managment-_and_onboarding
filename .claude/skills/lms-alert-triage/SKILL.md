---
name: lms-alert-triage
description: Reads the LRM_blu dashboard's suggested-skill alerts and prioritises which ones to run now, which to defer, and which to ignore. Use when the user asks "which skills should I run today?" or "triage the alerts".
---

# LRM_blu Alert Triage

Prioritises the alerts that LRM_blu's dashboard surfaces from `lib/alerts.ts`.

## Use this skill when

- The user opens the dashboard and sees 5+ alerts.
- The user asks "what should I do first today?"
- A weekly or daily planning session is starting.

## Required input

- The current `alerts` array from the dashboard (or its JSON representation).
- Optionally: the user's stated goal for the day / week (e.g. "trying to recover ghosted deals", "preparing forecast").
- Optionally: whether the user has an `ANTHROPIC_API_KEY` set (changes which skills are runnable).

## Analysis workflow

1. Read the alerts JSON. Each alert has: `skillId`, `skillName`, `reason`, `metric`, `severity` (low/medium/high).
2. Group alerts by `metric` (e.g. multiple "staleLeadsCount" alerts collapse to one triage decision).
3. For each group, classify:
   - **Run now** if the underlying metric is degrading and reversible.
   - **Schedule** if the metric is high-value but not time-critical this hour.
   - **Ignore** if the alert fires by default but the data is small or the threshold is wrong.
4. Use the catalog's `runnerType` to bias cost vs speed:
   - `script` → prefer running immediately (no API cost, instant).
   - `llm` → batch into one session to amortise the prompt setup.
5. Suggest a single best order: high-severity script skills first, then high-severity LLM skills, then medium, then low.

## Decision rules

- **Pipeline Hygiene Audit is almost always run now.** It is script-backed, instant, and surfaces the largest defensible-vs-reported gap. Run it first unless the user has run it in the last 24h.
- **Ghosted-after-the-demo** is the highest-value LLM skill for any team in active sales motion. If the count is ≥1, batch all affected leads into a single run (per-lead mode is cheaper than portfolio; per-lead output stays specific).
- **Weekly B2B Lead Gen Readout** fires on Mondays by default. If today is not Monday and the dashboard suggests it, treat as low priority unless the user asks.
- **Disqualification Reason Miner** only earns its keep if there are ≥10 lost deals. Below that, the patterns are not statistically meaningful — skip.
- **CRM Lead Source Quality Audit** is portfolio-wide; do not run it after every new lead. Weekly or whenever the lead-source mix changes noticeably.

## Output format

```markdown
## Run now (3)

1. **Pipeline Hygiene Audit** (script, instant)
   - Reason: 8 leads with no activity past 45 days.
   - Command: open `/skills/pipeline-hygiene-audit` in LRM_blu.
2. **Ghosted After the Demo** (LLM)
   - Reason: 4 qualified/proposal leads silent for 21+ days.
   - Action: run per-lead from each lead's detail page, batch 4 calls.

## Schedule (1)

3. **Sales Follow-up Speed Audit** (LLM)
   - Reason: 5 leads overdue. Wait until you have 30 min free — it benefits from cross-checking with the engagement log.

## Ignore (1)

4. **Disqualification Reason Miner** — only 6 lost deals. Wait for ≥10.

## Total cost estimate

~$0.05 (no LLM calls if you only run the script skill first).
```

## Practical example

User: "/dashboard shows 6 alerts."

The skill produces the format above. The user spends the next 10 minutes running the top-3 in order.

## Guardrails

- Do not run any skill from this triage — produce the recommendation, let the user click.
- Do not invent alerts. If the input list is empty, say "no current alerts; rerun the dashboard".
- If `ANTHROPIC_API_KEY` is unset, all `llm`-runner skills are blocked — say so explicitly in the cost estimate.