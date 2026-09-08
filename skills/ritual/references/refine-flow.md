# /ritual refine — re-ground your build brief against the current codebase

Grounds the build brief you arrived with against the current repo+branch state. Runs codebase
recon, drops already-implemented recommendations, attaches codebase sources, rewrites the brief
on disk, syncs it back to the cloud (non-blocking), then renders ONE grounded-and-saved summary
with a concrete "what changed" block and the agent debrief.

**The local brief is the artifact refine grounds, and its canonical home is
`.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md`** — the same per-exploration
directory every other flow uses (build-flow Step 10c owns the convention, including the
`.ritual/local/` gitignore rule). The brief already exists: it was generated on the marketing
site and pulled to disk at `init`. **Legacy inits wrote it to the flat `.ritual/build-brief.md`
— that path sits OUTSIDE `.ritual/local/` and is therefore NOT gitignored, and it can collide
across explorations. On first touch after resolving the exploration (Step 1), silently migrate:
if `.ritual/build-brief.md` exists with real content and the per-exploration file does not,
move it into the id directory (create it, ensure `.ritual/local/` is gitignored per build-flow
10c) and say nothing.** From then on every read and write in this flow uses the per-exploration
path. Refine
does NOT call `generate_build_brief` and does NOT re-synthesize on the server; it sharpens the
brief you already have, in place, against real code. It may then sync the grounded result back
with `save_reconciled_brief` (a save, not a re-synthesis; non-blocking — Step 5.5), but the local
file stays the source of truth for `/ritual begin`.

**Refine = grounding a brief you already have.** By the time refine runs, you arrived with a
brief (the prelogin handoff) and a repo. Refine's job is to sharpen that brief against the
current codebase: "I have a plan built from my description, now ground it in where the code
actually is." Its output is a refined per-exploration brief that `/ritual begin` executes.

## Step 0 — Is there anything to refine? (deep-link guard)

Refine grounds a brief **you already have**, and the paragraph above says where it came from: `init` pulled it. The plugin path never runs `init` — a developer arriving from the marketing deep link has a freshly installed plugin, no `.ritual/config.json`, and no local brief in either location.

So before anything else:

- **No local brief (nothing under `.ritual/local/build-briefs/` and no legacy `.ritual/build-brief.md`) and no bound workspace?** This is a session that was never established. Do NOT attempt to refine, and do NOT synthesize a brief to have something to grind against. Hand off to `/ritual resume <exploration_id>` if you were given an id, or `/ritual resume` if you were not — that flow resolves the workspace, binds the repo, and lands on the right stage, including the stage where the brief is still generating.
- **Brief present?** Continue with Step 1 below; nothing changes.

This guard is the belt to the deep-link prompt's braces: the prompt says `resume`, but an agent that reasons its way to `refine` anyway should land somewhere that works rather than failing on a missing file.

**Build rail is load-bearing here too.** Every top-level user-facing message in `/ritual refine`
MUST begin with the 5-stage build rail per `references/cli-output-contract.md` § Build rail,
positioned at the recommendations/brief stage — re-grounding is late-planning, not implementation.

**Render discipline — without it this flow degrades into a stream of narration (8+ messages where one gate should stand).**
The build flow's no-narration rules apply verbatim here: the user sees GATES and OUTCOMES,
never process narration. Concretely:

- **NEVER emit play-by-play between gates.** "Step A succeeded…", "Repo resolves to cwd…",
  "Exploration resolves cleanly: `454f…`", "Key gap confirmed…" are all internal reasoning —
  keep them in your thinking, not in user-facing text.
- **The entire flow (resolution, recon, grounding, rewrite, save-back) is ONE composed
  render**, rail-led, emitted only when the grounded brief is SAVED. Target: **ONE
  user-facing render total** (R1, the grounded-and-saved final gate). There is NO
  pre-grounding gate: recon and grounding are read-only, so nothing needs the user's
  permission before it runs (a "proceed?" before an action with no decision to make
  is an extra step for zero safety — do not add one).
- **User nouns only** (cli-output-contract rules): never surface raw exploration ids, `cwd`,
  branch internals, or tool names. "your build brief" not "`BUILD-BRIEF.md` grounding
  target"; "this repo" not "cwd (`taxonomy`)".
- Silence is not rudeness — a long grounding pass shows ONE "grounding your brief against
  this repo…" line, not a running commentary.

**The render (compose from this template — nothing else is user-facing text).**
Emit it ONCE, only when the codebase pass, the in-place rewrite, AND the save-back
are ALL complete. Any sentence that is not this composed render (or the
neither-exists stop above, or R2 below) is a render leak.

*R1 — grounded & saved, the final gate (the flow's ONLY render — resolution, recon,
grounding, rewrite, and save-back all flow straight through to it; there is no user
step between entering the flow and "the brief is updated"):*
> {build rail}
>
> ✓ Signed in · ✓ build brief loaded · ✓ repo matched ({repo short name})
>
> Grounded {N} of {M} requirements against `{branch}` ({C} commits since the brief was built | brief was current) and refined your brief — saved → [BUILD-BRIEF.md](.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md).
>
> What changed:
> {per-requirement one-liners: confirmed / sharpened / flagged, user nouns only}
>
> What this changed for me (your coding agent):
> » From your original ask alone ("{≤8-word quote of their raw one-liner}"), I would have {the mistaken build/assumption}, and {the concrete failure that would have caused: wasted work against a missing model / a duplicate system / shipped ungated}.
> » The grounded brief {caught | corrected | confirmed} {one specific}: {how the code reality reshaped it}.
> » Net: {materially changed my build plan | sharpened the details | mostly confirmed my read} — {≤10-word justification}.
>
> `/ritual begin` hands it to your agent — auto mode to build, plan mode to review first.
> `drill {N}` inspects one requirement. `view` opens the brief as a readable page. Reply `pause` to stop here.

**Agent-debrief rules (the `»` block above, headed "What this changed for me (your
coding agent):").** This is the AGENT speaking for itself,
first person, about what the Ritual pass objectively changed — not marketing copy:
- Exactly 2–3 `»` lines, each ≤25 words, each naming a CONCRETE item from THIS run
  (a flagged gap, a corrected assumption, a reused pattern) — never generic praise.
- **The comparison baseline is the USER'S ORIGINAL RAW ASK** (quoted from the brief's
  original-input section), NOT the brief. The counterfactual is "me implementing your
  one-liner directly"; the brief + grounding are the instrument that closed that gap.
- **The brief's role in the story: intent made explicit.** The raw ask is ambiguous;
  the brief records what the user TRULY specified in detail versus what was left open,
  and pins the open parts to decisions. When it sharpens the narrative, use the
  three-layer contrast: "your ask left {X} ambiguous → the brief pinned it to {Y} →
  the code showed {Z}". The brief is the intent contract, grounding is the reality
  check — neither is ever the thing that "assumed wrong".
  Never phrase the brief as the thing that erred ("the brief assumed…" is wrong framing —
  the v1 brief predates repo access by design; grounding exists to close exactly that).
- **The counterfactual line must land as a NEAR-MISS, not a plan.** Structure it
  mistake-then-cost: what I would have built/assumed, then the concrete failure it
  would have produced ("...and every invite would have written to a table that does
  not exist"). If it reads as a sensible intention that merely changed, rewrite it —
  the reader should wince, not nod.
- **Name the failure as a negative.** Unfounded assumptions and work beyond the
  problem at hand are DEFECTS, never initiative: building against phantom structures
  (hallucinated scope), scope creep past the actual ask, duplicating a system the repo
  already has, or inventing a path that exists. "I would have extended the admin
  area" presents scope creep as competence — the honest phrasing is "I would have
  invented an admin area this app does not have, spending your build on scaffolding
  the ask never required."
- The `Net:` verdict is calibrated and honest: if the pass mostly confirmed what the
  code already implied, SAY that — a truthful "mostly confirmed my read" is what makes
  a "materially changed my build plan" believable when it happens.
- User nouns only; no tool names, ids, or internal vocabulary. The debrief lives INSIDE
  the R1 render (same message, after the saved line) — it is not a separate message.

*R2 — pause acknowledgment (the ONLY valid response to `pause` at the final gate):*
> Paused. `/ritual begin` whenever you're ready.

ONE line, exactly that shape — no recap of what was done, no restating what `/ritual begin`
does (R1 already said it), no "nothing further will run" elaboration.

**R1 ends the turn — one message, then stop.** After emitting R1, output NOTHING
else in that turn: no follow-up summary, no "Refine is done" recap, no second
reminder of the options (they are already R1's last two lines). Two messages at
the final gate is a render leak even when the second one is accurate — e.g.
the final render followed in the same turn by "Refine is done — the
grounded brief is saved. To build, run `/ritual begin`…", a verbatim duplicate of
what it had just said.

**Tool-call silence.** Between renders you will call tools (git probes, brief reads,
`get_build_brief_status`, `save_reconciled_brief`, …). Emit NO text around them — not
"Let me check…", not "while I prepare…". A tool call is not a user-facing event. If a
tool fails and blocks the flow, that failure surfaces INSIDE the next render (or the
neither-exists stop), never as a standalone commentary line.

**Reply routing at the final gate is closed-set:** a user reply maps to exactly one of
{`drill` detail inside the same render frame, `view`, R2}. (`/ritual begin` is a new flow,
not a reply.) There is no fourth kind of response. If the reply is unrecognized, re-emit
the gate's option line — one line, nothing else.

**On `view` — render the brief as a readable page.** The six-column requirement table is
unreadable in a terminal; `view` gives the user the same brief as a styled page, read-only:

- Compose an HTML rendering of the CURRENT saved brief — full content, the requirement
  table as a real table, headings preserved. Design it as a document to read, not a dump.
- Publish it the best way the session allows: a page/artifact publishing tool when one is
  available, otherwise write `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.html`
  and open it with the OS opener (`open` / `xdg-open`); if neither is possible, say the
  page needs a browser-capable session and re-emit the option line.
- `view` is a RENDER, never a mutation: it must not change `BUILD-BRIEF.md`, call any
  saving tool, or alter the exploration. The page is a projection of the saved brief.
- After handing over the page (one line: where it is), re-emit the gate's option line —
  the user is still at the final gate.

---

## ON ENTRY

Your **first action** is Step 1 (resolve the exploration). Do not read the local brief
first. Do not pause to ask clarifying questions.

---

## Flow

### Step 1 — Resolve the target repo and exploration

**1a. Identify the target repo.**

Check the `RITUAL_TARGET_REPO` environment variable (set by the launcher when invoked from
the CLI). If set, use that path as the repo root. Print: "Target repo: `<path>`."

If unset:
- If the current working directory is a git repo (`.git` directory present), use it.
  Print: "Target repo: `<cwd>`."
- If cwd contains child directories that are git repos, list up to 5 by recency. Print
  the list and ask: "Which repo should I ground the brief against?" Wait for the reply.
  This is the only user pause in this flow.
- If no git repo is found: print "No git repo found. Set `RITUAL_TARGET_REPO` or run from
  inside the target repo." and stop.

**1b. Determine the current branch.**

```bash
git -C <repo_path> rev-parse --abbrev-ref HEAD
```

Print: "Branch: `<branch>`."

**1c. Resolve the exploration via repo+branch binding.**

Call `mcp__ritual__list_explorations` and look for an exploration whose repo+branch matches
the current repo+branch. Prefer explorations in state `ready`, `in_flight`, or `in_progress`.

Also check `.ritual/config.json` for a pinned `explorationId` — if present, fetch it
directly via `mcp__ritual__get_exploration` and confirm it matches. The config binding
takes precedence over the list scan. A fresh prelogin exploration may be a draft the roster
does not list, so the pinned `explorationId` is the reliable path.

If an exploration is resolved, note its `id`, `name`, and `state`. `/ritual begin` uses this
id for `sync_implementation`, so surface it if found — but this is a SOFT binding.

If no exploration resolves but a local brief exists with real content (either location), proceed
anyway: the on-disk brief is the artifact refine grounds. Only if there is NEITHER an
exploration NOR a usable local brief:
> No build brief found for this repo+branch. Run `ritual init --token <...>` from your signup
> handoff to pull it, or `/ritual build <your problem>` to create one.

Stop only in that neither-exists case. Do not block on the server otherwise.

**1d. Staleness probe.**

```bash
git -C <repo_path> log --oneline -20
```

Note the HEAD commit SHA and count. If the exploration has a `savedAt` or `buildBriefGeneratedAt`
timestamp, count commits since that timestamp:

```bash
git -C <repo_path> log --oneline --after="<savedAt>" 2>/dev/null | wc -l
```

Record the result for the final render's grounded-against clause ("`<branch>` (<C> commits
since the brief was built)", or "brief was current" when C is 0). Do NOT print it as a
standalone line — it surfaces inside R1. This makes stale-brief or wrong-branch/worktree
runs catchable.

### Step 2 — Read the brief you're grounding

Read `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` fully (and `.ritual/recommendations.md` if it exists). This is
the artifact you will rewrite in place in Step 5, so note its section structure and the
recommendations it lists. You reached here because Step 1 confirmed a brief exists.

If the brief has an `explorationId` in frontmatter, cross-check it against the pinned id from
Step 1. If they differ, surface a warning and ground the on-disk brief anyway:
> Warning: the local brief references exploration `<local-id>` but
> `.ritual/config.json` pins `<config-id>`. Grounding the on-disk brief.

### Step 3 — Recon the codebase

Read key files relevant to the exploration topic. Do NOT run shell commands (beyond git
probes in Step 1), install dependencies, or modify any file in the repo.

Files to read (read what exists, skip what does not):
- `package.json` or `pyproject.toml` or `Cargo.toml` — dependency and script inventory
- Main source directories (infer from `package.json` `main`/`src` fields, or common defaults:
  `src/`, `app/`, `lib/`)
- CI config: `.github/workflows/*.yml`, `.circleci/config.yml`, `Dockerfile`
- Any file the exploration's build brief explicitly names as relevant

While reading, for each question in the brief: check whether the codebase already answers
it. Mark it answered (internal note, not printed yet).

For each recommendation: verify whether the codebase already implements it. Note the file
and line reference if found.

### Step 4 — Update recommendations

For each recommendation from Step 3 review:
- If the code already implements it: mark it "already implemented" with a `file:line` source.
  It will be dropped from the regenerated brief.
- If it still applies: retain it, attaching the closest file source found during recon.
- If it is newly contradicted by code structure (e.g., recommends adding X but X already
  exists in a different form): mark as "needs reframe" and note what the code shows.

### Step 5 — Rewrite the brief on disk (no server call)

Rewrite `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` in place, grounded in the recon findings. This is an
agent-authored edit to the local file: refine does NOT call `generate_build_brief` and does
NOT re-synthesize on the server. The brief you already have (the prelogin brief pulled at
`init`) is the base; sharpen it against the code:

- Preserve the brief's existing section structure and headings. You are sharpening content,
  not restructuring. Do not invent a new format.
- For each recommendation the code already implements: drop it, and record it for the
  "what sharpened" block in Step 6.
- For each recommendation that still applies: attach the closest codebase source (`file:line`)
  found during recon.
- For each recommendation the code contradicts: reframe it to what the code shows.
- Ground the "Codebase Anchors" section (or its equivalent in this brief) in EXACT file paths
  from recon. If a path is uncertain, name what to search for instead of inventing one.
- Keep every constraint, goal, and requirement the original brief stated. Never drop substance.

Write the sharpened brief back to `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md`. That file is the source of
truth for `/ritual begin` — no `generate_build_brief`, no re-synthesis, no polling.

### Step 5.5 — Sync the grounded brief back to the cloud (non-blocking)

This keeps the server's copy of the brief in step with the grounding you just did, recorded as
a reconciled version with provenance. It is STRICTLY OPTIONAL to the flow: it never blocks, and
`/ritual begin` runs off the LOCAL `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` regardless of whether it succeeds —
begin neither reads nor waits on it.

Skip this step entirely if Step 1 resolved NO exploration id (a local-brief-only run has
nothing to sync server-side); go straight to Step 6.

If an exploration id was resolved:

1. **Confirm the server brief is READY.** Call `mcp__ritual__get_build_brief_status`. If it is
   not READY (still generating, or none exists), SKIP the sync — print one line ("Server brief
   not ready; kept the grounding local.") and continue to Step 6. Do NOT wait or poll.
2. **Save the grounded brief back.** Call `mcp__ritual__save_reconciled_brief` with the
   exploration id, `content` set to the full grounded local brief, and a short
   `reconciliation_summary` (e.g. "Grounded against `<branch>` @ <HEAD-SHA-short>"). Do NOT pass
   a source review id. The server snapshots the original as an immutable version, saves the
   grounded one, and stamps pre-signup provenance automatically — you do not signal that.
3. **Non-blocking.** If the call errors for ANY reason, print one line ("Cloud sync skipped:
   <reason>; grounding is saved locally.") and continue. Never retry, never stop.

**Every later brief edit pushes back the same way (HARD, all flows).** This step is also
the contract for ANY subsequent user-requested edit to the brief's content, in any flow or
between flows — "change RB-3 to …", "drop the second phase", "add an anti-goal to the
non-goals section". Whenever you edit the local `BUILD-BRIEF.md` at the user's request:

1. Make the edit locally, exactly as asked.
2. Run the same push-back: `get_build_brief_status` gate, then `save_reconciled_brief` with
   the full edited content and a `reconciliation_summary` naming the user's change in their
   words (e.g. "User edit: RB-3 now requires soft-delete"). Same non-blocking posture.
3. Confirm in ONE line that the change is saved — user nouns, no tool names ("Updated and
   saved to your Ritual exploration." / on a failed push: "Updated locally; cloud save
   didn't go through, so this edit lives only in this repo for now.").

An edited brief that never pushes back is a silent fork: Ritual's copy — what future
grounding, drift checks, and collaborators read — keeps serving the pre-edit content, and
the user has no way to notice. The local file stays the working copy; the push is what
keeps the exploration true.

### Step 6 — Emit the final render

Emit R1 (the template in the render-discipline section above) — the flow's single
user-facing message. Do NOT print the full brief; the saved link, the "What changed"
one-liners, and the agent debrief are the payoff.

**"What changed" one-liners (load-bearing).** 3 to 5 concrete, codebase-grounded
changes, each citing a specific file, line, or metric. Examples of the required
specificity:

- "Readiness score: 62% to 84% (billing/plans.ts already has a Stripe webhook handler at line 47)"
- "Dropped recommendation 3: role-based access already implemented at src/auth/rbac.ts"
- "Phase 2 now targets billing/plans.ts line 47 instead of a generic payment module"
- "Question 5 answered by recon: CI pipeline found at .github/workflows/deploy.yml"
- "Added file source to recommendation 1: src/api/users.ts exports createUser at line 12"

If recon found no differences (all questions were already unanswered, all recommendations
still apply, no sources added): the "What changed" block is exactly:
"Recon found no gaps. Brief is fully grounded in the codebase."

Never omit the "What changed" block or the agent debrief.

---

## Constraints

- One user pause maximum (Step 1a, repo disambiguation). All other steps run without stopping.
- Do NOT run shell commands in the target repo beyond the git probes in Step 1.
- Do NOT modify any file in the target repo EXCEPT `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md` (and the one-time legacy migration above), the brief you ground.
- refine does NOT call `generate_build_brief` and does NOT re-synthesize on the server. The
  brief already exists on disk; refine sharpens it in place. It MAY call `save_reconciled_brief`
  (Step 5.5) to sync the grounded brief back — a save, not a re-synthesis, and non-blocking;
  `/ritual begin` never depends on it.
- No em-dashes in any output.
