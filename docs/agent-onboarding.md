# Letting an AI assistant work your leads

Written for: a Steadfast admin setting this up for their team. No coding
required for the main path.

This connects an AI assistant — Claude, or anything that speaks MCP — to your
workspace so it can read your pipeline and make changes on your behalf:
adding leads, logging calls and emails, and moving deals between stages.

---

## Before you start: four things to know

**1. You need to be an admin.** Only admins can create the key. If Settings
has no "MCP agent access" card, you are not one — ask whoever set up the
workspace.

**2. There is one key for the whole workspace, not one per person.** Anyone
holding it acts as the workspace, not as themselves. Treat it like a shared
password: it is not a way to give one rep their own assistant.

**3. Every lead the assistant creates must have a named owner.** The
assistant has to say which rep a lead belongs to, by email. If it does not,
the lead is rejected rather than being filed under nobody. Decide now who is
the default owner for assistant-created leads.

**4. Its changes are labelled, not hidden.** Everything the assistant does
appears in the lead timeline as **AI Agent**. Nobody will mistake it for a
colleague's work, and you can always see what it touched.

---

## Step 1 — Create the key

1. Open **Settings**.
2. Find **MCP agent access**.
3. Click **Generate key**.
4. Copy it somewhere safe. It is shown in Settings whenever you need it
   again, but only admins can see it.

> Generating a new key instantly stops the old one working. Do that if the
> key leaks, or when someone with access leaves.

---

## Step 2 — Connect your assistant

In the same card, open **Quick start — connect an assistant**. Two routes:

**If you don't set up software.** Choose **Ask your assistant**, copy the
block, and paste it into Claude. It edits its own config file and tells you
when to restart. This is the shortest path and needs no technical knowledge.

Or choose **Claude Desktop** to do it by hand in three steps. One warning
the guide repeats, because it is the most common way this goes wrong: if
your config file already contains `mcpServers`, add the `steadfast` entry
*inside* it. Replacing the whole block silently disconnects every other tool
you had connected.

**If you're comfortable with a terminal.** Choose **Claude Code** and run
one command. There are also tabs for Cursor, the OpenAI API, ChatGPT and raw
HTTP.

---

## Step 3 — Check it worked

Ask your assistant:

> How many leads are in my pipeline?

Real numbers back means you are connected.

If it says it has no such tool: the config was not saved, or the app was not
fully quit and reopened. A restart is required — the config is read only at
startup.

---

## Step 4 — Decide what you want it to do

Now the part most people skip. The assistant can write to your CRM, so be
explicit about how you want it to behave. Say this at the start of a
conversation, or save it as a project instruction:

> When you add leads to Steadfast, assign them to priya@acme.com unless I
> say otherwise. Always show me the details and wait for me to confirm
> before creating or moving anything. Never move a deal to Won without
> asking.

Three habits worth keeping:

- **Name a default owner.** Otherwise you will be asked every single time.
- **Ask for confirmation before writes**, at least until you trust it.
- **Be specific about stages.** "Move it forward" is ambiguous; "move it to
  proposal" is not.

---

## What it can and cannot do

**Can:**

| | |
|---|---|
| Search your leads | by company, contact, email, or stage |
| Open one lead in full | including its whole activity history |
| Summarise the pipeline | counts and value per stage |
| Add a lead | owner required |
| Log an activity | call, email, note, meeting |
| Move a deal's stage | a one-line reason is required |

**Cannot:**

- See any other organisation's data. The key is tied to your workspace only.
- Skip your rules. Required fields, duplicate checks and your workflow
  automations all apply exactly as they do in the app.
- Delete leads. There is no delete tool.
- Move a stage without a reason. It must say what happened, same as a rep.
- Pretend to be a person. Every change is attributed to **AI Agent**.

---

## Everyday examples

> Add a lead for Ardent Studio, contact Meera Raghavan,
> meera@ardent.studio, owner priya@acme.com.

> I just got off a call with Northwind — log it: they want a revised quote
> by Friday.

> Which leads in proposal have had no activity in three weeks?

> Move Cedarline Supply to proposal — they approved budget on today's call.

Pasting a forwarded email works too:

> Here's an email I was forwarded. Create a lead from it, owner
> arjun@acme.com. <paste>

---

## If something goes wrong

**"It has no such tool."** Config not saved, or the app was not fully
restarted. Quit completely and reopen.

**"Unauthorized."** The key is wrong, or was regenerated after you connected.
Copy the current key from Settings and reconnect.

**"Too many requests."** Built-in rate limiting. Wait a minute and retry. If
it keeps happening, something is polling in a loop.

**"ownerEmail does not match an active user."** The email is not a current
active member of your workspace. Check the spelling in Settings → Users.

**It created a duplicate.** It warns about an existing lead with the same
email and refuses — unless told to force it. If a duplicate exists, it was
forced, or the emails differ.

**Other tools stopped working after setup.** The config block was pasted over
an existing `mcpServers` section instead of merged into it. Re-add the other
entries.

---

## Turning it off

Settings → MCP agent access → **Revoke**. Every connected assistant stops
working immediately. Nothing it already did is undone — those changes stay
in the timeline, labelled **AI Agent**, exactly as before.

---

## A note on trust

The assistant can change real customer records. Two honest cautions:

Anyone with the key acts as your whole workspace, so share it narrowly and
rotate it when someone leaves.

An assistant reading an email and acting on it is following text written by
someone outside your company. Steadfast treats pasted content as data rather
than instructions, but the assistant's own judgment sits outside that
boundary. Keep "confirm before writing" switched on for anything touching
money or stage changes, and the labelled timeline will show you exactly what
it did.

---

## Documents and your agent (added 2026-10-16)

Your agent **cannot read onboarding documents**, and this is deliberate.

Identity documents uploaded during onboarding (PAN, GST, incorporation
certificates, bank proofs) are stored in the uploader's browser. They are
never sent to our servers, so there is nothing for an agent to fetch. The MCP
tools expose no document-content tool and never will.

What an agent *can* see, if we later expose it, is the metadata: that a
document of a given kind exists, its filename and size, and whether it has
been reviewed. That is enough to answer "is this merchant's paperwork
complete?" without any party, us included, being able to read the papers.

If you need an agent to process document contents, do it on the machine that
holds them. Nothing in this product can hand those files to a remote model.
