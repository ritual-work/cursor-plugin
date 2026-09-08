## UX brief review — methodology + output schema

Reference for `/ritual build` Step 10.5 (the opt-in `ux-review` path) and any standalone caller that needs the same shape.

The brief that came out of Step 10 is implementation-ready from a *what* standpoint (RBs, requirements, acceptance criteria). This review is implementation-ready from an *experience* standpoint — the things coding-agent plan mode otherwise interrogates the user for, surfaced and answered with evidence before any code is touched.

The output is a single file, `UX-REVIEW.md`, written alongside `BUILD-BRIEF.md`. It is repo-grounded (every claim cites a brief line or a repo analogue), brief-aware (does not re-derive what the brief already nails), and auditable (gaps and mismatches surface explicitly rather than buried in prose).

---

### Core principle

**Make the coding agent reason about the experience before it reasons about files.**

The plan mode prompt at the end of `UX-REVIEW.md` is the load-bearing artifact. Plan mode reads it on entry instead of inventing its own questions.

---

### Methodology (chain of thought — execute in this order)

Do NOT skip to the output schema. Walk these six steps; the schema only gets filled correctly when the analysis upstream is done.

**1. Read the brief end-to-end first.**

Open `BUILD-BRIEF.md`. Identify what it covers vs what it's silent on. The brief itself is signal:

- An exhaustive states table → most state sections will be "covered in BUILD-BRIEF.md §X; no additions needed."
- A missing copy section → that's where to focus; copy is high-leverage and almost always under-specified.
- A "Non-goals" section listing UI surfaces explicitly out of scope → DO NOT add UX recommendations that contradict the non-goals.

Output of this step: a one-line classification of the brief — what's well-covered (skip in the review), what's thin (deep-dive in the review), what's silent (gap-flag in the review).

**2. Identify the UI surfaces the brief implies.**

Pull a list of every screen, component, modal, drawer, form, list, page, route, view, dashboard, panel, toast, banner, etc. that the brief mentions or implies. Be literal — if the brief says "users see a confirmation," that implies at minimum: a confirmation surface + the action that triggered it + the dismissal path.

Output of this step: a flat list of UI surfaces with one-line "purpose" each.

**3. For each implied surface, find existing analogues in the repo.**

Use Grep / Glob / Read. Search by:

- Exact name: `<surface>` (e.g. `ConfirmModal`, `EmptyState`, `DrawerPanel`).
- Component-library import: imports from the repo's design-system package, `@radix-ui/*`, `shadcn-ui`, `@mui/material`, `@chakra-ui/*`, etc.
- Route shape: similar `/path/to/feature` routes already in the app.
- Sibling features: features one directory over that ship the same shape.

Output of this step: for each implied surface from step 2, the closest existing analogue (file path + ~5-10 line excerpt of the relevant pattern) OR `"no analogue found — new pattern needed"`.

**4. Compare brief requirements vs analogue patterns.**

For each (implied surface, analogue) pair, classify:

- **Covered** — brief specifies X, analogue already handles X. Skip in the review or note as "use existing pattern, no decisions needed."
- **Mismatch** — brief asks for X, analogue does Y. Surface for plan mode: is this intentional (the new feature deliberately diverges) or unintentional (the brief was written without knowing the analogue exists)?
- **Gap** — brief silent on X, but X is standard in this codebase (the analogue always handles X). Surface for plan mode: the brief should specify, or the agent should follow the codebase default.
- **New work** — brief specifies X, no analogue. Flag: this surface needs to be designed, not extended.

Output of this step: three lists — mismatches, gaps, new-work surfaces. With evidence (file path / line / brief reference) on each entry.

**5. Fill the 12 sections WITH EVIDENCE.**

Now — and only now — fill the output schema below. Rules:

- Each claim cites either a `BUILD-BRIEF.md §X` line OR a repo file path. Both is better.
- Sections the brief already covers get one line: *"Covered in BUILD-BRIEF.md §<section>; no additions needed."* Do not re-derive.
- Sections the brief is silent on but the codebase implies a default for: *"Brief silent. Codebase default (`<path>`): <one-line pattern>. Recommend following the default."*
- Sections that are real gaps: *"Brief silent. No codebase default. Plan mode must address: <one-line question>."*
- States that the brief does not require: omit. An empty state entry means "the brief does not require this state and the analogue does not either" — that is a valid signal.

**6. Generate the plan-mode prompt with the surfaced findings.**

The plan-mode prompt is NOT generic. Its first three numbered items are the surfaced mismatches, gaps, and new-work surfaces from step 4. Plan mode then has to address those specifically — not walk a generic 10-step plan.

The plan-mode prompt MUST end with the literal sentence:

> Do not start coding until the plan is approved.

---

### Output schema — `UX-REVIEW.md`

Render exactly the sections below. Every section MUST exist (use the "Covered in BUILD-BRIEF.md" / "Brief silent" patterns rather than skipping). Sub-state entries under "States" are the only optional content.

```markdown
<!--
Generated by Ritual — UX brief review
Exploration: https://app.ritualapp.cloud/e/{exploration_id}
Source brief: BUILD-BRIEF.md
Do not remove this header; it preserves implementation lineage.
-->

# UX Brief Review — {exploration name}

## User Goal

{What the user is trying to accomplish. Cite the brief's Goal section. One paragraph max.}

## Primary Flow

{Step-by-step happy path from the user's perspective. Cite brief lines. If the brief already enumerates this, write "Covered in BUILD-BRIEF.md §<section>" + a one-line summary.}

## Screen / Component Requirements

{What UI needs to exist, including layout, hierarchy, states, and interactions. For each surface: the implied surface from methodology step 2 + its closest repo analogue from step 3 + whether it's covered / mismatch / gap / new work from step 4.}

## Interaction Details

{Clicks, hovers, keyboard behavior, drag/drop, focus, transitions, gestures. Cite the analogue's existing interaction patterns when reusing; specify deliberately when diverging.}

## States

(omit any state the brief does not require AND the analogue does not handle)

- **Empty**: {description + analogue path or "new"}
- **Loading**: {description + analogue path or "new"}
- **Error**: {description + analogue path or "new" — include error message tone if the codebase has a convention}
- **Success**: {description + analogue path or "new"}
- **Disabled**: {description + analogue path or "new"}
- **Permission-restricted**: {description + analogue path or "new"}
- **Mobile / narrow**: {description + breakpoint convention from analogue or "new"}

## UX Risks

{Where the user may get confused, stuck, or surprised. Anchored on the gaps + mismatches from methodology step 4. Each risk one line + one mitigation line.}

## Visual Hierarchy

{What should be most prominent, secondary, hidden, grouped, or de-emphasized. Cite analogue patterns when reusing; flag when the brief implies a hierarchy that conflicts with the codebase.}

## Copy Requirements

{Button labels, helper text, error messages, confirmation text, tooltips. Brief lines if the brief specifies; codebase-convention examples if not; "needs writing" entries flagged for plan mode otherwise.}

## Accessibility Requirements

{Keyboard navigation, focus states, contrast, labels, ARIA expectations, reduced motion. Anchored on the codebase's existing a11y patterns (search for `aria-`, `role=`, `:focus-visible`, `prefers-reduced-motion` in analogues).}

## Responsiveness

{Desktop / tablet / mobile behavior. Use the codebase's breakpoint convention (search tailwind.config / theme files / media queries in analogues). Flag if the brief implies breakpoints that diverge from the convention.}

## Design System Fit

{Existing components to prefer, patterns to reuse, styling constraints to avoid custom one-offs. For each implied surface from methodology step 2: which existing component or token set is the right base, with file paths. When no design system exists in the repo: state that clearly and instruct plan mode to discover patterns or propose an anchor.}

## Acceptance Criteria

{Experiential checks ON TOP OF the brief's RB-level criteria. Per-state, per-viewport, copy correctness, focus order, keyboard nav, reduced-motion, color-contrast. Each criterion concrete enough to verify in QA — no "feels right" entries.}

## Plan Mode Prompt

The agent should paste this verbatim into plan mode (or the agent itself should adopt it as the first instruction when entering plan mode).

```
You are about to enter plan mode for a UI/UX implementation task.

First, inspect the existing UI patterns, components, routes, design-system conventions, and nearby implementations. Do not edit files yet.

Specifically address before proposing any plan:
1. {mismatch from methodology step 4 — concrete one-liner}
2. {gap from methodology step 4 — concrete one-liner}
3. {new-work surface from methodology step 4 — concrete one-liner}
   (repeat 4–6 for the next most load-bearing surfaced items)

Then return a plan that includes:
- Existing patterns you found (cite file paths)
- User flow summary
- Components / screens likely affected
- UI states to implement (referencing the States section of UX-REVIEW.md)
- Accessibility considerations (referencing the Accessibility Requirements section)
- Responsive behavior (referencing the Responsiveness section)
- Copy or microcopy needed (referencing the Copy Requirements section)
- Risks or ambiguous UX decisions (referencing the UX Risks section)
- Test/QA plan (referencing the Acceptance Criteria section)
- Proposed implementation steps

Do not start coding until the plan is approved.
```
```

---

### What this review is NOT

- **Not a re-derivation of the brief.** If the brief already specifies a state, the review says so in one line and moves on. The review's value is on the gaps, mismatches, and codebase-grounding — not on rewriting good content.
- **Not an excuse to expand scope.** Stay within the brief's Goal and Non-goals. UX coverage gaps that fall OUTSIDE the brief's scope go on the deferrals list, not the acceptance criteria.
- **Not a design tool.** This produces a planning packet, not visual designs. Where the codebase has no design system, the review surfaces that fact and routes back to the user — it does not propose one unilaterally.
- **Not a check on existing implementations.** Use `/ritual lineage` for "what decisions shaped this code already." This review is forward-looking only.

---

### Failure modes to watch for

- **Generic checklist filling.** Symptom: every section reads the same regardless of the brief / repo. Mitigation: methodology step 1's classification — if the output doesn't reflect what the brief actually covers vs misses, the analysis upstream wasn't done.
- **Fabricating analogues.** Symptom: review cites file paths that don't exist. Mitigation: every file path claim must come from an actual Grep / Glob / Read result in methodology step 3.
- **Plan-mode prompt with no surfaced findings.** Symptom: the numbered list at the top of the plan-mode prompt is a generic 10-step plan. Mitigation: methodology steps 4 and 6 — the first 3–6 items must be the actual mismatches, gaps, and new-work surfaces from step 4. If those lists were empty, the brief is unusually complete; the prompt's first three items should reflect that ("Brief is unusually complete; verify each state listed under §X exists in the codebase before extending").
- **Scope drift.** Symptom: review proposes UI work the brief deliberately excluded under Non-goals. Mitigation: re-read Non-goals before drafting the review; deferrals list is the right destination for out-of-scope UX gaps.
