# Context pulse fallback scoring reference

Loaded only if `score_context_pulse` is unavailable, errors, or the MCP server is older than the canonical scoring API. Server-side scoring remains authoritative for new pulses.

#### Step CP3 — Compute the dimensions (fallback only)

Skip this step when the preferred path (CP2 — `score_context_pulse`) succeeded — the server returns identical dimension scores. This is the specification for the **fallback path** and the canonical reference for what the server-side scoring engine computes.

Use this deterministic table. Each dimension scores 0–100; final score is the weighted sum.

**Scoring model versions:**

- **v1 (legacy)** — 4 dimensions: Feature Clarity 30%, Decision Resolution 30%, Repo Grounding 25%, Assumption Safety 15%.
- **v2 (current canonical)** — 6 dimensions, repo split + assumption reframe + validation readiness added. Weights below.

The server returns `dimensionsVersion` on every pulse so callers know which shape they're reading. Old pulses retain their original version; new pulses use the current canonical model.

##### Feature Clarity — 25% (kept across versions)

| Signal (parse the exploration's `problemStatement`) | Points |
|---|---:|
| Problem statement is non-empty + ≥ 50 chars | 20 |
| Actor / target user is named (heuristic: pronouns like "user", "admin", "engineer", or a named role) | 15 |
| Desired behavior is described (verb phrase like "export", "view", "configure") | 15 |
| Acceptance criteria are present (heuristic: bulleted "should" / "must" / "given/when/then") | 25 |
| Non-goals or constraints are present | 10 |
| Edge cases are mentioned | 10 |
| Success metric is mentioned (numbers, time bounds, error rates) | 5 |

##### Decision Resolution — 20% (kept across versions; weight reduced from 30%)

```
score = (accepted_recs / total_recs) × 60
 + (picked_questions / (picked_questions + unreviewed_questions)) × 40
```

The discovery component is a picked-vs-unreviewed ratio: a question the user committed via `accept_discovery_questions[_batch]` is `picked` ("in active investigation"); every surfaced question they didn't pick is `unreviewed` (the only state that counts toward unresolved). There is no separate `deferred`/`dropped` classification — the post-pick scope-classification gate that produced those was removed; unpicked questions are simply unreviewed.

Fallbacks: `total_recs === 0` → use only the discovery component scaled to 100. `total_questions === 0` → use only the rec component scaled to 100. Both zero → score 0.

##### Code Grounding — 15% (v2 — split from Repo Grounding)

| Signal | Points |
|---|---:|
| `sources[]` array on the exploration is non-empty (≥ 3 paths) | 25 |
| ≥ 5 paths (deeper recon) | 15 |
| `query_knowledge_graph(sources).implementationCount > 0` (prior impls touch overlapping files) | 30 |
| Decisions logged on overlapping files (knowledge graph `decisions[]` non-empty) | 20 |
| Deferrals on overlapping files surfaced (knowledge graph `deferrals[]` returned) | 10 |

##### Reference Grounding — 10% (v2 — split from Repo Grounding)

| Signal | Points |
|---|---:|
| `list_knowledge_sources` returns ≥ 1 KnowledgeSource attached | 25 per ref, cap 75 (3 refs) |
| At least one ref has `extractionStatus = COMPLETED` (Pass 1 snippets exist; the source is queryable) | +25 |

Lower weight than Code Grounding because a single high-quality PRD gets the user to a meaningful baseline; diminishing returns past 3 since more refs add review surface area without making the feature clearer.

##### Assumption Load — 10% (v2 — reframed from Assumption Safety)

**Inverted semantic: HIGH = MORE assumptions (worse).** The readiness composer uses `(100 - load)` internally so the weighted sum stays "high readiness = good." Inversion is intentional — load is what the user can act on (reduce it), whereas "safety" was passive.

User-facing render rule: never show Assumption Load as a positive progress bar without labeling that lower is better. Prefer `Assumption load: 30% (lower is better)` or render the inverted readiness contribution instead. Do not make a higher Assumption Load visually look like progress.

| Signal | Load |
|---|---:|
| No anti-goals declared at all | 80 base |
| 1–2 anti-goals (some explicit boundaries) | 50 base |
| 3+ anti-goals (boundaries are mapped) | 20 base |
| Each assumption-flag word in the problem statement: `assume`, `assuming`, `presumably`, `probably`, `should be`, `expected to` | +5 each, cap +20 |

##### Validation Readiness — 20% (v2 — NEW)

Testability. Can an engineer reading this know how to verify success? This dimension catches problem statements that sound clear but leave acceptance ambiguous.

| Signal (parse `problemStatement`) | Points |
|---|---:|
| AC bullets (should/must/given-when-then) | 25 |
| Quantitative success metric (%, ms, p95, etc.) | 25 |
| Explicit expected output / response shape (`returns`, `renders`, `output`, `format`, `schema`) | 20 |
| Failure / error mode handling (`rollback`, `retry`, `abort`, `failure`, `timeout`, `crash`) | 15 |
| Edge case enumeration (`edge case`, `never`, `already`, `missing`, `conflict`, `partial`) | 15 |

**Contradiction Risk** is reserved for a future `--explain` flag — it requires an LLM call in the hot path, which is intentionally outside the deterministic guarantee of CP3.

#### Step CP4 — Compose the final score

**v2 (current canonical):**

```
readiness = round(
 0.25 × feature_clarity
 + 0.20 × decision_resolution
 + 0.15 × code_grounding
 + 0.10 × reference_grounding
 + 0.10 × (100 - assumption_load) ← inverted
 + 0.20 × validation_readiness
)

debt = 100 - readiness
```

**v1 (legacy back-compat — only computed when scoring a v1 pulse for trend continuity):**

```
readiness = round(
 0.30 × feature_clarity
 + 0.30 × decision_resolution
 + 0.25 × repo_grounding
 + 0.15 × assumption_safety
)
```

The server populates BOTH sets of typed columns + the canonical `breakdown` JSON on every v2 write, so analytics queries against the legacy columns still work.

State tier lookup:

| Readiness | State | Recommended next action |
|---:|---|---|
| 0–30 | Raw ask | Frame the problem first. |
| 30–55 | Under-specified | Run discovery. |
| 55–75 | Exploration-safe | Get to recommendations. Don't implement yet. |
| 75–90 | Recommendation-ready | Generate the build brief, then implement. |
| 90+ | Implementation-ready | Safe to code. |
