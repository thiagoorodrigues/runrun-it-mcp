# Design: Usage Examples in README

**Date:** 2026-05-30
**Status:** Approved

## Goal

Enrich the README with a new `## Examples` section showing real conversational usage of the MCP tools — user prompt in natural language and Claude's response — so readers immediately understand the value and feel of using the server.

## Format

Each example follows this pattern:

```
**User:** <natural language prompt>

**Claude:** <narrative response with the returned data>
```

No tool call details, no raw JSON — just the conversational surface that the end user actually sees.

## Placement

Insert `## Examples` immediately after the `## Tools` table and before `## Environment variables`.

## Structure and Examples

### Managing tasks

**Example 1 — List open tasks in a project**

> **User:** What are the open tasks in the "Website Redesign" project?
>
> **Claude:** Here are the open tasks in Website Redesign:
> - **#1234** Create homepage layout — *In progress* · Ana Silva
> - **#1235** Review landing page copy — *To do* · João Lima
> - **#1236** Integrate contact form — *To do* · unassigned
> - **#1237** Responsiveness testing — *Blocked* · Pedro Costa

---

**Example 2 — Create a task**

> **User:** Create a task "Write release notes for v0.4" in the Backend project, assign it to me, due next Friday.
>
> **Claude:** Done! Task **#1301 Write release notes for v0.4** created in Backend, assigned to you, due 2026-06-06.

---

**Example 3 — Move a task to a different status**

> **User:** Move task #1234 to "Done".
>
> **Claude:** Task **#1234 Create homepage layout** has been moved to **Done**.

---

**Example 4 — Add a comment**

> **User:** Add a comment to task #1235 saying the copy was approved by the client.
>
> **Claude:** Comment added to **#1235 Review landing page copy**: "Copy approved by the client."

---

### Time tracking

**Example 5 — Start timer**

> **User:** Start the timer on task #1236.
>
> **Claude:** Timer started on **#1236 Integrate contact form**. The clock is running.

---

**Example 6 — Pause timer**

> **User:** Pause the timer.
>
> **Claude:** Timer paused on **#1236 Integrate contact form**. You worked for **1h 23m** in this session.

---

**Example 7 — Log hours manually**

> **User:** Log 2 hours on task #1235 for yesterday.
>
> **Claude:** Logged **2h** on **#1235 Review landing page copy** for 2026-05-29.

---

### Custom fields and tags

**Example 8 — Search and apply tags**

> **User:** Add the tags "frontend" and "urgent" to task #1237.
>
> **Claude:** Tags updated on **#1237 Responsiveness testing**: **frontend**, **urgent**.

---

**Example 9 — Update a custom field**

> **User:** Set the "Complexity" field on task #1234 to "High".
>
> **Claude:** Custom field **Complexity** set to **High** on **#1234 Create homepage layout**.

---

## Self-review

- No placeholders or TBDs.
- All examples are consistent in formatting.
- Examples cover the most-used tool groups without exhausting all 30 tools.
- Tone matches the existing README (concise, technical, English).
- Placement (after Tools table, before Environment variables) keeps the README scannable.
