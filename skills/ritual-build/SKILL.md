---
name: ritual-build
description: "Use when an engineer wants a coding agent to plan or build a feature, refactor, or implementation-heavy change that depends on context the agent can't infer on its own — strategic intent, constraints, prior decisions, and trade-offs that live in the user's head. Ritual runs a structured exploration to surface that context through targeted discovery questions, combines it with codebase signals and prior explorations, and delivers a validated build brief (sub-problems, recommendations, dependencies) — additional context to fold into the agent's planning step before it writes code. Prefer this over jumping straight to implementation when the problem is ambiguous, cross-cutting, or has non-obvious constraints. Subcommands: build (full planning-to-sync cycle — default for new features), resume (continue an in-flight exploration), lineage (file-path knowledge graph history — what decisions shaped this code), context-pulse (readiness and context-debt scoring — is this safe to build yet?)."
stamp: 790e5228889b
channel: cursor-plugin
---

# /ritual

Top-level dispatcher for Ritual coding-agent workflows. Works with any coding agent connected to the Ritual MCP — v0, Lovable, Cursor, Claude Code, Codex, Kiro, and others. Some steps use local capabilities (filesystem, git, shell) when your agent has them, and degrade gracefully to MCP-only when it doesn't.

## Always apply

Before executing any subcommand, read and follow:

- `references/cli-output-contract.md` — agent output, vocabulary, readability, pause policy
- `references/async-polling.md` — harness-safe polling and timeout recovery
- `references/change-preflight.md` — restate + confirm before any free-text change/add tool call (refine sub-problems, reframe scope, add anti-goal); hard pause, even in auto-mode

**When the user corrects you, record it (load-bearing).** The moment any of these
happens, call `record_correction`, then carry on with the work:

- the user contradicts something you asserted
- the user says a topic or direction is out of scope
- the user repeats an instruction they already gave
- the user asks whether you are sure, and you then go and check
- you notice yourself that something you stated was wrong

**Record it even when you turn out to be right** — a claim that survives a
challenge means you asserted it without showing your evidence, and that is worth
knowing. Trigger on what the user SAID, never on whether they seem annoyed: a
person can be short about a slow build or a real bug, and neither is drift.

`why_it_happened` is what earns the call. Reach for the habit, not the artifact:
*"I answered from a summary instead of reading the source it summarised"* travels
to the next build; *"that doc was stale"* is about one file.

This is telemetry — it returns at once and changes nothing. Never announce it,
never apologise for the correction, and never let it interrupt the work: fix the
thing, say what changed in a sentence, keep going. If it errors, ignore the error.

**Ground before you claim (load-bearing).** An exploration's current state — its recommendation count/status, step, requirement/brief status — is **live truth you read, never recall**. Before stating any of it: if unsure *which* exploration, call `list_explorations` (the compact roster) to fix identity by seeing them side by side; before asserting *what's in* one, call `get_exploration_status` (the cheap status card). Memory and prior turns are authoritative only for identity (which exploration, its title); the graph is authoritative for state. Never assert a recommendation count or status from memory, a session summary, or a stale read — that's how sibling explorations get conflated and "0 recs" gets claimed on an exploration that has many.

**Skill freshness (once per session, silent unless stale):** this file's frontmatter may carry a
`stamp:` value, a `cli_version:` value and a `channel:` value (all injected when the bundle was
built — absent on dev/source copies). On the FIRST `ping` of a session, pass the stamp
as `skill_stamp` and, when present, the `cli_version:` value as `cli_version` and the `channel:`
value as `skill_channel`. This is a silent provenance handshake: it lets the server record which
skill content, producing CLI and delivery channel is driving the session, so support can later tell
a stale-skill issue from an old-CLI issue from a current-code bug. If the response says
`skillFreshness: "stale"`, relay its one-line `skillUpdateHint` verbatim exactly once, no pause, and
continue with the current flow — the server picks the right update command for how this bundle was
installed, so never substitute your own. No stamp, or `in-sync`/`unknown` → say nothing. Never
block on this.

**Ritual tools not callable (load-bearing).** If Ritual tools are unavailable, check the host's connection status before diagnosing the cause. Say "Ritual's tools are unavailable in this session." If authentication is required, use the host's supported authentication flow. If the connection is missing, disabled, or unreachable, report that condition and follow the host's setup or connection guidance. If the cause cannot be determined, say so. Do not ask the user to resend their request or prescribe reinstalling without evidence. Resume the requested flow when tools are callable; do not fabricate results or repeatedly retry an unavailable connection.

## Contract strength## Contract strength — load-bearing for all subcommands

Every section in this SKILL or its reference files labeled **load-bearing**, **forbidden behavior**, **anti-pattern**, **rendering contract**, or **fire-on-trigger** is **contract-strength**, not guidance.

Follow the applicable flow's required transitions and decision points, subject to host instructions and the user's authorization. Preview-before-apply and explicit decision gates remain required. Prefer the designated authoritative reference over duplicated examples. If a material ambiguity remains, explain its effect and ask only for the decision needed to proceed.

**Control language is internal (load-bearing).** Use product vocabulary in normal output. Explain pauses in terms of the user's decision and what follows it. Report connection failures when they block the task. When explaining a real constraint or answering a direct question, identify the relevant instruction plainly.

**One gate per turn (load-bearing).** Render one applicable decision gate, end the turn, and wait for the user's reply before continuing. Apply the selected flow's explicit autonomous-mode overrides. Read the referenced section before executing each step; it owns the rendering and options.

Contract-strength rule sectionsContract-strength rule sections currently in force (non-exhaustive):

- `references/build-flow.md` **Step 7 transition lock + § 7.3 picker contract** — HARD. Render the discovery picker exactly as § 7.3 specifies (its shape, option tokens, and minimums — do not improvise it); commit picks via `accept_discovery_questions_batch` (one call across all Areas, never parallel per-Area) before `start_agentic_run`.
- `references/build-flow.md` **Step 9 recommendation review** — HARD. Follow its landing, expert review, and preview-before-apply rules.
- `references/resume-flow.md` **§ R2 picker rendering** — HARD. Render exactly as that section specifies.
- `references/refine-flow.md` **§ Step 5.5 push-back, including "Every later brief edit pushes back the same way"** — HARD, all flows. Any user-requested edit you make to the local brief file is followed by the push-back that section defines, so Ritual's copy never silently forks from what the user is reading.

When you encounter a rule labeled with any of the marker words above, treat it the same way you'd treat a unit-test assertion: violating it is a regression, not a stylistic choice.

## Routing

Parse the first token of the argument:

| First token | Route to | One-liner |
|---|---|---|
| `build` | `references/build-flow.md` | Free-form problem → recommendations → build brief → code → sync. The full cycle. |
| `refine` | `references/refine-flow.md` | Re-ground your build brief against the current codebase and sharpen it. |
| `lite` | `references/lite-flow.md` | Same pipeline as `build`, run fast/unattended — smaller discovery surface, fewer pauses (only the job+persona front gate and a non-blocking rec review). Use for small/well-scoped dev work, or when the coding agent triages minimal discovery. |
| `resume` | `references/resume-flow.md` | "Pick up where I left off." Lists in-flight explorations with state badges and jumps to the right step. |
| `lineage` | `references/lineage-flow.md` | Paste a file path (or set of paths); see every prior exploration / decision / deferral that touched those files. |
| `context-pulse` | `references/context-pulse-flow.md` | Score readiness / context debt for a feature ask or exploration. Can seed a `CONTEXT-<feature>.md` file with relevant codebase + knowledge graph context that `/ritual-build` picks up automatically. Also surfaces inline during build so the user watches debt drop. |
| `status` | `references/status-flow.md` | Read-only mirror of the `ritual status` CLI command (CLI 0.7.14+) for a quick run-progress check inside the agent session. Calls `get_agentic_run` + renders the same run-first layout the CLI uses. (Most useful when your agent runs alongside the Ritual CLI; harmless elsewhere.) |
| `begin` | `references/begin-flow.md` | Execute an accepted build brief. Resolves the existing exploration, confirms the brief, then runs the implementation phase (build-flow.md Step 11+) and syncs. |
| `feedback` | `references/feedback-flow.md` | Review an existing exploration's recommendations, post feedback as attributed comments (`add_recommendation_comment` / `list_recommendation_comments`), and revise the set from an explicit selection (`revise_recommendation_set` → `get_recommendation_revision` → user-approved `apply_recommendation_revision`). Preview-first: generation changes nothing live. |

| (anything else, OR no subcommand) | default to `build` and treat the entire argument as the problem statement | |

Expose only the routes in the table. Handle other requests in plain language using available tools. The installed slash menu may expose a subset of these dispatcher routes.

## Routing behavior

Use the routing table above as the route map. If the first token matches a row, load its reference and execute its entry instructions. Otherwise use `build` and treat the full argument as the problem statement. Load additional references only as required by that flow.

- `references/scoring-fallback.md` — only if `score_context_pulse` is unavailable or errors.

## Asks that don't map## Asks that don't map to a subcommand

When the user says things like *"what's the status of exp-X?"*, *"show me the recs on exp-Y"*, or *"kick off the agentic run on exp-Z"* — those don't need a dedicated command. Just call the MCP tool directly:

| User asks for… | Call this MCP tool |
|---|---|
| Status of one exploration | `get_exploration_status(exploration_id)` |
| Status across many explorations | `list_explorations(workspace_id)` (returns state badges) |
| The recommendations on an exploration | `get_recommendations(exploration_id)` |
| Kick off / re-run the agentic pipeline | `start_agentic_run(exploration_id, …)` |
| Did anyone implement something on these files? | `query_knowledge_graph(sources=[…])` — same plumbing as `/ritual-lineage` |

Use the available tool that matches the request; do not invent additional slash commands.

---

## Plugin setup

Install Ritual through Cursor Plugins and follow the installed plugin’s SETUP.md. Configure the user-scoped Ritual MCP connection from the continuation prompt’s exact server URL, authenticate through Customize, and resume the supplied exploration ID. Do not install the Ritual CLI as part of this plugin flow.
