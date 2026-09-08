# Change pre-flight — restate-before-mutate

When the user asks to **change or add** something via a free-text instruction, the agent has to
*translate* that instruction into a tool call (a `change_prompt`, an anti-goal text, etc.). That
translation is where intent gets lost: a misread re-rolls the artifact in the wrong direction, and
the user only finds out *after* the regeneration. This protocol puts a confirmation **before** the
mutating call: the agent restates what it heard and shows the exact request it's about to send, and
waits for a `yes`.

This is **not** forward-flow confirmation theatre — the default happy path is deliberately
un-gated (no template-pick confirm, no sub-problem accept pause). This gate fires **only** on an
explicit, free-text *change/add* request — where the input is ambiguous by nature and a read-back is
genuinely protective.

## When it fires

Before **every** call to a tool that mutates an artifact from a free-text user request:

| User asks (free text) | Tool the agent is about to call |
|---|---|
| "rethink / change the sub-problems", "show me other angles" | `refine_considerations` |
| "tighten / broaden / reframe / drop X from the scope" | `refine_problem_statement` |
| "add an anti-goal", "don't touch X", "keep Y out of scope" | `set_anti_goals` |

**Always fire — no exceptions for "obvious" requests.** Even a one-word `tighten` or `broaden` gets
the restate. The user chose maximum safety here: a one-word instruction is exactly where the agent is
most tempted to guess a direction, so it's still confirmed.

**Does NOT fire on the forward CTAs** — `use` / `run` / `accept shortlist` / `proceed` and their
aliases already have their own gates. Double-gating those is exactly the confirmation theatre this flow avoids. This protocol is
*only* for the mutate-from-free-text tools above.

## Hard pause — even in auto-mode

This is a real `[USER PAUSE]`. In auto-accept / bypass-permissions mode it **still stops and waits**
for an actual `yes`. Mutations are where a misread is most costly, so the agent never auto-applies a
change on the user's behalf — auto-mode collapses *forward* pauses, not this one. Per the SKILL
preamble: never infer, never default, never press on without a real reply.

## The template

Render this block, then **stop and wait**:

```
Got it — you want to {specific restatement of the change, in the user's own terms}.

Here's what I'll do: {plain-English effect on the artifact}. I'll ask Ritual to
{refine the sub-problems / refine the problem frame / add this anti-goal} with this instruction:

 → "{the EXACT change_prompt / anti-goal text the agent will send the tool}"

Apply this? Reply `yes`, or tell me what to adjust.
```

Rules for the block:
- **Restate specifically.** "drop the observability sub-problem and add a rollout-safety one" — never
 a generic "you want to make a change." If the agent can't restate the request specifically, it
 doesn't understand it yet: ask a clarifying question instead of guessing a `change_prompt`.
- **Show the literal request.** The `→ "..."` line is the *exact* string going into the tool
 (`change_prompt` verbatim, or the anti-goal `text`). This is the whole point — the user is
 validating the instruction the model will actually send, not a paraphrase of it.
- **One confirm token.** `yes` applies. Treat `y`, `apply`, `go`, `do it` as aliases; do not display
 them.

## On the user's reply

- **`yes`** → make the tool call exactly as shown. Do not silently alter the `change_prompt` after
 confirmation.
- **An adjustment** ("no, keep observability, just add rollout-safety") → fold it into the
 `change_prompt`, re-render the block **once** with the revised instruction, and wait again. This is
 a single re-confirm, **not** an open loop — after the second render, a `yes` applies and any further
 change is treated as a fresh request (new restate).
- **`pause` / `stop`** → honor it; do not call the tool.

## Note — "add a question or matter that wasn't there"

Adding a *net-new* discovery question or matter is handled inside the discovery walk itself
(`build-flow.md` § 7.3, via `create_discovery_matter` +
`add_discovery_question`): the user types the question text and the walk commits it
**verbatim**, so there is no free-text *translation* to validate and this pre-flight does not fire
there. This protocol covers the three translate-then-mutate tools listed above; any future tool that
turns a free-text instruction into a mutation MUST route through it.
