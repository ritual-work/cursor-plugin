## /ritual lineage

**"Show me the history on these files."** The user gives the agent a file path (or a directory, or a set of paths) and the agent surfaces every prior exploration, recommendation, decision, and deferral that touched those files — pulled from the workspace's knowledge graph.

Output: a per-file timeline of decisions + deferrals + the explorations they came from, with PR numbers + dates + status snapshots. The user reads this **before** they make code changes to avoid re-litigating a settled decision or re-introducing a known deferral.


### When to use

- Engineer is about to touch a file they don't know the history of — *"who's been here? what did they decide? what did they punt?"*
- Code review: reviewer wants to know the lineage of a suggested change.
- Onboarding: new engineer wants to understand why a module exists in its current shape.
- Pre-implementation: planning a refactor; want to surface deferrals that might block the new approach.

When **not** to use:
- The user wants to start a new exploration → that's `/ritual build`.
- The user wants a workspace-wide tour (no specific files in mind) → just ask the agent in plain English; the codebase + knowledge graph are reachable via the standard MCP read tools (`list_explorations`, `query_knowledge_graph`, etc.).

### Input shapes

The lineage flow accepts paths several ways — pick the one that best matches what the user provided:

| What the user gave you | What to do |
|---|---|
| `lineage src/checkout/views.py` | Single explicit file path |
| `lineage src/checkout/views.py src/oscar/apps/order/models.py` | Multiple explicit paths |
| `lineage src/checkout/` | Directory — `Glob` it for source files (cap at ~20 to keep the query bounded) |
| `lineage` (no arg) | **Infer from context.** Use, in order: (a) files the user has been discussing this session, (b) files in their most recent `git diff HEAD~1..HEAD` or `git status`, (c) ask the user explicitly |
| `lineage <pasted file contents>` | The user pasted code, not a path. Try `Grep` for a unique-looking signature line to locate the file, OR ask which file it's from |

For the "no arg" case, surface what you're going to query before you query it:

> I'll look up lineage on these files (from your recent edits):
> - `src/checkout/views.py`
> - `src/oscar/apps/order/models.py`
> - `src/oscar/apps/order/utils.py`
>
> Proceed? **(y / change the list / abort)**

One recommended action, single escape hatch.

### Workflow

#### Step L1 — Resolve files

Given the user's input shape, produce a final `sources[]` array of file paths. Normalize relative-to-repo-root (the knowledge graph stores paths that way).

If the list ends up empty (e.g. directory glob matched nothing, or the user's pasted code can't be located): surface a clear message and exit — *"I couldn't resolve any files to look up. Try giving me an explicit path."*

#### Step L2 — Query the knowledge graph

Call `query_knowledge_graph(workspace_id, sources=[paths])`. This is the same tool `/ritual build`'s Steps 4 / 5 / 10 use for knowledge graph injection — the difference here is the user-facing output is the QUERY RESULT, not silent priorContext.

The response shape includes:
- `decisions[]` — each with `area`, `choice`, `sourceRecommendationId`, `recommendationStatusAtImplementation`, `relatedFiles[]`, `createdAt`, `explorationId`, `explorationName`, `prNumber`/`prUrl` (from the linked `ImplementationRecord`)
- `deferrals[]` — each with `rbId`, `description`, `severity`, `reason`, `relatedFiles[]`, `createdAt`, `explorationId`, `explorationName`, `status` (open / addressed / dismissed)
- `implementationCount` — totals per file (handy for the summary line)

Read-tier, no LLM cost. Snappy (single DB query).

#### Step L3 — Render the per-file timeline

Start with a next-action summary header, not a count-first dump:

```text
Lineage found on {files_with_lineage}/{total_files} files.

Next: check whether prior decisions or open deferrals constrain this change.
Signal: {F} open deferrals and {D} prior decisions touch these files.
Meta: {I} prior implementations, only if useful.
```

Omit zero-valued metadata except when all counts are zero. If there are no open deferrals, say: `Signal: no open deferrals found on these files; use prior decisions as guardrails.`

For each file in `sources[]`, render a compact timeline:

```
src/oscar/apps/checkout/views.py
 · — Decision: gateway-form branching (RB-6)
 from "Guest checkout → registration attribution"
 an earlier change · status when shipped: approved
 · — Deferral: rate-limit per-tenant [major]
 from "Multi-tenant rate limiting"
 Open · 14 days old · "out of scope for v1; revisit when traffic >100req/s/tenant"
 · — Decision: session-cookie checkout state
 from "Anonymous checkout v1"
 an earlier change · status when shipped: approved

 Touched by 1 open deferral · 2 logged decisions

src/oscar/apps/order/models.py
 · — Decision: snapshot vs FK on order.user
 from "Guest checkout → registration attribution"
 an earlier change · status when shipped: approved

 Touched by 0 open deferrals · 1 logged decision

src/oscar/apps/order/utils.py
 · (no lineage logged — this file hasn't been touched by a Ritual exploration yet)
```

Rules for the output:

- **Sort each file's events newest-first.** Engineers care most about the latest decision.
- **One-line-per-event in the listing**, with a 1-line "rationale" or "reason" subline only when present and short. Don't paste full RB descriptions inline — surface the headline and let the user drill in if they want.
- **Cap each file at the 5 most recent events.** If there are more, add a footer: *"… 8 more events on this file. Drill in? (y/N)"*. Surface only on user request.
- **Silence on no-data per file** — if a file has zero events, emit one line acknowledging that (so the user knows the file was checked, not skipped). Don't render empty event lists.
- **Highlight open deferrals.** They're the actionable signal: code about to be changed may collide with something the prior exploration explicitly deferred.

If `kgContextUsed.implementationCount === 0` across all files (no lineage anywhere), say so plainly and exit:

> No lineage found for these files in this workspace.
>
> Likely reasons:
> - These files have not gone through Ritual yet.
> - Prior work was not synced with `sync_implementation`.
>
> Next: proceed normally, or start `/ritual build` if this work should become part of workspace memory.

#### Step L4 — Single recommended next step

End with one cheap call-to-action. The right action depends on what the lineage showed:

| Lineage shape | Recommended next step |
|---|---|
| Open deferrals touching files the user is about to change | *"⚠ {N} open deferral{s} overlap your scope. Before you write code: want me to surface the full deferral context (`/ritual build` brief with `sources` set to these files)?"* |
| Decisions shipped recently (< 30 days) the user might collide with | *"Recent decisions on these files. Want me to fetch the full build brief from the source exploration? (it's still cached)"* |
| Old, stable decisions only | *"Lineage looks settled. Anything else, or are you good to proceed?"* |
| No lineage | *"Nothing on these files yet. Drag in different files or start a fresh `/ritual build` exploration if you want to log this work into the workspace."* |

### Tools used

Single-tool subcommand:

1. `query_knowledge_graph` (Step L2 — the whole flow hangs on this)
2. Agent filesystem tools (`Glob`, `Read`) for resolving directory inputs / pasted-code inputs in Step L1.

Optional onward calls if the user pivots to action (Step L4):
- `generate_build_brief` if they want the full brief with deferrals surfaced
- `get_exploration` if they want to drill into one of the source explorations

No new MCP tools required. `/ritual lineage` is a thin formatter over `query_knowledge_graph`.

### Relationship to `/ritual build`'s priorContext block

Same underlying data, opposite direction:

- **Inside `/ritual build`**: lineage flows in as *silent priorContext* — the LLM sees prior decisions + deferrals when synthesizing considerations / problem statement / build brief. The user never sees the raw knowledge graph query.
- **As `/ritual lineage`**: lineage IS the experience. The agent surfaces the raw knowledge graph query, formatted, to the user. No LLM synthesis on top.

When a user is mid-`/ritual build` and wants to drill into one of the prior implementations the brief mentioned, that's the natural moment to suggest: *"Want me to run `/ritual lineage` on these files for full context?"*

---
