## Brief verification — methodology + output schema

Reference for `/ritual build` Step 10b.5 (the auto-fire verify-brief pass that runs after the build brief is generated, before the user reviews it at the Step 10d gate).

The brief generator runs server-side and **does not have repo access**. It writes assertions about cited files / functions / classes based on the agent's earlier recon summary — which is a text summary, not the actual code. When the brief says *"`is_allowed_to_see` is insufficient — needs token-based access"* but the code actually ships email-allowlist semantics, the contradiction is invisible to the brief generator and to the user reading the brief.

Step 10b.5 closes this gap: **the agent (with repo access) reads the bodies of the specific symbols the brief cites and produces a structured list of findings before the user sees the brief.** Findings are written to a **separate** file (`BUILD-BRIEF-VERIFICATION.md`) and synced to Ritual's knowledge graph via `sync_brief_review` — they are **never** written back into `BUILD-BRIEF.md`. The brief stays the read-only historical artifact Ritual generated; the corrections reach the implementation through plan mode's knowledge graph `priorContext`, not through a brief rewrite. (There is **no** `refine_build_brief` tool — do not invent one; `sync_brief_review` is the write path.)

This is the **non-UI sibling of `references/ui-ux-checklist.md`** (Step 10.5 UX review). Same methodology shape (read brief → identify citations → find in repo → compare → fill schema → surface findings), different targets (functions / data shapes / model fields instead of UI components).

---

### Core principle

**The brief's assertions about cited code must be verified against the actual code before the user is asked to approve them.**

The brief generator hedges this risk passively with phrases like *"these recommendations may deviate if the codebase has a stronger existing pattern."* That hedge is honest but not actionable — it tells the reader to maybe check, without telling anyone to actually do the checking. Step 10b.5 makes the checking happen.

---

### Methodology (chain of thought — execute in this order)

Do NOT skip to the output schema. The schema only gets filled correctly when the analysis upstream is done.

**1. Read the brief end-to-end first.**

Open `.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md`. The sections most likely to contain verifiable assertions:

- **Codebase Anchors** — explicit file/function citations the brief expects you to extend or replace.
- **RB-N rationale** — review-blocking claims often cite specific primitives ("the existing `X` is insufficient because Y").
- **Suggested Implementation** — sequencing claims about what's "already present" vs "needs to be added."
- **Previously Deferred** — references to prior decisions on overlapping files (sourced from knowledge graph).

Output of this step: a flat list of every specific code citation the brief makes. **Symbol + file + assertion**. If a section says *"the recommendations may deviate if the codebase has a stronger existing pattern,"* that's exactly the kind of hedge this step exists to resolve — treat it as a high-priority verification target.

**2. Extract the explicit citations.**

For each cited symbol, capture:

- `cited_symbol` — function / class / model field / endpoint name.
- `cited_file` — file path if mentioned; if not, infer from context (Codebase Anchors usually pairs them).
- `brief_assertion` — the brief's exact claim about this symbol. One sentence.

Cap the list at **15 citations** (highest-leverage ones first — primitives the RBs depend on, symbols cited in multiple sections). 15 is enough to cover the load-bearing risks; more bloats the verification time without proportional signal.

**3. For each citation, read the actual code.**

Use Grep / Glob / Read. For each cited symbol:

- Find the file (Grep `def {symbol}` / `class {symbol}` / `const {symbol}` / `function {symbol}`).
- Read the function body / class definition / data shape. Include surrounding context (~10 lines) so callers and conventions are visible.
- Note line numbers (`cited_lines.start` / `cited_lines.end`) so the finding pins to a stable location.

**Do not fabricate citations.** If `Grep` returns nothing, the verdict is `not_found`, not "I'll infer what it probably does."

**4. Verify RB ITEMS, not just cited files. Assign a verdict per RB.**

**The unit is an RB item.** The `READ THIS FIRST` table is the part that blocks review, and every row already carries a **`How to verify`** recipe. Walk those. Verifying the `Codebase Anchors` list instead checks that files exist — the brief's bibliography rather than its claims — and a brief can pass that while every requirement in it is wrong for this repo.

Where an RB's recipe cannot run yet (it describes code that does not exist), say so with `unverifiable`. Do not silently drop it: a summary counting only what you chose to check reports full coverage over a denominator you picked.

**Try to REFUTE each claim, not confirm it.** Default to `unverifiable` and move to `verified` only on evidence you actually read. Approaching this as confirmation is how a pass returns "all verified" without testing anything.

Five verdicts:

- **`verified`** — the claim matches what the code actually does, and you read the code that shows it.
- **`contradicted`** — the claim is **wrong**; the code does something different. Drives a refinement.
- **`conflicts`** — the code is described **correctly**, and the recommendation is **incompatible with it**. The brief is not mis-describing anything; the direction does not fit this repo — a missing seam, a pattern the codebase forbids, a dependency that is not there. This is the verdict for a recommendation built on ungrounded answers, and it has nowhere else to go: `contradicted` would blame the description for a problem with the plan.
- **`not_found`** — a cited symbol could not be located. Renamed, deleted, or never existed; the brief is asserting against a phantom.
- **`unverifiable`** — the claim is about code that does not exist yet, or the recipe needs a running system. Expected on a greenfield slice, and **not** a failure — but it must be counted, because "Verified: 5 · Contradicted: 0" reads as complete when five of twelve RBs were checked.

**Narrating a finding mid-verification — frame it as resolving drift, not as an error.** If you surface a `contradicted` / `not_found` finding in a progress line before the summary, lead with *resolving drift between the brief and the codebase*, then one plain sentence on the drift + where the real pattern lives. A caught gap is the verification doing its job, not a failure to alarm about — don't lead with "X doesn't exist" / "references a function that doesn't exist."

- ❌ `get_core_apps is not in the codebase — the brief's RB-1 references a function that doesn't exist. The actual pattern is direct INSTALLED_APPS manipulation (index + replace), as seen in tests/settings.py.`
- ✅ `Resolving drift between the brief and the codebase: RB-1 cites get_core_apps, but the repo edits INSTALLED_APPS directly (index + replace — see tests/settings.py). Noting it in the verification.`

**5. Fill the output schema with evidence.**

Write `BUILD-BRIEF-VERIFICATION.md` into the SAME per-exploration directory as the brief (`.ritual/local/build-briefs/{exploration_id}/`). Use the schema below. **Each finding cites the file + line range + the actual code snippet that justified the verdict.** The user reading this must be able to verify your verification — no hand-waving, no claims without evidence.

**6. If any findings are `contradicted`, surface to the user inline at Step 10d.**

The Step 10d gate is `go` / `drill {N}` / `pause` (plus `ux-review`) — there is **no `refine` action**; the brief is read-only after generation. When `contradicted` findings exist, the gate prepends a summary so the user sees what the agent learned about the brief before deciding:

```text
⚠ Verification found {N} contradiction(s) between the brief and the actual code:

 · "{cited_symbol}" — brief says "{brief_assertion}". Code reality:
 "{code_reality}" (see {cited_file}:{cited_lines}).
 ·...

These are synced to Ritual; plan mode reads them when you `go`.
Reply `go` to implement (corrections flow in via knowledge graph), `drill {N}` to
inspect, or `pause` to stop.
```

The findings do **not** rewrite the brief. They were already persisted via `sync_brief_review` (a durable `BriefReview` row) at step 5; when the user replies `go`, **plan mode reads the brief + that review via knowledge graph `priorContext`** and the implementation incorporates the corrections — without the brief text changing. If the user has context the agent doesn't ("yes the brief is wrong but ship as-is"), `go` proceeds the same way; the corrections are recorded regardless. The only path to *new brief content* is `generate_build_brief` with `force: true` (full regen from changed source data) — used when the underlying recs/requirements actually changed, never to patch a verification finding.

---

### Output schema — `BUILD-BRIEF-VERIFICATION.md`

Render exactly the sections below. Every section MUST exist (use `(none)` / `(no contradictions)` for empty cases — do not skip).

```markdown
<!--
Generated by Ritual — brief verification pass
Exploration: https://app.ritualapp.cloud/e/{exploration_id}
Source brief:.ritual/local/build-briefs/{exploration_id}/BUILD-BRIEF.md
Do not remove this header.
-->

# Brief Verification — {exploration name}

## Summary

RBs: {T} total · Verified: {N} · Contradicted: {M} · Conflicts: {C} · Not found: {K} · Unverifiable: {U}

{N} + {M} + {C} + {K} + {U} MUST equal {T}. If they do not, RBs were dropped.

{One-paragraph natural-language summary of the verification result. If
contradictions exist, lead with the most load-bearing one. If everything
checked out, state that clearly.}

## ⚠ Contradicted ({M})

(one block per contradicted RB, omit section entirely if M=0)

### `{cited_symbol}` — {cited_file}:{lines.start}-{lines.end}

- **Brief asserts:** "{brief_assertion}"
- **Code reality:** "{code_reality}"
- **Evidence (from the file):**

 ```{language}
 {actual code snippet, ~10 lines}
 ```

- **Recommendation:** {what should change in the brief — concrete next step}

## ✖ Conflicts ({C})

(one block per conflicting RB, omit section entirely if C=0)

### `RB-{n}` — {requirement, one line}

- **Brief asks for:** "{what the RB requires}"
- **This repo:** "{what the codebase actually supports, with the file that shows it}"
- **Why they cannot both hold:** "{the specific incompatibility}"
- **Evidence (from the file):**

 ```{language}
 {the lines that show it}
 ```

## ❔ Unverifiable ({U})

(one line per RB whose recipe cannot run yet, omit section entirely if U=0)

- `RB-{n}` — {why it cannot be checked: describes code not yet written / needs a running system}

## ❓ Not found ({K})

(one block per missing citation, omit section entirely if K=0)

### `{cited_symbol}` — cited in {section}

- **Brief asserts:** "{brief_assertion}"
- **Searched:** {file paths / grep queries the agent tried}
- **Action:** ask the user whether the cited symbol exists under a different name, or whether the brief is referencing something that was renamed / removed.

## ✅ Verified ({N})

(compact list; one bullet per verified citation; no body required)

- `{cited_symbol}` — {cited_file}:{lines.start}-{lines.end} — brief assertion matches code.
-...
```

---

### What this verification step does NOT do

- **Verify everything in the brief.** Only the symbol-citation slice. Pose-level claims, framing, and general direction are out of scope.
- **Read the full file.** Read enough surrounding context to verify the symbol (~10 lines); not the whole file. Capped at ~15 citations total to keep this fast.
- **Edit the brief directly.** Step 10b.5 only writes the **separate** `BUILD-BRIEF-VERIFICATION.md` and syncs it via `sync_brief_review`. `BUILD-BRIEF.md` is never touched — it stays the read-only historical artifact. Findings reach the implementation through plan mode's knowledge graph `priorContext` at Step 11, not through a brief rewrite. (Regenerating from changed source data is a different operation — `generate_build_brief` with `force: true` — not part of this step.)
- **Persist per-finding rows to the knowledge graph.** The review as a whole syncs via `sync_brief_review`; per-finding inheritance (future briefs on overlapping files automatically inheriting verified facts) is not yet available.

---

### Anti-patterns

- **❌ Fabricating evidence.** Every claim in the output file must trace to a real file + line range that the agent actually Read. If Grep returned nothing, the verdict is `not_found`, NOT "I'll just describe what the function probably does."
- **❌ Re-deriving the brief.** This step is verification, not authoring. Findings exist on a per-citation basis; the agent does not re-write the brief's framing or add new RBs.
- **❌ Skipping the step on backend-only features.** Step 10b.5 fires automatically regardless of UI / non-UI shape. UI-shaped features use `references/ui-ux-checklist.md` (Step 10.5) on top of this step for the additional UI-pattern review — but every brief runs through the citation-level verification.
- **❌ Treating the brief's hedge as authorization to skip.** *"may deviate if codebase has a stronger pattern"* is exactly the case Step 10b.5 exists to resolve. The hedge means "go verify"; don't read it as "no need to verify."
- **❌ Padding the verified list.** Don't enumerate citations the brief didn't actually make just to inflate the "Verified" count. Only cite what the brief cited.

---

### Failure modes to watch for

- **Brief makes ZERO citations.** Some brief generations are framing-only and don't reference specific symbols. The verification pass should write a summary noting *"the brief makes no specific code citations; no verification possible"* and the gate proceeds normally.
- **Symbol exists in multiple places.** When Grep finds the symbol in N>1 files, capture the file the brief most likely meant (use Codebase Anchors context as the disambiguator). If still ambiguous, render one finding per match with verdict `not_found` and surface the ambiguity to the user.
- **Code semantics ≠ visible signature.** A function might be named one thing but documented to do another. Read the docstring + the body; trust the body. If the docstring contradicts the body, that's its own finding (`contradicted` with verdict notes).
- **Brief assertion is too vague to verify.** *"The auth flow needs hardening"* doesn't cite a specific symbol; not verifiable. Skip; verify only the assertions specific enough to check.
