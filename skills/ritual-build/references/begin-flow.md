## /ritual begin

**"Execute an accepted build brief."** Promotes build-flow.md's planning-to-implementation gate to a first-class trigger. Use this when you arrived with a brief already built (via the Ritual web app, `/ritual refine`, or a prior `/ritual build` run that stopped before implementation) and are ready to start coding.

Output: the implementation phase runs against the accepted build brief, ending with `sync_implementation` registering the result in the knowledge graph.

**Build rail is load-bearing here too.** Every top-level user-facing message in `/ritual begin` MUST begin with the 5-stage build rail per `references/cli-output-contract.md` § Build rail — both during exploration resolution and once you confirm the accepted brief. The rail starts at Implementation since the planning phase is already done.

**Single source of truth.** This file HOLDS the begin steps. SKILL.md only routes to it. Do not restate these steps in SKILL.md.

### When to use

- The user types `/ritual begin` — they have an accepted build brief and want to start implementation now.
- The user arrived from the Ritual web app with a brief already reviewed and approved, and the coding agent session is the execution context.
- The user wants to hand off from planning (done outside the agent) directly into the implementation phase.

When **not** to use:

- The user does not yet have a build brief -> that is `/ritual build` (new) or `/ritual refine` (ground an imported brief).
- The user wants to continue an in-flight exploration mid-planning -> that is `/ritual resume`.
- The user wants to re-run discovery or refine recommendations -> `/ritual refine`.

### Workflow

#### Step B1 — Resolve the exploration (same binding as resume/refine)

`begin` resolves the exploration via the SAME repo+branch binding used by `/ritual resume` and `/ritual refine`. The brief can come from EITHER source: the server exploration (a normal `/ritual build`), OR a local per-exploration brief (`.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md`) standing on its own (a refined prelogin brief, grounded on disk and never synthesized server-side). `begin` still resolves the exploration id — it is needed for `sync_implementation` at the end — but it does NOT require a core server build brief. A brief on disk is a first-class, executable artifact.

**Resolution order:**

1. Read `.ritual/config.json` for the pinned `explorationId` (or `workspaceId` + repo key). This is the preferred binding.
2. If no pin: call `list_explorations` to show the compact roster, then let the user pick (same picker as Step R2 in `references/resume-flow.md`).
3. Call `get_exploration_status` on the resolved exploration to read its LIVE state — do NOT assert status from memory or prior turns.

**Do not re-run planning or discovery.** This step reads what already exists. If unsure which exploration, call `list_explorations` first.

#### Step B2 — Confirm an executable brief exists (gate)

**Read live state before asserting anything (load-bearing — grounding policy).** A brief satisfies this gate from EITHER source — check both, in this order:

1. **Local brief on disk.** Read `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` (the exploration was resolved in B1, so the id is known). **Legacy migration, one-time and silent:** if that file is absent but the flat `.ritual/build-brief.md` exists with real content (not the `_Build brief not available yet._` placeholder), move it into the per-exploration directory first — create the directory, ensure `.ritual/local/` is gitignored per build-flow Step 10c — then read it from there. The flat path is the legacy location from before per-exploration directories; it is not gitignored and can collide across explorations, so nothing reads or writes it beyond this migration.

 A real brief at the per-exploration path IS an executable brief — proceed to Step B3. This is the prelogin path: `/ritual refine` grounded the marketing-site brief on disk WITHOUT calling the core `generate_build_brief`, so there is no server build-brief row, and that is expected. Do not block on the server when a real brief is already on disk.
2. **Server brief.** If there is no usable local brief, call `get_exploration_status`. If it shows an accepted/ready build brief, that satisfies the gate too (the normal `/ritual build` path) — proceed to Step B3.

`begin` does NOT require a core server build brief; a local `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` stands on its own.

Only if NEITHER a local brief nor a server brief exists (the exploration is still in planning, discovery, or requirements): stop and guide the user.

**No-brief guidance (render verbatim, then stop):**

```text
Ritual begin
✓ Scope · ✓ Discovery · ✓ Recommendations · Build brief · Implementation

No accepted build brief found for this exploration.

`begin` executes an existing accepted brief. To get one:

 · /ritual build — run the full planning cycle (new explorations)
 · /ritual refine — ground an imported brief and sharpen recommendations
 · /ritual resume — pick up an in-flight planning session

```

Stop here. Do not attempt implementation without an accepted brief.

#### Step B3 — Acknowledge and confirm the brief (gate — [USER PAUSE])

An accepted brief exists. Show the user what they are about to execute and ask for the go signal. Mirror build-flow.md's Step 10d gate exactly — this is the same "say go / proceed to start building" acknowledgement that build uses.

**Rendering contract:**

```text
Ritual begin
✓ Scope · ✓ Discovery · ✓ Recommendations · ▶ Build brief · Implementation

Build brief ready — executing from accepted brief.

`.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` is on disk (or synced from the server). Skim the RBs
+ anchors, then decide:

 · `go` — ready to implement; move to coding
 · `drill {N}` — drill into RB-{N} before deciding
 · `pause` — stop here; resume with /ritual resume

```

[USER PAUSE] Branch on response (same synonym set as build-flow.md Step 10d):

- **`go` / `y` / `yes` / `proceed` / `continue` / `next` / `implement` / `ship`**: continue to Step B4.
- **`drill {N}`**: open RB-{N} in the markdown, discuss inline, then loop back to this gate.
- **`pause` / `hold` / `stop`**: stop here. The brief is on disk; the user can resume with `/ritual resume`.

#### Step B4 — Run the implementation phase

**Entry point: build-flow.md Step 11 — Implement.** Begin does NOT restate Step 11's content. Read and execute it from `references/build-flow.md` starting at `#### Step 11 — Implement`.

All of Step 11's load-bearing rules apply in full:

- 11.0.0 work-list slicing is load-bearing and NOT optional.
- 11.0 branch strategy (never commit to main/master from agent workflow).
- 11.0.5 plan-mode handoff (load-bearing user pause).
- 11.1 plan generation, 11.1.5 plan review, 11.2 implement per slice.
- 11.5 PR creation, 11.6 loop-back for remaining slices.

There is no shortcut. Every sub-step that build-flow.md marks load-bearing is equally load-bearing here.

#### 11.5a — Outbound preflight (BEFORE any push attempt)

Check credentials FIRST, silently: `gh auth status` succeeds, or `GH_TOKEN`/`GITHUB_TOKEN`
is set. If either holds, proceed with 11.5 normally.

**If neither holds, do NOT attempt `git push` even once, and never retry-loop on it**
(one missing credential gets ONE composed render, never escalating "still blocked" essays).
Instead, degrade gracefully — the PR is prepared LOCALLY and the user gets one composed
render with the finish-it-later path:

1. Write `.ritual/pr-draft.md`: line 1 = the PR title (conventional-commit style),
 blank line, then the body (summary of what landed, RB checklist, deferrals, brief
 reference). This is the artifact `gh pr create` consumes later.
2. Run `sync_implementation` as normal (Step B5), registering a `[major]` deferral:
 "draft PR pending GitHub auth".
3. Emit the no-credentials render ONCE:

> {build rail}
>
> ✓ Implementation logged · branch `{branch}` · {N} commit(s) — local, nothing pushed
>
> GitHub isn't authenticated in this environment, so the PR is prepared locally instead:
> → [.ritual/pr-draft.md](.ritual/pr-draft.md) — title + description, ready to use
>
> To open it once you're authenticated (`gh auth login` or set `GH_TOKEN`):
> ```
> git push -u origin {branch}
> gh pr create --draft --base {base} --head {branch} --title "{title}" --body-file.ritual/pr-draft.md
> ```
>
> Reply `retry` after authenticating (I'll push, open the draft PR, and re-sync so the
> link attaches to this record), or `skip` to finish here.

**Reply routing is closed-set:** `retry` → re-run preflight (if it now passes, do 11.5
and re-sync; if not, re-emit the option line — ONE line, no re-explanation). `skip` →
the Step-11.6/B5 close-out render. Anything else → re-emit the option line. Never
re-narrate the blocked state, never fabricate a PR URL, never push anywhere but origin.

#### Step B5 — Sync implementation

When Step 11 completes (all slices implemented and PRs opened), call `sync_implementation` to register the result in the knowledge graph. This is the same terminal step as in the continuous build flow.

```
sync_implementation({
 exploration_id: <resolved exploration id>,
 // remaining params per the MCP tool contract
})
```

After sync: emit the final rail with all stages complete and a one-line summary:

```text
Ritual begin
✓ Scope · ✓ Discovery · ✓ Recommendations · ✓ Build brief · ✓ Implementation

Implementation synced. Commits are linked to this exploration in the knowledge graph.
```
