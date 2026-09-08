## /ritual status

Thin in-chat mirror of the terminal CLI command `ritual status [--watch]` (CLI 0.7.14+).

The CLI is the primary affordance for the "I walked away from this run; let me check on it" case — it works from any terminal, survives this agent session closing, and supports `--watch` for live tail. **This SKILL subcommand exists for the orthogonal case:** the user is still in the agent session, wants a quick status snapshot, and doesn't want to context-switch to a separate terminal.

Same content, two surfaces. Pick whichever fits the user's flow.

### When to use this vs. the terminal CLI

| Context | Use |
|---|---|
| User is in chat with you and types `/ritual status` | This SKILL subcommand. |
| User is mid-run and walks away | Tell them about `ritual status --watch` in a separate terminal. Their session can close; the CLI keeps tailing. |
| User wants to script status / pipe to other tools | Terminal CLI. The SKILL is render-only; the CLI prints to stdout with proper exit codes. |
| User asks "what's happening?" without typing the slash | Plain English answer — call `mcp__ritual__get_agentic_run` and respond naturally. Don't gratuitously invoke this subcommand. |

### Steps

#### Step S1 — Resolve the run

The subcommand can be invoked three ways:

1. **`/ritual status`** (no arg) — auto-resolve the current run from workspace context:
   - If `.ritual/config.json` is bound (i.e. `/ritual init` was run in this repo), load `workspaceId` from there.
   - Call `mcp__ritual__list_explorations(workspace_id)`, sort by `updatedAt` desc.
   - For each of the top 5 most-recently-updated, call `mcp__ritual__list_agentic_runs(exploration_id, status='RUNNING', limit=1)` until one returns a run.
   - If none has a RUNNING run, fall back to the most-recently-updated exploration with step != `COMPLETED`.
   - If no workspace is bound to the project, ask the user for an exploration id or to run `/ritual init` first.

2. **`/ritual status <exploration-id>`** — skip auto-resolve, fetch that exploration directly.

3. **`/ritual status --runs`** — list every RUNNING agentic run across the workspace (multi-run case). Render as a numbered picker.

#### Step S2 — Fetch state

Call in parallel:

- `mcp__ritual__get_exploration(exploration_id)` → exploration name, step, updatedAt, agenticProgress.
- `mcp__ritual__get_agentic_run(run_id)` IF a RUNNING run was found — gives live progress + run id + status. Read from the **merged view** the MCP tool returns; never from raw `agentic_jobs.totalQuestions` or `agentic_jobs.progress.steps` directly (those fields are not populated for `full_exploration_v1` runs).

#### Step S3 — Render the run-first layout

Mirror the terminal CLI exactly. Run line first, exploration name as a footer parenthetical:

```text
Run        ba4d2b42-…  ·  RUNNING for 17m 41s
Phase      answering  (58%)
Questions  42 / 67  ·  0 failed
Activity   last DB write 1m 12s ago
Pace       ~14s/question  ·  ETA ~5m 50s remaining
Next       Recommendations (auto-advances when questions are done)

(Exploration: Join while booking — post-order account claim)
  51f16182-…  ·  step: DEVELOPING_ANSWERS
```

Rendering rules:

- **Run line first.** "RUNNING for 17m 41s" is the headline.
- **Pace + ETA** computed client-side from `(now - run.startedAt) / progress.completedQuestions × (totalQuestions - completedQuestions)`. Only show when `completedQuestions >= 3` — below that, render `Pace       warming up — check back in 30s`.
- **Activity** is the freshness signal — if `last write` has been climbing past ~3 min without `completedQuestions` advancing, that's actionable info. Surface it plainly; do not invent a "stuck" diagnosis — the server monitors stalls and recovers them itself.
- **Next line** is heuristic based on `progress.phase`:
  - `answering` → `Recommendations (auto-advances when questions are done)`
  - `submitting` → `Recommendations`
  - `recommendations` → `Build brief (after admin review)`
  - `complete` / `failed` → `—`
  - any unknown → omit the line entirely
- **No run, but progress data exists** (run completed or never started): render `Run        (no active run)` + phase + Activity. Useful when the user types `/ritual status` after a run finished.
- **No run, no progress**: render `Run        (no run started yet)` + Step + Activity.

#### Step S4 — Wrap up

After rendering, the agent's job is done. Do NOT auto-poll, do NOT enter a watch loop inside the chat. The CLI's `--watch` is the live-tail surface; this SKILL is a snapshot.

If the user wants to check again, they type `/ritual status` again. The agent re-runs S1–S3 from scratch.

### Tools used

Read-tier subset of the build-flow tools:

1. `mcp__ritual__list_explorations` (auto-resolve)
2. `mcp__ritual__list_agentic_runs` (find RUNNING)
3. `mcp__ritual__get_exploration` (S2 — name + step + progress)
4. `mcp__ritual__get_agentic_run` (S2 — merged live view)

No new MCP tools required. `/ritual status` is a thin orchestration over what already exists.

### Anti-patterns

- **Don't introduce a "watch" mode inside this SKILL.** The terminal CLI's `--watch` is the live-tail surface. Re-implementing it in chat doubles the affordance and creates polling loops that survive past the user's intent.
- **Don't render raw `agentic_jobs` fields.** `AgenticJob.totalQuestions` and `progress.steps[*].status` are not written for `full_exploration_v1` runs. Reading them directly produces an "all-pending" snapshot lie. The merged view returned by `get_agentic_run` is the only correct source.
- **Don't synthesize ETA from `progress.percent` alone.** Use the question-count math (`completedQuestions / elapsed × remaining`) because it's more accurate than the coarse percent rounded up at major step boundaries.
- **Don't gratuitously invoke this subcommand.** If the user asks "what's happening?" without typing `/ritual status`, just answer in plain English using `get_agentic_run`. The slash-command is for explicit status snapshots, not for every progress question.
