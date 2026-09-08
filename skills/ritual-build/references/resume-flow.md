## /ritual resume

**"Pick up where I left off."** Promotes `/ritual build`'s Step 1.5 ("resume vs start") to a first-class command for users who already know they want to continue something, not start fresh.

Output: the user lands on the right step of an existing exploration's `/ritual build` flow — no new exploration created, no fresh-start path offered.

**Build rail is load-bearing here too.** Every top-level user-facing message in `/ritual resume` MUST begin with the 5-stage build rail per `references/cli-output-contract.md` § Build rail — both during the picker (rail at `▶ Scope`) and once you teleport into the chosen exploration (rail at whatever stage that exploration is in).

### When to use

- The user types `/ritual resume` with no args (the common case): they want to see their in-flight explorations and pick one.
- The user types `/ritual resume <exploration_id_or_name>`: they already know which one; jump straight to its right step.
- A user came back to the repo after time away and isn't sure what they had going.

When **not** to use:
- The user wants to start something new → that's `/ritual build`.
- The user wants to understand the workspace at a higher level (no specific exploration in mind) → just ask the agent in plain English (*"walk me through this workspace"* / *"trace the auth flow"*) — no slash-command needed.

### Workflow

#### Step R1 — Pick a workspace

Same as `/ritual build` Step 1. Project-pinned workspace from `.ritual/config.json` is preferred. If no pin and the user has multiple workspaces, ask which one.

**Unless an exploration id was handed to you — then DERIVE the workspace and ask nothing.** An exploration already belongs to a workspace, so asking which one is asking a question you can answer yourself. Resolve it from the exploration, bind `.ritual/config.json` to it, and continue. A repo that arrives unbound leaves this step bound, which is free and permanent.

This is the funnel deep-link path: a developer who signed up on the marketing site lands here with the plugin freshly installed, no `.ritual/config.json`, and an id in the prompt. Every question asked here is one the deep link exists to avoid.

If the workspace has **zero explorations**: tell the user politely and pivot.

> No in-flight explorations in this workspace yet. Start a new Ritual build with `/ritual build <your problem>`.

End the flow here. Don't bounce them into `/ritual build` automatically — explicit user intent beats implicit handoff.

#### Step R1.4 — Get the brief to work from (deep-link path)

An exploration you were handed by id can be **mid-pipeline** — discovery and recommendations running, brief not yet synthesized. That is a stage, not a failure, and it is the common case for someone who signed up seconds ago.

Call `merge_briefs` with the id you were given, BEFORE grounding anything. A developer who came from the marketing site has two briefs — the one they read before signing up and the one the pipeline produced — and this returns the one to work from, folding the first into the second on the first call.

Two things in the response change what you do next:

- **`explorationId` may differ from the id you passed.** It is the durable exploration; use it from then on.
- **`groundable`** decides whether you may touch the brief. When it is false, do not ground it and do not save it — `save_reconciled_brief` refuses a target that is not ready, so the work would be lost at save.

| `status` | what it means | what to do |
|---|---|---|
| `merged` | the pre-signup brief folded into the pipeline's | carry on into the normal flow |
| `durable` | nothing to fold in (not a funnel signup) | carry on — this is normal |
| `preparing` | still generating | say so plainly (*"your brief is still being written — about a minute"*), wait `retryAfterMs`, call again |
| `seed_fallback` | you are being shown the pre-signup brief | read-only; tell them the real brief is still coming and offer to pick it up when it lands |

**Not found is a STOP, never a fresh start (load-bearing).** If `merge_briefs` or the
status read returns 404 / not-found for an id you were handed: the exploration SHOULD
exist — the user's whole reason for being here is resuming their work — so a not-found
is a defect signal, not a fork in the road. Do NOT start a new build, do NOT retry in a
loop, do NOT improvise a workaround. Say one plain line: you can't find that exploration
on this account, and the most common cause is being signed in to a different Ritual
account than the one created on the website — re-authenticating with the account from
their signup email fixes it. Starting fresh may be OFFERED as an explicit choice; it is
never taken silently — a silent fresh start converts their lost work into fake success,
and nobody ever sees the failure because the thread looks healthy. Do not narrate ids,
error payloads, or what was logged — the failure is already recorded server-side with
everything support needs.

**The merge outranks any status you read before it (load-bearing).** Once `merge_briefs`
returns `merged` or `durable` with `groundable: true`, that IS the resume outcome: present the
brief and continue toward grounding. Do **not** surface a pipeline gate — recommendations review,
question review, any step prompt — from a status snapshot taken before the merge returned. A
`preparing` retry means you necessarily read status while the pipeline was still moving, so by the
time the merge lands your earlier snapshot is stale by construction. If the flow needs the step
after that, re-read it *after* the brief has been presented.

This matters most on the path it is most likely to happen: a funnel resume that lands mid-pipeline.
The seed pipeline auto-proceeds past recommendations, so a recommendations gate shown from a
pre-merge snapshot is asking the user to accept work the pipeline already moved past — they reply
"proceed" to a gate that was never theirs to answer.

#### Step R1.5 — Check for pending syncs (if any)

Before showing the in-flight exploration list, glance at `.ritual/pending-sync/` to surface any `sync_implementation` calls that failed in past sessions. These are the cleanest "you left something undone" signal — more concrete than an exploration's state badge alone.

Quick scan:

```bash
ls.ritual/pending-sync/*.json 2>/dev/null
```

If the directory doesn't exist or has no `.json` files: proceed silently to R2. Most invocations land here.

If there ARE pending syncs:

1. Read each `.json` file. Extract `explorationId`, `branch`, `commits[].sha` count, and the file's mtime ("saved Xd ago").

2. For each, do a **quick staleness probe** — same shape as `/ritual build` Step 12.2:

 ```bash
 # In the payload's branch, are there commits not in payload.commits[]?
 git log {branch} --pretty=format:%H 2>/dev/null
 ```

3. Surface the list before the regular exploration picker:

 ```text
 You have {N} pending sync{s} from past sessions:

 1. **{exploration name}**
 Saved {Xd} ago · {commitsCount} commit{s} · branch `{branch}`
 {stalenessBadge} ← "✓ still current" | "⚠ {M} new commits since save"

 2....

 Resolve before resuming? (Y/n)
 ```

 **[USER PAUSE — required, do not auto-answer]** Wait for reply.

4. If user says **yes**: for each pending sync (in order), apply the same flow as `/ritual build` Step 12.2's staleness check — retry as-is / regenerate / show new commits. Once resolved, delete the corresponding `.ritual/pending-sync/<id>.json` (succeeded) or leave it for later (deferred). Then continue to R2.

5. If user says **no**: proceed to R2 silently. The pending syncs aren't going anywhere; the user can clear them later via `/ritual resume` again.

The point: a pending sync is a stronger signal than "this exploration's state badge says ready" because the user's own code-tracking failed mid-flight. Surfacing them first means the user resolves obviously-broken state before being asked to pick a new thing to work on.

#### Step R2 — Surface in-flight explorations with state badges

Call `list_explorations(workspace_id)`. Sort by most-recently-updated. Drop archived. Cap at 5 in the user-facing summary.

If exactly one in-flight exploration is recent and clearly the likely target, lead with it instead of forcing a picker:

> Likely resume target:
> **{name}** — last touched {time}. Next: {natural-language next action}.
>
> Resume this? (Y/n, or `list`)

If there are multiple plausible targets, group by state badge and show. **One picker number per exploration; continuation prose is plain text under it, never its own list item.** Use the exact shape below:

> Here's what you have in flight in **{workspace.name}**:
>
> **📍 still in discovery** ({count})
>
> 1. **{name}** — {first 80 chars of problemStatement}
> Last touched {N} {days/hours} ago. Next: continue sub-problem generation.
>
> **💬 waiting on admin to accept recommendations** ({count})
>
> 2. **{name}** — {…}
> Last touched {N} days ago. Next: admin reviews + accepts in Step 9.
> 3. **{name}** — {…}
> Last touched {N} days ago. Next: …
>
> **✅ ready for build brief** ({count})
>
> 4. **{name}** — {…}
> Last touched {N} days ago. Next: generate the build brief.
>
> **Which one do you want to resume? Reply with the number, the name, or `none` to exit.**

**Rendering anti-pattern (hard rule — do not do this):**

- ❌ Numbering the SAME exploration's continuation lines (summary, "Last touched", "Next") as separate numbered items:
 ```text
 1. Social shopping — activate wishlist sharing
 1. Activate dormant wishlist sharing primitives...
 1. Last touched ~10 min ago. Next: generate the build brief.
 2. Join while booking — post-order account claim
 2. Post-checkout account creation flow...
 2. Last touched ~2 hours ago. Next: admin reviews + accepts.
 ```
 Three `1.` lines + three `2.` lines is wrong. **Each exploration gets ONE picker number on its title line. The summary, last-touched, and next-action lines belong to that exploration as indented continuation prose — never their own numbered or bulleted entries.**

- ❌ Using `-` bullets for explorations when the picker tells the user "reply with the number." Bullets have no numbers; the user can't say "I pick `-`."

- ❌ Restarting the picker count at each state bucket (`1.` under "still in discovery", then `1.` again under "waiting on admin"). Numbering is **flat across all buckets** so a single number unambiguously identifies one exploration.

**The correct shape is exactly:** state-bucket header → blank line → `{N}. **{name}** — {summary}` → indented continuation prose (2-space indent, no leading marker) → blank line before next exploration. State-bucket count in parens `({count})` is informational and is NEVER a picker number.

State badge → user-facing label + suggested next step (same table as `/ritual build` Step 1.5):

| Glyph | State | User-facing label | Jump to |
|---|---|---|---|
| 📍 | `in_progress` | "still in discovery" | Continue discovery |
| 💬 | `awaiting_admin` | "waiting on admin to accept recommendations" | Admin review |
| ✅ | `ready` | "ready for build brief" | Generate the build brief |
| 🛠 | `in_flight` | "implementation in progress" | Refresh the build brief on remaining work |
| ✓ | `done` | "shipped with follow-ups" if open deferrals exist; otherwise "shipped context" | Address follow-ups or use `/ritual lineage` on touched files. Hide fully complete shipped work by default. |
| ⚠ | `implemented_ahead` | "code shipped before admin acceptance" | Surface to user, ask admin to reconcile |

Silence on no-data: if a state bucket is empty, don't render it. Don't print "**🛠 implementation in progress** (0)".

#### Step R3 — Branch-existence sanity check (`done` / `in_flight` only)

> **Requires shell + git.** Steps R3 and R3.5 verify knowledge graph state against local git, so they only run on agents that can execute shell + `git`/`gh` (Claude Code, Codex, Cursor agent mode, …). **If your agent can't run shell/git** (v0, Lovable, browser-only agents), skip both probes entirely, treat the knowledge graph state badge as truth, and tell the user you couldn't cross-check it against local git history.

Same as `/ritual build` Step 1.5 step 5's branch-existence check. Before treating an exploration as ✓ done, verify the implementation record's branch / PR actually exists locally or remotely:

```bash
git rev-parse --verify "origin/${implementationRecord.branch}" 2>/dev/null \
 || gh pr view "${implementationRecord.prNumber}" --json state 2>/dev/null
```

If neither resolves, surface as a single-action proposal:

> Note: per the knowledge graph this is shipped on `{branch}` (PR #{num}), but I don't see that branch in this repo or remote. The implementation record may be bootstrap/synthetic data.
>
> Treat as ready-to-implement-for-real? **(y/N, or tell me what's actually shipped)**

#### Step R3.5 — Implementation footprint check (`ready` / `in_flight` only)

The knowledge graph can't distinguish "brief generated, no code yet" from "implementation done but not yet synced" from "implementation was started and then dropped." All three look like state `ready` (or `in_flight`) because no `ImplementationRecord` row exists yet — that's only written on `sync_implementation`.

When the knowledge graph asserts `ready` or `in_flight`, do a **footprint check** using the `Ritual-Exploration: <id>` commit trailer (written by Step 11.2). The trailer is a stable anchor in git history that survives branch deletion (lives in reflog for ~30 days) and persists across machines via push.

Run these probes:

```bash
# Probe A — any commits anywhere in this repo's git history attributed to this exploration?
git log --all --grep="Ritual-Exploration: ${exploration_id}" --oneline 2>/dev/null

# Probe B — the heuristic feature-branch from Step 11.0 (try both naming conventions)
git rev-parse --verify "feat/${exploration_slug}" 2>/dev/null
git rev-parse --verify "ritual/${exploration_short_id}" 2>/dev/null
git rev-parse --verify "origin/feat/${exploration_slug}" 2>/dev/null

# Probe C — any PR (open, closed, or merged) attributed to this exploration?
gh pr list --search "Ritual-Exploration: ${exploration_id}" --state all --json number,state,title,headRefName,mergedAt 2>/dev/null
```

Cross-reference findings against the knowledge graph state:

| knowledge graph state | Footprint found | What happened | What to surface |
|---|---|---|---|
| `ready` | None | User hasn't started coding | "Brief ready, no code yet. Pick up at Step 11 (Implement)?" |
| `ready` | Branch + commits with trailer | Mid-implementation, unsynced | "I see {N} commits on `{branch}` attributed to this exploration. Continue coding, run the gate, or `sync_implementation` now?" |
| `ready` | Open PR with trailer | PR open, awaiting review/merge | "PR #{N} is open ({state}, {head_ref}). Wait for merge, or sync the current state of the branch?" |
| `ready` | Merged PR with trailer, no impl record | PR merged but `sync_implementation` was skipped | "PR #{N} merged on {date} but `sync_implementation` was never called. Want me to sync from the PR now?" *(There is no `/ritual sync <pr-url>` command — walk the user through Step 12 manually using the PR's commits + decisions.)* |
| `ready` | **Only orphan commits in `git log --all` (no live branch / no live PR)** | **Work was dropped — branch deleted, reset, or stashed-then-discarded** | "⚠ I see {N} commits attributed to this exploration in your git history from {N} days ago, but the branch is gone and no PR was opened. Looks like the implementation was started and dropped. Want me to: **(a)** show you the orphan commits so you can recover them (`git cherry-pick`), OR **(b)** start fresh implementation from the brief?" |
| `in_flight` | Branch + commits match knowledge graph `branch` field | Implementation in progress (normal mid-loop state) | Continue per the state badge's suggested next step (refresh brief on remaining work). |
| `in_flight` | knowledge graph says branch X, but Probe B says different branch Y carries the commits | Branch was renamed/rebased after knowledge graph was last updated | "knowledge graph says `{x}` but I see Ritual-attributed commits on `{y}`. Update the knowledge graph branch name, or use `{y}` for the rest of this flow?" |

**The dropped-work case (row 5) is the load-bearing one.** Without this check, the user re-runs `/ritual build` and the agent silently regenerates the brief, never telling the user they lost a day of work that's still recoverable from the reflog.

**Skip the probes when:**

- **Your agent can't run shell + git** (see the R3 guard above) — skip entirely and treat the knowledge graph state as truth.
- The exploration was just created in this same session — no time to have orphan commits.
- The user just synced (the `done` / `in_flight` state badge was set within the last few minutes).
- The exploration is in a state where the footprint check doesn't apply (`in_progress`, `awaiting_admin`, `implemented_ahead`).

#### Step R4 — Jump to the right `/ritual build` step

Once the user picks (and the sanity check passes), invoke the `/ritual build` flow internally with `exploration_id` set and skip ahead to the step the badge maps to. **Don't re-prompt for workspace, template, scope, considerations, or problem statement** — that work already exists on the exploration.

End the flow with the same "next step" prompt `/ritual build` would have at that step. The user sees `/ritual resume` as a thin shortcut; behind the scenes it just teleports them into `/ritual build`'s middle.

### Tools used

Read-tier subset of `/ritual build`'s tools:

1. `list_workspaces` (R1, fallback only)
2. `list_explorations` (R2 — the core read)
3. `get_exploration` (R3, to fetch the `implementationRecord` for the branch check)
4. Whatever `/ritual build` would use from the jump-in step onward (R4)

No new MCP tools required. `/ritual resume` is a thin orchestration over what already exists.

### Relationship to `/ritual build` Step 1.5

They share the same logic. The difference is **user intent at invocation time**:

- `/ritual build` is "I'm starting something" — Step 1.5 is a *check* ("oh wait, you might already have this") before going further.
- `/ritual resume` is "I'm continuing something" — there's no fresh-start path; if the user really wants fresh, they exit and run `/ritual build`.

Result: the same MCP calls, the same state-badge table, but different framing for the user. Two clear front doors instead of one ambiguous one.

---
