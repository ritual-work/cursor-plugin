# Agent output contract

> **Planning-turn rendering is governed by `references/render-contract.md`** — the
> single source of truth for what may be user-visible during `/ritual build`'s
> planning phase (the gate / status / nothing allowlist + forbidden tokens). This
> file covers output *style* (density, the progress anchor, surface-aware
> rendering); the render-contract owns *what may render at all*. When they differ,
> render-contract.md wins.

### Developer-facing output contract

This skill drives an agent surface where the user reads every line of the agent's output. Optimize for a busy engineer who wants enough signal to trust the workflow without reading the agent's scratchpad.

Maintain two layers throughout the flow:

1. **Internal working context** — detailed recon notes, rationale, file-level evidence, assumptions, raw tool inputs, and full priorContext. Use this for MCP calls, build brief generation, and later synthesis.
2. **User-visible status** — only the information the developer needs to decide, unblock, or trust progress.

For code recon specifically, keep raw observations separate from synthesized planning context:
- `raw_recon_notes` are internal evidence: files read, symbols inspected, comments, uncertain observations, false leads, and KG hits.
- `codebase_context_packet` is the downstream planning input: factual surfaces, evidence, agent hypotheses, confidence, scope pressure, scope corrections, and open questions.
- `recon_digest` is the short user-visible summary.

Do **not** pass raw notes as the primary context to MCP generation tools. Raw notes are evidence; the context packet is the auditable, non-authoritative planning input. The MCP remains responsible for generating and ranking final considerations and scope.

Default user-visible messages should be:
- 3–7 bullets max, unless the user explicitly asks for detail
- no more than one screen
- focused on findings, constraints, next action, and specific signals
- free of “I inferred…” / “that means I'll bias…” narration unless the inference changes a user-facing choice
- free of raw file-by-file recon dumps unless requested
- formatted for terminal readability: short paragraphs, blank lines between major items, and label/value blocks instead of dense wrapped prose

**Output discipline — never leak internal reasoning or mechanics (load-bearing, worked examples):**

The two failure modes below are the most common leaks. They are forbidden, not discouraged.

1. **Don't editorialize — just ask.** When you ask the user to choose, render the question + the options. Do NOT justify *why* you're asking or how costly getting it wrong is — that's your reasoning, not the user's decision input.
   - ❌ `"New social commerce experience" maps to several distinct features — picking the wrong one wastes significant scope.`
   - ❌ `Because this spans three cross-functional tracks, attribution rules have real product decisions baked in.`
   - ✅ `What would you like to explore?` (then the options + a recommended one)

2. **Silent checks stay silent — never name a tool or narrate plumbing.** Connection/freshness pings, config reads, workspace lookups, and code recon are invisible. Do NOT print "let me ping Ritual", "checking the workspace config", or any `mcp__ritual__*` tool name.
   - ❌ `Now I'll start the build flow. Let me check the workspace config and ping Ritual simultaneously.`
   - ❌ `Pinging Ritual to verify the connection…`
   - ✅ (nothing — run the check silently; the next user-visible line is the actual gate or status)

3. **Don't narrate your process or restate your own instructions.** Loading a spec, fetching a preview, "before presenting", "must print it verbatim", and naming an internal **Step N** are all scratchpad — do them silently and just present the result. The user never sees the machinery between "I have the data" and "here it is."
   - ❌ `6 recommendations ready. Let me load Step 9's exact rendering spec before presenting.`
   - ❌ `Now I'll fetch the server-rendered preview — must print it verbatim.`
   - ❌ `Let me check what the skill says here, then render it.`
   - ✅ (just present it — the recommendations / the picker / the rail, with no preamble about how you produced it)

Rule of thumb: if a line describes what *you* are doing internally (a tool call, loading a spec, a check, why a question matters, what you're about to render), cut it. The user wants the work and the decision, not your scratchpad. Internal **Step N** labels and artifact names ("rendering spec", "server-rendered preview", "the contract") never appear in user-facing copy.

Use this compact status shape whenever possible:

```text
Step {N} — {name} {status}

Found:
- {finding}
- {finding}

Constraint:
- {constraint}

Next: {single recommended action} ({cheap escape hatch})
```

For dense option lists, use a readability-first layout. Put a blank line between options; wrap long descriptions across multiple short lines; use explicit labels (`Why high-leverage:`, `Touches:`, `Next:`) on their own lines when the value is long. Avoid terminal output where a title, description, rationale, and KG references all run together in one wrapped paragraph.

Default dense-list shape:

```text
1. {title}

{1-3 sentence description, wrapped for terminal width.}

Why high-leverage:
{specific signal: build-requirement id, prior decision, open follow-up, shipped PR, or file-level pattern.}

Touches:
{exploration / PR / follow-up references, comma-separated only if short; otherwise wrap.}
```

Use this format for high-leverage problem candidates, recommendation lists with rationale, lineage summaries with multiple events, and any other CLI section where each item has more than one sentence of explanation.

Do not ask for confirmation after safe defaults. State the default and give a lightweight override path.

**[USER PAUSE] policy:** Pause only when the next step would create, approve, delete, implement, accept meaningful cost/time, choose between materially different paths, or resolve ambiguity that code cannot answer. Do not pause for status-only steps, safe defaults, internal recon, silent checks, or no-data outcomes.

**Internal step labels:** Do not expose decimal workflow labels like `Step 1.5`, `Step 7.3.1`, or MCP/tool-step names in user-facing prompts. They are for the skill, not the CLI. Use natural phase language instead: `checking existing explorations`, `choosing a template`, `code recon`, `question picking`, `build brief`, `admin review`, `implementation`, or `sync`. Step numbers are acceptable only in compact progress headings when they help orient the user; avoid them in choice prompts, error messages, and user-facing examples inside this skill.

**Pulse tier labels:** Do not expose raw context-pulse tier identifiers (`RAW_ASK`, `UNDER_SPECIFIED`, `EXPLORED`, `READY`, etc.) in user-facing copy. They are scoring-engine internals, not CLI vocabulary. Translate every appearance into natural-language framing keyed to the phase:

| Raw tier | User-facing phrasing |
|---|---|
| `RAW_ASK` | `initial ask + code recon` or `scope not locked yet` |
| `UNDER_SPECIFIED` | `still under-specified` or `discovery in progress` |
| `EXPLORED` | `explored — recommendations under review` |
| `READY` | `ready for build brief` |

Use the parenthetical form when the surrounding sentence is the readiness/debt summary, for example: `Pulse: Reasoning Readiness ~35% · Context Debt 65% (scope not locked yet)`. The standalone form is acceptable in headings or status badges, e.g. `Phase: code recon`.

**Surface-aware continuation prompts:** Do NOT tell users to "Press Enter" inside `/ritual build` or `/ritual resume` when running in an agent chat surface (Claude Code, Cursor, Codex, etc.). Chat agents cannot reliably observe empty input — pressing Enter typically inserts a newline or sends nothing visible, and the agent has no callback for "user pressed Enter and didn't type anything." Telling the user to do that creates a stuck-flow trap.

| Surface | Continuation contract |
|---|---|
| **Agent chat** (`/ritual build`, `/ritual resume`, anywhere this SKILL drives the conversation) | Use an explicit reply token. The token IS the visible CTA. Empty input is NOT a valid proceed signal. |
| **Real interactive CLI** (`ritual init`, `ritual login`, `ritual whoami`, etc. — code calling `prompt(...)` against a real TTY) | `Press Enter` is fine; the CLI is actually reading stdin and an empty line is a meaningful signal. |

**Visible reply tokens per phase** (single visible CTA each — accept aliases internally but don't list them all):

| Phase | Visible token | Accepted aliases (internal) |
|---|---|---|
| Generate / proceed | `go` | `g`, `generate`, `continue`, `skip`, `none`, `next` |
| Accept the problem frame | `use` | `lock`, `l`, `go`, `continue`, `next` |
| Run discovery → recommendations | `run` | `r`, `go`, `continue`, `next` |
| Stop mid-flow | `pause` | `stop`, `cancel`, `exit` |

Why one visible token (not three): the user is in a decision moment, scanning. `Reply use to accept` is cleaner than `Press Enter or type lock or l or go or continue to accept`. Aliases are kindness; the displayed CTA is clarity.

**Why we demoted `lock`:** "lock" sounds final/irrevocable for a problem frame that is, in practice, very much iterable. `use` carries the right tone ("use this frame and continue"). Keep `lock` as a backwards-compat alias for users who learned the older copy; just don't display it.

**Vertical spacing — readable density:** User-facing messages get cramped fast when sections run together. The agent must render top-level user-facing messages with the following blank-line discipline so the eye can scan in glances:

| Between | Blank line? |
|---|---|
| Rail header → section title | ✅ one |
| Section title → body paragraph | ✅ one |
| Body paragraph → bullet list | ✅ one |
| Labeled section → next labeled section (`Repo signals:` → `Constraint:`) | ✅ one |
| Labeled section → its own bullets | ❌ none (label belongs ON TOP of its bullets) |
| Bullet → next bullet in the same list | ❌ none |
| Body content → pulse line | ✅ one |
| Pulse line → `Next:` block | ✅ one |
| Sub-view divider (e.g. landing → first per-matter view in the same message) | ✅ one + `────...` rule + ✅ one |

When in doubt, prefer one blank line over none. The cost of a tiny gap is unnoticeable; the cost of dense crammed prose is real reader friction. Do NOT insert two blank lines in a row — that creates dead space and breaks visual rhythm.

**Build progress anchor — load-bearing (never omit, render per surface):** Every TOP-LEVEL user-facing message in `/ritual build` and `/ritual resume` MUST begin with a progress anchor before any other content. The anchor is the user's only "where am I in the flow" signal; dropping it silently is worse than printing it redundantly. The agent was historically inferring the rail from examples and squeezing it out under any pressure — this rule makes it explicit, with the exact rendering chosen per surface so the anchor doesn't wrap badly on narrow chat or duplicate a persistent UI stepper.

**Surface-aware rendering** — the canonical five stages stay constant; only the visual changes:

| Surface | Rendering | When to use |
|---|---|---|
| **CLI / terminal** (terminal agents — Claude Code, Cursor, Codex in a built-in terminal) | Full two-line rail. `Ritual build` on line 1, `▶ Scope · Discovery · Recommendations · Build brief · Implementation` on line 2. | Terminal scrollback has no persistent UI — the rail IS the anchor. |
| **Mobile chat / narrow chat** | Compact one-line chip. `Ritual build · 1/5 Scope`. Optionally add a second line: `Done: Scope · Next: Recommendations`. | Five-stage rail wraps and looks noisy inside chat bubbles. |
| **Rich app with persistent stepper** | Single-line stage label. `Scope` (or `Phase: Scope`). The app's pinned stepper above the conversation is the primary anchor; messages just need the current label. At phase transitions, resume points, and major decision gates, include the compact mobile-style chip even in rich-app surface for transcript portability. | The persistent UI carries the anchor; redundant chrome in every bubble is noise. |

**How the agent picks the surface:**

- When your agent runs in a terminal (Claude Code, Cursor, Codex, etc. in their built-in terminals), default to **CLI / terminal** rendering.
- When the surface is a chat UI rather than a terminal (web-app agents like v0/Lovable, mobile-app chat embedding, etc.), drop to the compact chip.
- The rule is: **progress anchor is mandatory; exact visual rendering is surface-specific.** Do NOT force the full five-stage rail when it will wrap.

**Applies to:**

- phase starts (a new stage opens)
- decision gates (the user is about to choose)
- recon summaries
- generated scope / question / recommendation / brief summaries
- resume handoff points
- completion states
- any user-facing pause prompt that closes a phase

**Does NOT apply to:**

- short polling keepalives (`Still generating…`)
- one-line follow-up acknowledgements inside the same phase (`Got it.` / `Saved.`)
- direct answers to user clarifying questions inside an ongoing exchange
- **sub-views inside a phase that iterate** (per-matter pickers in Discovery, per-recommendation reviews in Recommendations, per-answer iterations, etc.) — render the full rail once at the phase landing, then use a lightweight **in-phase chip** on subsequent sub-views

Soft rule of thumb: if the message is a top-level "here's where you are + what to do next," emit the rail. If it's a within-turn ack, a status heartbeat, or the next iteration of a sub-view the user is already cycling through, use the in-phase chip (or nothing) instead.

**In-phase chip** (for iterating sub-views inside a phase that has already shown the full rail):

```text
Discovery — area 2 of 4: {matter.name}
```

Or for a single-recommendation drill view in Step 9:

```text
Recommendations · R{N} — {recommendation title}
```

The chip's job is "you're still in this phase, this is which item of the series" — orientation without the full chrome.

**Forward-pointing CTAs (load-bearing):** every advancing option at a `[USER PAUSE]` gate must name its DESTINATION in user language — never a bare "to continue" / "to proceed". Two accepted shapes:

- inline parenthetical on the action line: `proceed (generate the {Deliverable})`
- spelled-out reply line: ``Reply `proceed` to frame the problem (sub-problems + problem statement), or …``

Canonical destinations (use these; don't improvise):

| Gate | Advancing token | Destination phrase |
|---|---|---|
| Scope-entry gate (0.7) | `proceed` | frame the problem (sub-problems + problem statement) |
| Problem frame (5) | `use` | review discovery questions |
| Suggested-12 landing (7.3.1) | `proceed` | run discovery with these 12 (commits the set; run confirmation follows) |
| Expert-walk summary (7.4) | `commit` | run discovery → recommendations (~a few minutes) |
| Run gate (8) | `run` | source answers → generate recommendations |
| Recommendations (9/9.1) | `proceed` | generate the {Deliverable} (the job's deliverable name from the rail) |
| Audit gate (9.6.1) | `proceed` | skip the audit and generate the {Deliverable} |
| Brief gate (10d) | `go` | implement in your agent |
| Plan handoff (11.0.5) | `ready` | generate the implementation plan |

`{Deliverable}` = the rail's stage-5 name (deliverable-named rail). The destination phrase, the rail's next stage, and what actually happens next must tell ONE story.

**Universal advance alias:** `proceed` is silently accepted at EVERY advancing gate, mapped to that gate's primary token (`use`, `run`, `commit`, `go`, `ready`, …) — the user only ever needs one word. It is NOT displayed as an extra option. Exception already specified elsewhere: at the discovery pick gate an ambiguous `proceed` means **accept shortlist**, never accept-all. `next` is NOT a universal alias — it has gate-local meaning in the discovery Area walk (expert mode).

**Canonical stage table (single source of truth):**

| Stage              | Active during…                                                                 |
|--------------------|--------------------------------------------------------------------------------|
| `Scope`            | Opens at the Step 0.7 Scope-entry gate — server-side classification of the user's raw ask (`prepare_build`, which also auto-resolves the workspace + creates the draft; a correction re-calls `classify_work_item`) + the user's confirmation of what they're building. Then problem frame + sub-problem generation/selection, until scope is locked; the silent grounding recon runs at the lock→create boundary |
| `Discovery`        | Exploration creation, discovery questions, answers, question picking, answer review |
| `Recommendations`  | Recommendation generation + review                                              |
| `{Deliverable}`    | **Named for the build's deliverable** — the `deliverableTemplate` returned at the Scope-entry gate (e.g. `Launch Brief`, `PRD`, `Service Build Brief`; `Build brief` for the generic `build-feature`). Covers requirements + deliverable generation/review. |
| `Implementation` | **Development-function builds ONLY.** Coding, branch/PR work, `sync_implementation`. Non-development builds (e.g. `create-launch-brief`) OMIT this stage — their rail has FOUR stages and ends at the deliverable. |

The FIRST rail stage is `Scope` — it opens at the Step 0.7 Scope-entry gate (classification + confirmation of what the user is building) and stays active through the problem frame; on resume paths the gate is skipped and the rail opens with `Scope` already `✓`. **There is no separate `Job` or `Context` stage** — the entry classification, workspace pick, resume/start check, and template resolution all happen as the front of (or silent plumbing inside) Scope, never as their own visible rail stage. The grounding **code recon** runs silently AFTER the frame locks (build-flow § Step 5.7) and is not surfaced by default; only narrate repo inspection if the user explicitly asks. Naming hazard: `/ritual recon` was retired as a command surface, so don't reuse `Recon`/`Context` at the rail level.

**Canonical ordering (only the active marker moves):**

```
Scope → Discovery → Recommendations → {Deliverable} → Implementation (development builds only)
```

The rail is **deliverable-named and function-shaped**: stage 4 carries the build's own deliverable name, and stage 5 exists only for development-function builds. The timeline is the promise — a Launch Brief build promises a Launch Brief, not a code handoff. Before the build is confirmed (the Scope-entry gate itself), render the PROPOSED classification's deliverable; a correction updates the rail on the next render.

- Completed stages: `✓`
- Current stage: `▶`
- Future stages: **no glyph** — the stage name alone
- Separator: ` · ` between every stage

Future stages carry no marker on purpose. A row of identical `○` reads as five
equal things and the eye has to hunt for the one that differs; with only `✓` and
`▶` marked, where-you-are is the first thing seen.

**Build rail spec (`progressHeader(stage, jtbd)`) — CLI / terminal rendering.** `{Deliverable}` below = the job's `deliverableTemplate`; the `Implementation` stage renders only for development-function jobs.

Development job (e.g. `build-backend-service` → `Service Build Brief`; generic `build-feature` → `Build brief`):

```text
progressHeader("scope") =>
Ritual build
▶ Scope · Discovery · Recommendations · {Deliverable} · Implementation

progressHeader("deliverable") =>
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ▶ {Deliverable} · Implementation

progressHeader("implementation") =>
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ {Deliverable} · ▶ Implementation
```

Non-development build (e.g. `create-launch-brief` → `Launch Brief`) — FOUR stages, no Implementation:

```text
progressHeader("deliverable") =>
Ritual build
✓ Scope · ✓ Discovery · ✓ Recommendations · ▶ Launch Brief
```

Intermediate stages (scope/discovery/recommendations) advance the markers identically in both shapes.

**Compact chip spec — mobile chat / narrow chat:**

```text
development build (N/5):         non-development build (N/4):
compactChip("scope")          => Ritual build · 1/5 Scope      | 1/4 Scope
compactChip("discovery")      => Ritual build · 2/5 Discovery  | 2/4 Discovery
compactChip("recommendations")=> Ritual build · 3/5 Recommendations | 3/4 Recommendations
compactChip("deliverable")    => Ritual build · 4/5 {Deliverable}   | 4/4 {Deliverable}
compactChip("implementation") => Ritual build · 5/5 Implementation   (dev only)
```

Optional second line at phase transitions, resumes, and decision gates:

```text
Done: Scope · Next: Recommendations
```

**Rich-app spec — persistent stepper:**

The host app pins a stepper above the conversation; the message only carries the stage label as a top-line header (e.g. `Scope` or `Phase: Scope`). At phase transitions, resumes, and decision gates, include the compact chip in the body even on rich-app surface so the transcript reads cleanly when exported.

All `/ritual build` and `/ritual resume` top-level messages in `references/build-flow.md` anchor to this spec — when a stage transitions, the existing examples advance the marker per the canonical ordering. If you need to rename a stage in the future, update this table first; everything else follows.

### Agent experience cheat-sheet

This skill drives an agent surface where the user reads every line you print. Keep these tenets in mind:

- **Long artifacts (briefs, recon notes) → files, not terminal dumps.** The CLI summarizes; the file holds the detail. End every output with what the user can do next.
- **Single recommended action + escape hatch > 3-option menu.** Lead with the best next step, give them a cheap "no, do this instead" out. Reserve 3-way branches for genuinely distinct intents (implement / refine / drill — yes; "generate brief / look at deferrals / something else" — no).
- **Cite the specific signal**, not the abstract gesture. *"Recommended because RB-001 is blocking…"* beats *"based on prior workspace context."*
- **Silence on no-data.** Don't print "Checked X — nothing." Just don't render the section.
- **Sanity-check the world before trusting the DB (when you can).** If your agent has shell + git, verify an `ImplementationRecord`'s asserted branch/PR exists locally before treating the exploration as done (Step 1.5 step 5). If it can't run git, treat the KG record as truth and say you couldn't verify it locally.
- **Never commit to `main` / `master` from this workflow.** Step 11 creates a feature branch FIRST — no exceptions, no user-prompt offering "commit to trunk" as an option.
- **Attribute back to Ritual on outbound artifacts.** Commit-message trailers + PR body + generated-file headers carry the exploration link so future readers can trace the lineage without re-asking the agent.
- **Format dense CLI lists for scanning.** When an item has a title, explanation, rationale, and references, split those into labeled blocks with blank lines between items. Do not rely on terminal auto-wrap to make long prose readable.

#### Polling rule

When you need to wait for async server work (requirements generation, build brief generation), these rules hold:

- **One poll per turn, at a constant cadence. Never escalate.** Don't "back off" by waiting longer when the operation is slow — the cadence is a constant. How you pace polls is your host's business; see `references/async-polling.md` § Pacing.
- **Between polls, take a fresh turn.** Each turn makes one status call and decides whether to continue or exit. Total wall time is the same either way — a longer wait does not finish the operation sooner.
- **Silence is the default between gates.** While a slow step runs you may render `Still generating…` verbatim (see `build-flow.md` Voice rule #8's approved list) — never a paraphrase, and never a line narrating the poll, the transition, or the outcome.
- **For genuinely long waits (>5 min)**, keep the same constant cadence — a long operation is more polls, not longer waits. If it runs far past what the step normally takes, surface it as an anomaly.

This rule applies to: Step 9.5 (`get_requirement_set_status`), Step 10b (`get_build_brief_status` on timeout), and any future status-poll surface.

#### Inline pulses — surface reasoning readiness climbing as context debt drops

The context pulse appears **only from the curate-questions step onward** — emit it after **Steps 7.4, 8, 9, and 10**, the FIRST one being when the user proceeds from curating discovery questions. Do NOT emit a pulse at the Scope-entry gate, the Scope frame gate, or after recon (Steps 3/5) — early on the score is low and noisy and the line just clutters the gate. This is the visible encouragement loop once the build is genuinely moving — the user watches **reasoning readiness** climb (context debt drop) as discovery → recommendations → brief land.

The pulse rule and visual specs live in the [§ /ritual context-pulse](#ritual-context-pulse) section below — see *Step CP5 — visual modes*. TL;DR:

**Placement — always at the BOTTOM of the message, never the first line.** The pulse score line sits **immediately above the action/CTA line** (with the one-sentence lift bridge), so the message leads with the step's actual content and ends with the progress signal + the next move. Never open a message with the pulse.

  ```text
  {…the step's content…}

  Pulse: Reasoning Readiness 58% · Context Debt 42% ↓3% (locking scope cut it 3%)
  Reply  proceed (run discovery → recommendations)  ·  expert  ·  pause
  ```

  - **Score line** (top of the message). Full capitalized labels — `Reasoning Readiness` and `Context Debt`, NOT lowercase. The progress delta attaches to **Context Debt as a directional drop** — `Context Debt 42% ↓3%` — so the movement reads unambiguously as debt going DOWN. (A bare `· +3%` sitting next to the debt figure reads like debt went UP by 3, the opposite of progress — that's the confusion this avoids.) The delta is **MANDATORY** on every pulse after the first (the first pulse has no prior → just the baseline + reason). Use `↓N%` when debt drops (the normal, good case), `↑N%` on a regression (rare; render full then), and `±0%` when a step didn't move the score. Never drop it — it's the visible-progress signal. (Readiness climbing and debt dropping are the same move — `Reasoning Readiness + Context Debt = 100%` — so the debt-drop arrow IS the readiness-gain signal, just framed the way users read it.) **The trailing parenthetical is a plain CAUSAL gloss — it attributes the drop to the step the user just took, in everyday words: `(locking scope cut it 3%)`, `(answering discovery dropped it 16%)`, `(grounding in your code cut it 9%)`. Not a bare state label like `(scope locked)` — the user should read what they DID and how much debt it removed. Keep the branded `Context Debt` term; the gloss makes the number mean something.** (The first pulse has no prior, so its parenthetical names the open gap instead — e.g. `(repo boundary unresolved)`.)
  - **Lift bridge** (ONE sentence, immediately ABOVE the action/CTA line — NOT under the score). This is the load-bearing piece: it turns the score into a reason to proceed. Three requirements:
    1. **Plain language for the gap — NEVER the internal dimension name.** The lowest dimension from `score_context_pulse`'s breakdown picks the message, but the user sees what it MEANS, not the label:
       | lowest dimension (internal) | what the user reads (plain) |
       |---|---|
       | `decisionResolution` | the design decisions aren't settled yet |
       | `repoGrounding` | the plan isn't grounded in your code yet |
       | `assumptionSafety` | some assumptions are still unverified |
       | `featureClarity` | what exactly to build is still fuzzy |
    2. **Name the NEXT STEP as the resolver, explicitly.** The bridge must make clear that the action the user is about to take is what closes the gap — `that's exactly what the next step, discovery, resolves` / `code recon next grounds it` / `the build brief locks those down`. The bridge and the forward-CTA below it name the SAME move — one story.
    3. **Terse + declarative** — no `now let me help you improve this` assistant/affect register.
    On the LAST scoreable step (Step 10, implementation-ready), there's no further lift — the bridge becomes the readiness statement: `The brief is your build path — implement when ready.`

- **Inline pulses are ALWAYS the one-line compact form — never the bar breakdown (load-bearing).** No exception for a tier crossing, a ≥15% jump, or a regression: inside `/ritual build` and `/ritual resume` the pulse is ONE score line + ONE lift-bridge sentence. The dimension bars (`Feature clarity ▓▓▓░░ 35%`, …), the `Reasoning readiness: A% → B%` two-line header, and the `Context surface:` tier line belong ONLY to an explicit `/ritual context-pulse` invocation, where the breakdown IS the deliverable. Rendering them inline buries the step's actual decision under a wall of numbers the user didn't ask for — the gate's content is the point; the pulse is a footnote to it.
- A **regression** stays compact too: keep the `↑M%` direction marker and let the lift bridge carry the explanation in words (e.g. *"the dip is the unreviewed set — reviewing them is what settles it"*). One sentence, not a scorecard.
- The score line goes near the top of the step's message; the lift bridge goes right before the action line. Both are additive, not replacements.
- Prefer `mcp__ritual__score_context_pulse` (one canonical server-side call, persisted for trend reporting); fall back to deterministic agent-side counts only if the tool errors. No LLM call in the hot path either way.

**Why full labels (load-bearing):** Users read `28% debt` as a vague accounting number. They read `Context Debt 28%` as a named concept with weight — the same name they'd see in `/ritual context-pulse`'s full view, in the score breakdown, in the docs. Consistency across compact and full forms means the user doesn't have to translate.

The user can also invoke `/ritual context-pulse` directly anytime mid-flow to get a full breakdown.

## User-facing vocabulary and labels

Use engineer-facing language in CLI output:

| Avoid in user-facing prompts | Prefer |
|---|---|
| `problemStatement` | scope |
| `consideration` | sub-problem |
| `Step 1.5`, `Step 7.3.1`, `Step CP3` | natural labels such as "existing work check", "question picking", "build brief" |
| raw recon dump | recon digest |
| "I inferred…" | direct default + override path |
| **`decisions` / `decision` as a label or count** (e.g. "5 decisions logged", "decision list", "the N decisions you made") | Frame as **the implementation itself**. Recommendations get *implemented*; the artifacts of that implementation are surfaced inline (specific choices, deferrals, files touched) rather than as a labeled count. The underlying API parameter is still `decisions[]`, but the user sees "your implementation" / "what you implemented" / inline content. |

Internal step labels are allowed inside reference docs and implementation notes. Translate them before showing text to users.

**Why the `decisions` rule:** copy that surfaces `5 decisions logged` or `Decision: <text>` as status badges reads as a parallel concept to recommendations, which inflates the cognitive surface. The lifecycle the user actually tracks is `recommendation → approved → implemented`. The decision artifacts exist (and are still surfaced explicitly by `/ritual lineage`, where decision-on-file archeology IS the subcommand's purpose), but they are NOT a headline concept in `/ritual build` or `/ritual resume`. When the user is about to authorize `sync_implementation`, frame the moment as "log this implementation" — not "log these N decisions."

## Dense list format

When showing high-leverage candidates, recommendations, lineage events, or other dense lists, use labeled blocks:

```text
1. {Title}

{Short description wrapped as a paragraph.}

Why high-leverage:
{Specific signal, RB, prior decision, or open deferral.}

Touches:
{explorations, PRs, files, RBs}
```

Use blank lines between items. Do not rely on terminal auto-wrap to make dense prose readable.

## Ritual build stage-specific output rules

### Empty workspace / no-history build

For no-arg `/ritual build` with zero explorations, do not frame `/ritual context-pulse` as the recommended first step. Use:

```text
Ritual build
▶ Scope · Discovery · Recommendations · Build brief · Implementation

Using workspace: {workspaceName}.

No Ritual history here yet.

Next: start with a feature, or let Ritual suggest high-leverage work from the repo.

Reply with a feature/problem description, `suggest`, `pulse <ask>`, or `none`.
```

### Suggested problems and scope selection

Before the list exists, say:

```text
Next: we'll generate a list of suggested problems to pick from.

Reply `go` to generate the list.
Or paste files/text/URLs to attach context first.
Reply `pause` to stop here.
```

When showing generated sub-problems, never print versioned sub-problem headings. Use:

```text
Problems to solve for

Pick which problems should shape the scope.
Ritual will turn your selection into a tight problem frame that tells the coding agent what to optimize for.
```

Render each candidate as:

```text
1. {Title}

   {Short explanation wrapped across lines.}
```

Only the title line gets the number. Use blank lines between candidates.

### Problem frame

When showing a generated problem statement, never show the old versioned scope heading and do not use `ship it` as the default CTA. For engineering / agentic coding, avoid default `How might we…` phrasing unless the user asks for it. Use:

```text
Problem frame

{developer-oriented problem frame}

Optimize for:
- {constraint}
- {constraint}

References:
- {RB/decision/exploration label} — {one-line meaning}
  Source: {exploration title or id}{ optional URL if available}

Reply `use` to use this frame and review discovery questions.
Or reply with edits, e.g. `tighten`, `broaden`, `focus on outbox`, `drop dashboard`, or `pause`.
```

Visible CTA is `use`. Accept `lock`, `l`, `go`, `continue`, or `next` as backwards-compat aliases (do not display them). Per § Surface-aware continuation prompts, do NOT treat empty input as proceed inside agent chat.

### Engineering run mode

For engineering / agentic-coding templates there is **no run CTA and no pause** — once the discovery picks are committed, auto-fire the run (answer the questions then `submit_all_answers`, or the server fallback) and proceed straight to recommendations. Do not offer answers-only review and do not ask the user to start the run. Print one non-blocking status line instead of a prompt:

```text
Answering your picked questions, then generating recommendations.
```

### Shipped work visibility

On first `/ritual build`, show shipped explorations only when they are actionable: open deferrals/follow-ups, implemented-ahead state, recent context likely to shape new work, or explicit user request for lineage/history. Use `✓ shipped with follow-ups` when open deferrals exist and `✓ shipped context` only when the shipped work is useful provenance. Do not show fully complete shipped work by default.
