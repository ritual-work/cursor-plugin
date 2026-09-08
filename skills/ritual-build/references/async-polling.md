# Async polling contract

Use this for every long-running Ritual/MCP operation: discovery generation, agentic runs, requirement generation, build brief generation, and future async status surfaces.

## Standard poll loop — poll until terminal, never escalate

- **Poll until the status tool reports a terminal state.** One status read per turn: call the status tool, decide continue or exit, take the next turn.
- **Never escalate the interval.** A constant cadence is the whole discipline — a creeping interval is how a poll loop turns into a stall.
- **A poll turn emits NOTHING.** Polling is machinery: the user sees the gate that follows, never the loop that got there. Do not narrate the poll (`Polling.`, `Checking state.`), the transition (`Scope locked;`, `Answers committed;`), or the outcome (`Discovery is ready.`).
- The ONLY exception is a single approved status line from `build-flow.md` Voice rule #8, **rendered verbatim** while a slow step runs — `Still generating…`, `Recommendations ready.` A paraphrase is a leak: `Recommendations are ready.` is not the approved line.
- At most one such line while a step runs, not one per poll.

### Pacing is your host's business, not this contract's

Hosts differ in whether they let you idle at all, and a host that allows it today may
refuse it tomorrow. So this contract does not name a wait mechanism or a duration.

- **If your host offers a wait primitive, use a SHORT constant one** between polls.
- **If your host refuses to let you idle, just take the next turn and call the status tool again.** That is a correct poll loop, not a workaround — turn latency already paces it, and a status read is cheap.
- **Never manufacture a wait out of a condition nothing will satisfy.** A loop spinning on a sentinel file that nothing will ever create does not wait for the operation — it waits for a timeout, and it never exits on its own. Poll the status tool instead. (`ritual status --watch` does follow a run from a shell, but it is a live dashboard for the USER to read in their own terminal — it redraws in place and emits no machine-readable state, so it is not a predicate to build a loop around.)
- **Never chain or inflate waits to get around a host that blocked one.** If a wait is refused, poll without it.

### Wrong vs right

**Wrong** — the interval creeps up, and each refusal invites a worse substitute:

```
Turn 1: wait, then status → still running
Turn 2: wait LONGER → still running ← escalating
Turn 3: wait LONGER STILL → refused by the host
Turn 4: spin on a sentinel file that never appears ← now it cannot exit at all
```

**Right** — constant cadence; the loop ends when status says so:

```
Turn 1: status → still running
Turn 2: status → still running
Turn N: status → terminal state → exit loop
```

User-facing: while a step runs you may render `Still generating…` verbatim. Everything else the
loop does is invisible — the gate that follows is the output.

**A truncated approved line is still a leak.** `Generating…` is not `Still generating…`, and
`Recommendations are ready.` is not `Recommendations ready.` These read as trivially close and
are scored as leaks, because an allowlist that accepts near-misses is not an allowlist. Copy the
line; do not reconstruct it from memory.

**And exactly ONE line, never two.** `Requirements ready. Generating…` is two
approved lines concatenated, which is not an approved line — the allowlist matches
a whole message, not the pieces it was assembled from. If a step finished and the
next one started, that is the next gate's job to show, not a second status line.

## What you poll, and how often

Each operation has its own cadence, matched to how fast that job actually moves —
they are not interchangeable. Poll the tool named here, never a proxy for it.

| Operation | Poll | Cadence | Terminal states |
| --- | --- | --- | --- |
| Discovery generation | `get_discovery_state(exploration_id)` | ~10s | `ready: true` · `stalled` |
| Answering — server agentic run | `get_agentic_run(run_id)` | ~20s | `COMPLETED` · `FAILED` · `CANCELLED` |
| Recommendations | `get_exploration_status(exploration_id).recommendationsStatus`, or `get_recommendations` — both carry it | ~20s | `ready` · `empty` · `failed` |
| Requirement set | `get_requirement_set_status(exploration_id)` | ~5s | `READY` · `FAILED` |
| Build brief | `get_build_brief_status(exploration_id, icp)` | ~5s | `READY` · `FAILED` |

The cadences match the Ritual web app's, so both surfaces observe the same job at the same
rate. They describe how often to ASK — not how to wait, which is your host's business
(§ Pacing above).

`stalled` and `FAILED` are **not** wait-longer states: polling on will never clear them.
Neither is a `GENERATING` that outlives the operation's normal span — if discovery or
recommendations sit unchanged past ~10 minutes, surface it as an anomaly rather than
polling on silently.

## Timeout recovery

If a write/generate call times out locally but server-side work may still be running, do not blindly regenerate. Call the matching status tool first and poll:

- `get_requirement_set_status` after requirement generation
- `get_build_brief_status` after build brief generation
- `get_agentic_run` after agentic run start/resume

Regenerate only when status proves work did not start, failed, or the user explicitly requests a fresh roll.
