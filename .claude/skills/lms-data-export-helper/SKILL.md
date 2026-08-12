---
name: lms-data-export-helper
description: Produces a clean CRM export from LRM_blu for any other skill to consume. Use when a skill needs data in a specific format (CSV, JSON, transcript text) and the user wants the right slice — portfolio, by stage, by source, or by lead.
---

# LRM_blu Data Export Helper

A skill that lives in LRM_blu itself. It turns the LMS's lead/activity data into the input format another skill expects.

## Use this skill when

- The user wants to run a portfolio-level analysis and needs a clean CSV.
- A skill requires a specific slice (by stage, by source, by date window) and the user has not told it which.
- The user wants to share data with a colleague or paste into a tool that lives outside LRM_blu.
- Another skill's required input mentions "deal export", "CRM export", or "activity log".

## Required input

- Scope: `portfolio` | `stage:<name>` | `source:<name>` | `lead:<id>` | `stale:<days>`
- Optional: `format: csv | json | markdown`
- Optional: `include_activities: boolean` (default true)
- Optional: `window_days: number` (only include leads updated in the last N days)

## Analysis workflow

1. Connect to LRM_blu's database (SQLite at `prisma/dev.db`) via Prisma.
2. Resolve the scope into a Prisma `where` clause.
3. Fetch the matching leads with their activities.
4. Serialize to the requested format using the column conventions established by `pipeline_hygiene.py`:
   - `deal` (lead name + company)
   - `stage`, `value`, `created_date`, `last_activity_date`, `close_date`, `owner`, `source`
5. Print the result. If `format=csv`, save to `/tmp/lrm_export_<timestamp>.csv` and tell the user the path.
6. Also print a small summary: how many leads, total value, defensible vs decoration.

## Decision rules

- Never include leads in `won` or `lost` stage unless the user asks for closed deals.
- `last_activity_date` is `null` becomes an empty string in CSV — Python `pipeline_hygiene.py` flags these as a missing signal.
- The current `close_date` is not in the data model; leave it blank.
- If the scope produces 0 leads, say so. Do not invent sample rows.
- If the user has not set `ANTHROPIC_API_KEY`, fall back to a plain `cat` of the CSV rather than calling any LLM.

## Output format

### Mini summary

```
Scope: <scope> | Rows: <N> | Total value: $<X> | Format: <format>
File: <path>
```

### The export

Either CSV file path, JSON object, or markdown table — depending on what was requested.

### Suggested next step

A short suggestion like:

> Hand this file to `pipeline-hygiene-audit` for ageing analysis,
> or run the portfolio view of `crm-lead-source-quality-audit` inside the LMS.

## Practical example

User: "Export all leads currently in qualified or proposal, with their activities, as JSON."

- Scope: `stage:qualified` plus `stage:proposal` (multi-stage is supported by passing comma-separated values).
- Format: `json`.
- Result: prints `{"scope": "stage:qualified,proposal", "leads": [...]}`.

## Guardrails

- Do not write to any path outside `/tmp/lrm_*`.
- Do not include PII that isn't on a lead already (email, phone are fine; do not add external IDs).
- Do not run any other skill automatically — produce the export, recommend the next step, stop.