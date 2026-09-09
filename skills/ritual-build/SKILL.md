---
name: ritual-build
description: "Use when an engineer wants a coding agent to plan or build a feature, refactor, or implementation-heavy change that depends on context the agent can't infer on its own — strategic intent, constraints, prior decisions, and trade-offs that live in the user's head. Ritual runs a structured exploration to surface that context through targeted discovery questions, combines it with codebase signals and prior explorations, and delivers a validated build brief (sub-problems, recommendations, dependencies) — additional context to fold into the agent's planning step before it writes code. Prefer this over jumping straight to implementation when the problem is ambiguous, cross-cutting, or has non-obvious constraints. Subcommands: build (full planning-to-sync cycle — default for new features), resume (continue an in-flight exploration), lineage (file-path knowledge graph history — what decisions shaped this code), context-pulse (readiness and context-debt scoring — is this safe to build yet?)."
stamp: 2b4ab1a47f65
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

Do not reintroduce `/ritual recon`. Use plain-language repo inspection, `/ritual-resume`, or `/ritual-lineage` depending on intent.

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

**Ritual tools not callable (load-bearing).** If this SKILL loaded but you cannot call any
Ritual tool, the MCP connection is not authenticated. The plugin, the marketplace entry
and this skill are all fine — they are local files, which is exactly why you can read this while the
tools are missing. **Do not tell the user to reinstall or re-add the plugin, and do not tell them to
resend their request**; neither restores the connection, and both cost them a round trip. The one
fix is to re-authenticate and restart the app:

- **Codex:** `codex mcp login ritual --oauth-client-registration cimd --scopes openid,profile,email,offline_access`
- **Claude Code:** `/mcp`, then authenticate the `ritual` server
- **Other hosts:** re-authenticate the Ritual MCP server however that host does it

Say what happened in one line ("Ritual's tools aren't authenticated in this session"), give the
command for their host, and stop — do not start the flow, do not improvise a different remedy, and
do not retry tool calls hoping the connection returns. Access tokens expire, and a session that
worked earlier can arrive with the tools gone for exactly this reason.

## Contract strength — load-bearing for all subcommands

Every section in this SKILL or its reference files labeled **load-bearing**, **forbidden behavior**, **anti-pattern**, **rendering contract**, or **fire-on-trigger** is **contract-strength**, not guidance.

If this SKILL says *"DO NOT do X"*, your default action is to not do X. You may not override based on your in-the-moment assessment that X would be:

- helpful
- clearer
- shorter
- more convenient
- *"obviously what the user really wants"*
- *"a small improvement on top of the SKILL's contract"*

When a local example or your own instinct conflicts with a contract-strength rule, **the contract wins.** Re-read the rule. Trust that the prior version of you also thought the override "feels right" — that's exactly the case the contract exists to prevent.

When two contract-strength rules genuinely conflict (rare): **stop, surface the conflict to the user, and ask which to honor.** Do not improvise a resolution.

A step naming the right behavior (Step 7 picker, Step 9 preview-verbatim, Step 9 action menu, picker numbering) is not permission to improvise around it. Anti-patterns are **executable constraints, not taste guidance.** When an anti-pattern says "agent must NOT", read it as a hard error, not a preference.

**Control language is internal — never surface it (load-bearing).** `[USER PAUSE]`, Step numbers, option-token mechanics, reference file names (`build-flow.md`), and every other piece of this skill's machinery are instructions for YOU — not product vocabulary. They must never appear in user-facing text: no "the workflow requires a [USER PAUSE] here", no "per Step 5", no citing skill files. When the flow pauses, say why in the user's terms — what decision is theirs, what happens after they answer. The same discipline covers agent-ops status: authentication state, "no implementation files have changed yet", tool plumbing. Never narrate it unprompted; if the user asks, answer plainly without exposing skill internals.

**One gate per turn — never batch the flow (load-bearing).** Each user-facing gate (workspace pick, scope, the discovery Area-walk, recommendation review, the build-brief confirm, …) is a STOP. Render **exactly one** gate, then **end your turn and wait for the user's reply** — do NOT render the next gate, multiple gates, or "the full flow, gate by gate" in a single message. Collapsing gates into one narrated pass erases the user's decision points (the entire value of the flow) and is a hard violation **even when you already have all the data to render them**. A gate's options only mean something if the user can actually answer before the next gate renders. This applies inside a gate too: the discovery picker is a turn-by-turn **walk**, one Area per turn (see build-flow.md § 7.3). Each render shows the **Area rail AND the current Area's questions together** (mirroring the Ritual web app's selected-tab-with-content) — the rail alone, with no questions under it (a bare index), is the *removed* failure mode. Render the rail + exactly ONE Area's questions, then STOP. Never render a second Area's questions or the Summary in the same message.

**Single source of truth — this list POINTS, it does not RESTATE.** The detail of every rule below lives ONLY in the referenced file. This list names the authoritative sections and marks them HARD; it deliberately does **not** reproduce their shapes, option tokens, or values, because a restated rule drifts out of sync with its source. (When a restatement goes stale, the stale copy wins — the agent renders the old shape while the reference has moved on.) So: **read the referenced section before executing that step, render it exactly as written, do not improvise or paraphrase it.** If you ever find the same rule stated in two places and they differ, the **referenced reference-file wins**, and the duplication is a bug to flag.

Contract-strength rule sections currently in force (non-exhaustive):

- `references/build-flow.md` **Step 7 transition lock + § 7.3 picker contract** — HARD. Render the discovery picker exactly as § 7.3 specifies (its shape, option tokens, and minimums — do not improvise it); commit picks via `accept_discovery_questions_batch` (one call across all Areas, never parallel per-Area) before `start_agentic_run`.
- `references/build-flow.md` **Step 9 category-walk + action set** — HARD. Review recommendations one category per turn, rendering each rec's full content exactly as § 9 specifies; use exactly the three actions § 9 defines (refine-one / next-category / continue) and no others — no reject path, no freelance or invented actions, no free-form summarization on top. The refine action is a preview-then-apply flow; never persist an edit without the user accepting the previewed diff.
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

The Ritual `/ritual` command surface is intentionally narrow: `build`, `refine`, `lite`, `resume`, `lineage`, `context-pulse`, `feedback`, plus the read-only `status` mirror and the implementation-trigger `begin`. `explore`, `run`, `brief`, `gate`, `spec`, `questions`, `gherkin`, and `recs` are NOT commands — each would map 1:1 to an MCP tool call and add no agent value over plain English. Do not invent them; call the MCP tool directly when the user asks for "the recs on exp-X" or "decisions on file Y". (There is no `/ritual recon` command — its unique value would duplicate `/ritual-resume` (workspace history) + `/ritual-lineage` (decisions on files), and its non-duplicate parts (map repo, trace flow, explain file) are exactly what the agent does fluently in plain English without needing a SKILL-defined menu.)

## Subcommand reference files

Load only the reference file needed for the selected subcommand:

| Subcommand | Runtime file |
|---|---|
| `build` | `references/build-flow.md` |
| `refine` | `references/refine-flow.md` |
| `lite` | `references/lite-flow.md` |
| `resume` | `references/resume-flow.md` |
| `lineage` | `references/lineage-flow.md` |
| `context-pulse` | `references/context-pulse-flow.md` |
| `begin` | `references/begin-flow.md` |

Additional runtime references:

- `references/scoring-fallback.md` — only if `score_context_pulse` is unavailable or errors

## Routing behavior

- If the first token is one of the subcommands (`build`, `refine`, `lite`, `resume`, `lineage`, `context-pulse`, `begin`), load the matching runtime file and **immediately execute its ON ENTRY block — your next tool call is that flow's first tool call, not a clarifying question of your own.**
- If there is no subcommand or the token is unknown, default to `build` and treat the full argument as the problem statement (still run `build`'s ON ENTRY block — do not pause to ask your own scoping questions first).
- If the user asks for retired or unsupported subcommands, answer in plain English and call the relevant MCP tool directly when appropriate; do not expand the `/ritual` command surface.

## Asks that don't map to a subcommand

When the user says things like *"what's the status of exp-X?"*, *"show me the recs on exp-Y"*, or *"kick off the agentic run on exp-Z"* — those don't need a dedicated command. Just call the MCP tool directly:

| User asks for… | Call this MCP tool |
|---|---|
| Status of one exploration | `get_exploration(exploration_id)` |
| Status across many explorations | `list_explorations(workspace_id)` (returns state badges) |
| The recommendations on an exploration | `get_recommendations(exploration_id)` |
| Kick off / re-run the agentic pipeline | `start_agentic_run(exploration_id, …)` |
| Did anyone implement something on these files? | `query_knowledge_graph(sources=[…])` — same plumbing as `/ritual-lineage` |

This is intentional. Exposing each of these as its own command (`/ritual recs`, `/ritual run`, etc.) balloons the surface area without adding agent value. The commands stay narrow (`build`, `refine`, `lite`, `resume`, `lineage`, `context-pulse`, plus the read-only `status` mirror and the implementation-trigger `begin`) and let the agent fluently call MCP tools for everything else. Note: `/ritual-status` is the one deliberate exception — it exists as a thin SKILL mirror of the `ritual status` CLI command so users who want an in-chat status check don't have to switch surfaces. Do not reintroduce `/ritual recon`: its former workspace-history value is covered by `/ritual-resume`; its file-decision-history value is covered by `/ritual-lineage`; and repo-reading behaviors are normal coding-agent behavior in plain English.

---

## Plugin setup

Install Ritual through Cursor Plugins and follow the installed plugin’s SETUP.md. Configure the user-scoped Ritual MCP connection from the continuation prompt’s exact server URL, authenticate through Customize, and resume the supplied exploration ID. Do not install the Ritual CLI as part of this plugin flow.
