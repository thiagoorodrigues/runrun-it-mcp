# README Usage Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Insert a `## Examples` section in `README.md` with 9 conversational usage examples grouped into 3 subseções.

**Architecture:** Pure documentation change — one file edited, no code touched. The new section is inserted between `## Tools` and `## Environment variables`.

**Tech Stack:** Markdown

---

### Task 1: Insert the Examples section into README.md

**Files:**
- Modify: `README.md` (after line 132, before `## Environment variables`)

- [ ] **Step 1: Open README.md and locate the insertion point**

Find the blank line between the Tools table closing row and `## Environment variables`. It is immediately after this line:

```
All list tools support `page` (default 1) and `limit` (default 50, max 100).
```

- [ ] **Step 2: Insert the Examples section**

Add the following block between `All list tools support...` and `## Environment variables`:

````markdown

## Examples

The examples below show natural-language prompts and the responses Claude gives when using this MCP server.

### Managing tasks

**User:** What are the open tasks in the "Website Redesign" project?

**Claude:** Here are the open tasks in Website Redesign:
- **#1234** Create homepage layout — *In progress* · Ana Silva
- **#1235** Review landing page copy — *To do* · João Lima
- **#1236** Integrate contact form — *To do* · unassigned
- **#1237** Responsiveness testing — *Blocked* · Pedro Costa

---

**User:** Create a task "Write release notes for v0.4" in the Backend project, assign it to me, due next Friday.

**Claude:** Done! Task **#1301 Write release notes for v0.4** created in Backend, assigned to you, due 2026-06-06.

---

**User:** Move task #1234 to "Done".

**Claude:** Task **#1234 Create homepage layout** has been moved to **Done**.

---

**User:** Add a comment to task #1235 saying the copy was approved by the client.

**Claude:** Comment added to **#1235 Review landing page copy**: "Copy approved by the client."

---

### Time tracking

**User:** Start the timer on task #1236.

**Claude:** Timer started on **#1236 Integrate contact form**. The clock is running.

---

**User:** Pause the timer.

**Claude:** Timer paused on **#1236 Integrate contact form**. You worked for **1h 23m** in this session.

---

**User:** Log 2 hours on task #1235 for yesterday.

**Claude:** Logged **2h** on **#1235 Review landing page copy** for 2026-05-29.

---

### Custom fields and tags

**User:** Add the tags "frontend" and "urgent" to task #1237.

**Claude:** Tags updated on **#1237 Responsiveness testing**: **frontend**, **urgent**.

---

**User:** Set the "Complexity" field on task #1234 to "High".

**Claude:** Custom field **Complexity** set to **High** on **#1234 Create homepage layout**.

````

- [ ] **Step 3: Verify the README renders correctly**

Open `README.md` and confirm:
- `## Examples` appears after the Tools table
- `## Environment variables` still appears after the Examples section
- The three subheadings (`### Managing tasks`, `### Time tracking`, `### Custom fields and tags`) are present
- 9 examples are present, each separated by `---`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add Examples section to README with conversational usage examples"
```
