---
name: lms-skill-history-recap
description: Summarises what LRM_blu skills have been run in a window — which, how often, what they recommended, what was applied. Use when the user asks "what has the LMS actually told us lately?" or before a forecast / quarter review.
---

# LRM_blu Skill History Recap

Reads the `SkillRun` table in LRM_blu and produces a recap that separates signal from noise.

## Use this skill when

- A weekly / monthly review is coming up.
- The user wants to know whether running all 30 skills is actually moving the needle.
- A forecast conversation needs to cite "what we learned from diagnostics".
- The user asks "which skills should we drop" because they never get applied.

## Required input

- Time window: `last 7 days` (default) | `last 30 days` | `this quarter` | custom date range.
- Optional: filter by `runnerType` (script / llm).
- Optional: filter by `leadId` (per-lead recap).
- Optional: filter by `skillId` (one skill's track record).

## Analysis workflow

1. Query `SkillRun` filtered by `createdAt >= window.start`.
2. Compute four views:
   - **Volume**: total runs, runs by runner type, runs by skill, runs by day.
   - **Focus**: which stages and which sources are over- and under-represented in skill runs.
   - **Persistence**: how often the same skill is re-run for the same lead (re-runs usually mean "output wasn't actionable").
   - **Apply rate**: where the user can — note from the input/output which recommendations appeared twice across different skills (e.g. if `ghosted-after-the-demo` and `write-the-follow-up` both flagged the same lead, that lead matters).
3. Flag any skill with a re-run rate >50% within 24h on the same lead — it usually means the output did not give the user a next action.
4. Flag any skill that has never been run — silent inventory, useful for "what am I not measuring".

## Decision rules

- Re-runs ≠ bugs. They usually mean the user came back with new information.
- Two skills agreeing on the same lead is a stronger signal than either one alone.
- Script-backed runs that re-run frequently are a sign the CSV export is wrong — fix the data, not the cadence.
- "Never run" is not "don't care". Some skills (e.g. `spam-folder-check`) run only when DNS changes.

## Output format

### Runs by skill

| Skill | Runs (window) | Re-run rate | Most-flagged lead |
|---|---|---|---|
| Pipeline Hygiene Audit | 12 | 5% | (portfolio) |
| Ghosted After the Demo | 7 | 28% | Anika Sharma (CloudStack Labs) |
| ... | ... | ... | ... |

### What the LMS actually said

A short list of the recurring recommendations that came up across multiple skills:

- "8 leads with no activity past 45 days" appeared in 4 skill outputs.
- "Sales follow-up speed on `contacted` stage is 4 days median" appeared in 3.
- ...

### Skills we never ran (silence isn't always good)

- `won-deal-to-case-study` — 0 runs. Worth scheduling.
- `ad-to-landing-promise-match` — 0 runs but campaign plan includes a paid launch next week.

### Recommendation

- Keep: skills with high apply rate and low re-run rate.
- Fix: skill with high re-run rate → improve the output or the underlying data.
- Schedule: skill that has never been run but is on a known upcoming initiative.

## Practical example

User: "What did the LMS actually tell us this quarter?"

- 312 skill runs across 22 distinct skills (out of 30).
- 3 skills never ran, including 2 that align with next-quarter plans.
- Pipeline Hygiene Audit output this quarter has stabilised: re-run rate dropped from 18% (Q2) to 4% (Q3) after the CSV export bug was fixed.
- 4 leads were flagged by ≥2 skills — those are the quarter's most-coherent recommendations.

## Guardrails

- Do not modify the `SkillRun` table. This skill reads.
- Do not invent run counts or rates. If the table is empty, say "no runs in window".
- Apply-rate is observational, not a verdict. State what the data shows.
- Do not delete or pause skills based on this recap — that is a user decision.