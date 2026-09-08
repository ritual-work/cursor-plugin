## /ritual context-pulse

**"Can a reasoning system act safely on this yet?"** The user gives the agent a feature description (free-form) OR an exploration id, and the agent computes a **Context Pulse** — a score that makes "context debt" visible and asks the right question for an AI-first world: *can the interpreter (model, agent, or developer) reason from what's here, or will they have to invent consequential facts?*

The pulse surfaces three companion concepts:

| Term | What it measures | Where it shows up |
|---|---|---|
| **Reasoning Readiness** | How safely an intelligent interpreter can understand the task, inspect the environment, make decisions, and act without inventing consequential facts. The primary score. | Full-pulse output label; framing in section prose. |
| **Context Debt** | The inverse — consequential uncertainty remaining because the reasoning surface is incomplete, stale, ambiguous, or weakly grounded. | Output label; product category; command name. |
| **Context Surface Quality** | The 5-tier classification of where the user stands today (Raw ask / Under-specified / Exploration-safe / Recommendation-ready / Implementation-ready). | State label in full-pulse output. |

The product category is **Context Debt** (debt drives the pitch — *AI made outputs easy, but drift and rework exploded; Ritual reduces context debt before it slows you down*). The primary measurement label is **Reasoning Readiness** — because the goal isn't context for its own sake, it's whether a reasoning system can act correctly on what's there.

Output: a readiness / debt score (0–100, dual framing — debt goes DOWN as readiness goes UP) plus a context-surface tier, a per-dimension breakdown, the top debt sources, and one recommended next action.

The same scoring engine also fires **inline during `/ritual build`** after each major step, so the user watches the debt drop as they pay it down. That's the encouragement loop — see [§ Inline pulses in `/ritual build`](#inline-pulses-in-ritual-build) below.

### Why this exists

The Ritual product pitch in one line: *AI made outputs easy, but drift and rework exploded. Ritual's discovery-to-recommendations workflow builds clarity before context debt slows you down.* The pulse makes that pitch **visible** — the user sees the debt being paid down with each step.

Framing inspired by Karpathy's observation that *context is the programming surface for an intelligent interpreter*. The right question is not "is the context complete?" — context can always be more complete. The right question is *"is the context **good enough for the interpreter to act correctly without inventing consequential facts**?"* Reasoning Readiness is that bar.

Output principles this serves:
- **State must be legible without being noisy.** The pulse is the score; the breakdown is the drill-down.
- **Cite the specific signal.** Top-debt-sources point at concrete gaps (missing acceptance criteria, no anti-goals declared, etc.).
- **Next step is part of every output.** Each pulse ends with one recommended action.


### When to use

- **Pre-build**: *"is this feature ask ready for `/ritual build`, or do I need to frame more first?"* — score against a free-form description.
- **Mid-flow**: *"I've answered some discovery questions, where am I now?"* — score an existing exploration in progress.
- **Hand-off check**: *"someone left me an exploration — what's the current grounding state?"*
- **Pre-implementation sanity check**: *"the brief is generated. Is this implementation-ready, or are there hidden gaps?"*

When **not** to use:
- The user wants to actually start work → `/ritual build`.
- The user wants to see prior file history → `/ritual lineage`.
- The user wants a workspace tour with no specific files in mind → just ask the agent in plain English (no slash-command needed).

### Modes

The pulse operates in one of four distinct modes, each with different scoring inputs and different recommended actions. The agent picks the mode by classifying the input at Step CP1.

| Mode | Invocation | What "current codebase" is worth |
|---|---|---|
| **A. Naked** | `/ritual context-pulse` with no args, no session context, no in-flight exploration | Codebase is **table stakes** — having one doesn't move the score for a feature that hasn't been described. Score is near zero (just whatever workspace knowledge graph counts toward Repo Grounding). Recommended action: *"Give me a feature description, or run `/ritual build`."* |
| **B. Cold-call feature** | `/ritual context-pulse Add billing export for workspace admins` (description, no matching exploration) | The agent maps the description to the codebase + knowledge graph, finds candidate files and prior decisions, and offers to seed `CONTEXT-<feature>.md` as a pre-build context file. The mapping work is what moves Repo Grounding — the codebase only counts once it's been **mapped to THIS feature**. |
| **C. Existing exploration** | `/ritual context-pulse exp-7a2b9c` (exploration id) OR `/ritual context-pulse "Conversion attribution"` (name lookup) | Fetch state, score against current data. The standard path. |
| **D. Inline** | Hook lines fired automatically inside `/ritual build` (Steps 7.4, 8, 9, 10 — see `cli-output-contract.md` § Inline pulses, the source of truth for in-flow rendering) | Computed per-step delta against the prior pulse for the same exploration. |

### Workflow

#### Step CP1 — Resolve input (progressive fallback for no-arg invocations)

Classify the input:

1. **If args present and they look like an exploration id (UUID-like) or match an exploration name in `list_explorations`:** Mode C. Fetch state.
2. **If args present and they don't match any exploration:** Mode B. Treat as a free-form feature description.
3. **If no args:** progressive fallback —
 - **Step 1a:** Is the user actively discussing one exploration this session? If yes, use it silently (surface what was picked: *"Pulsing exploration '{name}'…"*). Mode C.
 - **Step 1b:** Otherwise, call `list_explorations(workspace_id)`. Any in 📍 / 💬 / ✅ / 🛠 state? If exactly one, use it. If 2–5, show a numbered picker. Mode C.
 - **Step 1c:** Cold start (workspace has nothing in flight): Mode A. Prompt: *"No in-flight explorations. Pulse a feature ask instead? Describe the feature you're considering, or run `/ritual build`."*

The agent **always surfaces what it picked** (cite the specific signal). The user always knows whether they're pulsing the right thing; easy escape: `/ritual context-pulse <other>` to override.

#### Step CP1.5 — Mode B: seed a pre-build context file

This is the upgrade path. When Mode B is classified (feature description, no exploration), the agent does the codebase mapping that would otherwise happen in `/ritual build` Step 3 — but BEFORE the user has committed to building. The output is a markdown file that `/ritual build` picks up automatically when run.

Sub-steps:

1. **Light code recon based on the feature description.** Extract keywords from the description (nouns / verbs / domain terms). Glob for matching paths. Read 3–5 candidate files briefly. Build a candidate `sources[]` array (~3–8 paths).

2. **knowledge graph query for prior context on candidate files.** Call `query_knowledge_graph(workspace_id, sources=[candidate paths])`. Note any prior decisions, open deferrals, or implementations on these files.

3. **Score the mode-B pulse** using the standard 4-dimension formula. Repo Grounding will be the dominant contributor since this is the only dimension that can move pre-exploration. Decision resolution = 0 (no recs/discovery yet). Feature clarity scores against the description text the user gave. Assumption safety = 0 (no anti-goals yet).

4. **Surface the pulse + the mapping result.** Use the full pulse visual (CP5 below) because Mode B always crosses some tier ground — and surface a "found in this workspace" callout for what the knowledge graph returned:

 ```
 Reasoning readiness: 22%
 Context debt: 78%
 Context surface: Raw ask

 Feature clarity ▓▓░░░░░░░░ 20% (description present; no acceptance criteria)
 Decision resolution ░░░░░░░░░░ 0% (no recs / no discovery yet)
 Repo grounding ▓▓▓░░░░░░░ 30% (4 candidate files + 2 prior knowledge graph decisions)
 Assumption safety ░░░░░░░░░░ 0% (no anti-goals declared)

 Found in this workspace that's relevant:
 • Exploration "Anonymous checkout opt-in" (shipped) — decision on
 permission scoping, applies to admin-export
 • Exploration "Payment-method routing" (shipped) — CSV export pattern
 in the Ritual monorepo
 • Open deferral RB-7 "rate-limit per-tenant on exports" (major) —
 may collide with this feature
 ```

5. **Offer to seed `CONTEXT-<feature-slug>.md`.** Single-action proposal:

 > Want me to seed this as a starter context file? `CONTEXT-billing-export.md`
 > will capture: your ask + the 4 candidate files + the 2 prior knowledge graph decisions
 > + the deferral. `/ritual build` will pick it up at Step 3 and skip
 > recon. Pre-loads context — debt should drop ~20-30% before discovery
 > even runs.
 >
 > Got any PRDs, tickets, designs, or chat excerpts you want me to
 > attach as knowledge sources too? Drag them in or paste paths/URLs.
 >
 > (y / add some refs first / refine the description first / no)

 - **y** → write `CONTEXT-<slug>.md` to repo root using the template below. Tell the user the path. End with: *"Open in your editor? (y/N)"*.
 - **add some refs first** → enter the same flow as `/ritual build` Step 3.5: collect content via `Read` / `WebFetch` / pasted text, detect `source_content_type` per item, hold the refs in session memory. Once an exploration eventually exists (via `/ritual build`), call `add_knowledge_source` for each. For PRE-EXPLORATION pulses where no exploration exists yet, just acknowledge what was provided + note that registration happens when the user proceeds to `/ritual build`. Each ref attached bumps Repo Grounding by +5 (cap +15 from refs) in subsequent pulses.
 - **refine the description first** → ask what to adjust, loop back to CP1.5 step 1 with the refined description.
 - **no** → end the pulse here. No file written.

6. **`CONTEXT-<slug>.md` template:**

 ```markdown
 <!-- Ritual context seed — generated {ISO date} -->
 <!-- Refreshed at {ISO datetime UTC} --> <!-- updated every re-pulse; bias toward freshness -->
 <!-- Generated by /ritual context-pulse "{feature description}" -->
 <!-- Pulse: Reasoning Readiness {readiness}% · Context Debt {debt}% — surface: {state-tier} -->

 # Context: {feature description}

 ## The ask
 {feature description, verbatim}

 ## Candidate files (auto-mapped from this ask)
 - {path 1} # {one-line purpose, from agent's recon}
 - {path 2} # {…}
 - …

 ## Prior knowledge graph context
 {for each prior decision on candidate files:}
 - **"{exploration name}"** (shipped {date}, PR #{num})
 Decision: {decision.choice}
 {endfor}

 {for each open deferral on candidate files, with severity:}
 - ⚠ Open deferral {rbId} ({severity}): "{description}"
 from "{exploration name}" — may collide with this feature.
 {endfor}

 ## Open questions for /ritual build to address
 {1–3 questions the agent inferred from gaps in the description,
 e.g. "Data source: which table is the source of truth?",
 "Permission tier: admin-only or delegated?"}

 ---
 Next: run `/ritual build "{feature description}"`. Step 3 will detect
 this file and skip fresh recon — readiness should jump 20-30% before
 discovery even runs.
 ```

**Slug naming:** kebab-case from the feature description, ≤ 40 chars. *"Add billing export for workspace admins"* → `billing-export`. The agent picks the slug; if there's a collision with an existing `CONTEXT-*.md` for a DIFFERENT ask, append a short suffix (`-v2`, or a 4-char hash).

**Overwrite policy** — bias toward freshness, not preservation. The knowledge graph can move between pulses (another developer ships an implementation, an admin sets new anti-goals, a deferral closes), so a seed older than ~hours is potentially stale on important signals. Default behavior:

- **Same ask, re-pulse (the common case)**: **always auto-refresh, never prompt.** Write a `<!-- Refreshed at YYYY-MM-DDTHH:MM:SSZ -->` HTML comment at the top of the file so the freshness is visible in the file itself. Add a `(refreshed — was N minutes/hours/days old)` parenthetical to the agent's output line so the user sees the staleness signal:

 > ✓ Refreshed `CONTEXT-billing-export.md` (was 4 hours old — 2 new knowledge graph decisions and 1 new deferral surfaced this time)

 The "what changed" callout is high-value when the seed is non-trivially old (≥ 1 hour). If < 5 minutes old, just note "refreshed (was X min old)" without the diff narrative.

- **Different ask, slug collision** (rare): ask the user before overwriting (confirm before a destructive overwrite). Three single-action options:
 > ⚠ `CONTEXT-billing-export.md` already exists with a different ask: *"{prev ask first 80 chars}"*. Your new ask: *"{new ask first 80 chars}"*.
 > (a) Overwrite the existing seed
 > (b) Save the new one as `CONTEXT-billing-export-v2.md`
 > (c) Cancel — show me the existing file first

- **No collision**: write the new seed silently.

**Why bias toward freshness:** the seed is *staging context for an imminent build*, not a long-term artifact. Once the seed gets consumed by `/ritual build` Step 3.0, it gets promoted to `.ritual/exploration-notes/<exploration-id>.md` (Step 6.1) where it becomes immutable history. While it's still at the repo root as `CONTEXT-*.md`, it's a working file and should reflect the *current* state of the world.


#### Step CP2 — Score the pulse

##### Preferred path: server-side canonical scoring

Call **`score_context_pulse`** — one canonical call computes every dimension, persists the row for trend reporting, and returns the full response shape the SKILL renders at CP5. XOR input: pass exactly one of `exploration_id` OR `feature_description`. For `feature_description` pulses, also pass `workspace_id`. Always pass `sources` (file paths the agent identified during recon) when known — that's what drives Repo Grounding.

```
score_context_pulse({
 exploration_id: "exp-7a2b9c", // OR feature_description: "Add billing export..."
 workspace_id: "ws-...", // REQUIRED when feature_description is set
 sources: ["src/billing/views.py", "src/billing/serializers.py"]
})
```

Response (renders directly via CP5):

```json
{
 "id": "cp-...",
 "readiness": 72,
 "debt": 28,
 "surface": "RECOMMENDATION_READY",
 "breakdown": { "featureClarity": 60, "decisionResolution": 85, "repoGrounding": 75, "assumptionSafety": 50 },
 "topDebtSources": [
 { "dimension": "assumption_safety", "reason": "No anti-goals declared yet." }
 ],
 "nextAction": "Generate the build brief. Run now? (y/N)",
 "readinessDelta": 24,
 "primaryDimensionMoved": "decision_resolution",
 "computedAt": "2026-05-12T09:51:00.000Z"
}
```

Skip CP3 entirely on the preferred path — the server returns identical fields (same formula, same weights). CP3 is the **fallback specification** below.

Freshness rule: user-invoked and inline pulses should request fresh scoring by default. Reuse a persisted pulse only when the input hash is identical, `computedAt` is recent enough for the mode, and no exploration state relevant to scoring changed since computation. If the tool exposes a `force`, `fresh`, or equivalent flag, use it when freshness is more important than cache reuse.

##### Fallback path: agent-side computation

If `score_context_pulse` errors (network, server down, bearer token expired) **OR** the MCP server doesn't expose the tool (older deployments), fall through to the agent-side path. Used by Modes B / C / D. (Mode A skips this — it has no input to score against.)

Call existing MCP tools:

- `get_exploration(exploration_id)` — for problem statement + anti-goals + metadata
- `get_recommendations(exploration_id)` — for status counts (accepted / pending / rejected / draft)
- `get_discovery_state(exploration_id)` — for question count + answered count
- `query_knowledge_graph(workspace_id, sources=[paths])` — for repo grounding signals (implementations / decisions / deferrals overlapping the exploration's `sources`)
- `list_knowledge_sources(exploration_id)` — for the count + extraction status of attached non-code knowledge sources (PRDs / TICKETs / TRANSCRIPTs / etc.). Contributes to Repo Grounding per CP3.
- Agent's own filesystem tools (Glob / Read) — for recon depth signal

All read-tier. No LLM cost unless the user passes `--explain` (future).

#### Step CP3 — Fallback scoring only

Skip this step when `score_context_pulse` succeeds. Server-side scoring is canonical for all new pulses.

Use `references/scoring-fallback.md` only when the MCP server errors, is unavailable, or does not expose `score_context_pulse`. New pulses should use the current canonical model returned by the server. Legacy scoring models are read-only context for old persisted rows, not active guidance for new scoring.


#### Step CP5 — Pick the visual mode + render

Two visual modes, picked by context. The label terminology is tiered:

| Term | Where it's used | Why |
|---|---|---|
| **Reasoning Readiness** (full) | Full-pulse top labels; section prose | The primary metric — "can the interpreter act safely?" |
| **readiness** (lowercase, short) | Compact one-liner | Same metric, abbreviated for line-length ergonomics |
| **Context Debt** | Both modes — inverse score | The product category framing |
| **Context surface:** | Full-pulse state-tier label | The 5-tier classification (Raw ask / Under-specified / Exploration-safe / Recommendation-ready / Implementation-ready) |

**Compact pulse** — single line, used by default for inline mid-`/ritual build` pulses when nothing dramatic happened this step. Uses the full capitalized labels (NOT shorthand) for consistency with the full pulse and the docs:

```
Pulse: Reasoning Readiness 72% · Context Debt 28% · +24% (decision resolution)
```

**Full pulse** — with bars + spelled-out labels. Used for **exactly one** case:
- The user invoked `/ritual context-pulse` directly (the breakdown IS the deliverable there).

**Never inline.** Pulses emitted from inside `/ritual build` / `/ritual resume` are ALWAYS the compact one-liner — including on a tier crossing, a ≥15% jump, or a regression. Those used to trigger full mode; they no longer do (the bar wall buried the gate's actual decision). The inline rule is owned by `cli-output-contract.md` § Inline pulses — that file is the source of truth for in-flow rendering; this section owns only the standalone command.

```
Reasoning readiness: 48% → 72% (+24%)
Context debt: 52% → 12% (-40%) (4 questions unreviewed)
Context deferred: — → 16% (12 questions phase-2 candidates)
Context surface: Recommendation-ready

 Feature clarity ▓▓▓▓▓▓░░░░ 60%
 Decision resolution ▓▓▓▓▓▓▓▓▓░ 85% (current scope; 12 phase-2 deferred)
 Code grounding ▓▓▓▓▓▓▓░░░ 70%
 Reference grounding ▓▓▓▓▓░░░░░ 50%
 Assumption load 30% (lower is better)
 Validation readiness ▓▓▓▓▓▓▓░░░ 70%

You're past the recommendation-ready threshold. Generate the brief? (y/N)
```

Render rules:
- **Always show reasoning readiness + context debt at the top** (dual framing — the product pitch is about debt going down, but the primary score is the readiness one).
- **State-tier (Context surface) is a separate explicit line** in the full pulse, not folded into the readiness number — so the user can see both the percentage AND its qualitative meaning at a glance.
- **Bars are 10-cell `▓` / `░`**, rounded to the nearest 10%.
- **Dimensions printed in fixed weight order.** For `dimensionsVersion=2` (current canonical): Feature clarity → Decision resolution → Code grounding → Reference grounding → Assumption load → Validation readiness. For `dimensionsVersion=1` (legacy back-compat): Feature clarity → Decision resolution → Repo grounding → Assumption safety.
- **Lead framing flexes by tier**:
 - 0–50% readiness → prose leads with debt going down (*"context debt dropped 24% this step"*)
 - 50–80% readiness → balanced (*"now at Recommendation-ready surface, context debt at 22%"*)
 - 80+% readiness → prose leads with readiness arrived (*"reasoning readiness now 92%, safe for an interpreter to act"*)
- **Top debt sources** (1–3 lines, only on full pulses + ad-hoc invocations): the dimensions that scored lowest, with one-line explanations citing specific gaps.

#### Step CP6 — Next-action prompt

End every pulse with one recommended next step + a cheap escape hatch. Anchor the recommendation to the tier:

| Tier | Recommended next action prompt |
|---|---|
| Raw ask | *"Frame this with `/ritual build "<your-description>"`; scoping will pull debt down on its own. Run now? (y/N)"* |
| Under-specified | *"You're framed but discovery is thin. Continue discovery? (y/N)"* |
| Exploration-safe | *"Recommendations next — start the agentic run? (y/N or pulse again after acceptance)"* |
| Recommendation-ready | *"Generate the build brief. Run now? (y/N)"* |
| Implementation-ready | *"You're past the bar. Implement (Step 11)? Or run a final pulse after coding to confirm context still holds?"* |

### Tools used

**Preferred path:** one tool does everything.

1. `score_context_pulse` (CP2 — canonical server-side scoring; persists to `context_pulses` for trend + delta)

**Fallback path:** read-tier subset of `/ritual build`'s tools, used when `score_context_pulse` errors or the MCP server doesn't expose the tool.

1. `get_exploration` (CP2 fallback — problem statement + anti-goals + metadata)
2. `get_recommendations` (CP2 fallback — rec status counts)
3. `get_discovery_state` (CP2 fallback — question + answer counts)
4. `query_knowledge_graph` (CP2 fallback — repo grounding signals)
5. `check_anti_goals` (CP2 fallback — assumption safety)
6. `list_explorations` (CP1 — resolving names to exploration ids; used in both paths)
7. Agent filesystem tools (`Glob`, `Read`) — for recon-depth signal in CP2 fallback

**Canonical scoring lives server-side.** The SKILL prefers `score_context_pulse` (one call, one source of truth, persisted to `context_pulses` for trend reporting and `readinessDelta` computation). The agent-side path above is the **fallback** for older MCP servers / transient failures.

Not yet available (do not reference in renders): an `--explain` narrative flag, `--compare before.json after.json` diffs, and profile-aware weights.

### Inline pulses in `/ritual build`

The same scoring engine fires after each significant `/ritual build` step. The user watches the debt drop step-by-step — that's the encouragement loop that keeps them moving through the build flow instead of shortcutting to code-generation.

The inline rule is owned by `cli-output-contract.md` § Inline pulses — that file is the source of truth. Summary: the pulse fires after **Steps 7.4, 8, 9, and 10** (the first when the user proceeds from curating discovery questions; never at the Scope gates or after recon), and every inline pulse is **always the compact one-liner** — the full bar breakdown belongs only to a direct `/ritual context-pulse` invocation.

Each pulse line replaces no other output — it's added BEFORE the existing "next step" prompt for that step. So a user reading the chat sees: *(step output) → (pulse line) → (next step prompt)*.

### Relationship to `/ritual build`

The standalone `/ritual context-pulse` and inline pulses share the same scoring code, just different render modes (compact vs full) and different trigger points (user-invoked vs automatic). One source of truth for the formula; two surfaces for the user.

### Future context-pulse extensions

Already shipped:
- Server-side canonical scoring via `score_context_pulse`
- Persistence to `context_pulses`
- `readinessDelta` for trend/delta reporting

Future extensions:
- `--explain` — LLM narrative on top debt sources
- `--compare before.json after.json` — diff two pulses
- Profile-aware weights for security-sensitive, billing-sensitive, migration-heavy, or AI-agent-heavy work
- Contradiction-risk scoring when an LLM call is acceptable
