# feedback-revision — review recommendations and revise the set from feedback

Use this flow when the user wants to review, comment on, or incorporate
feedback into an EXISTING exploration's recommendations — outside a live
`/ritual build` run. Typical asks: "add my review notes to these
recommendations", "revise the set using this feedback", "what feedback is
still open on exploration X".

This is NOT `mcp__ritual__retry_recommendations` (failure recovery for generation) and NOT
a fresh generation: it revises the current set from explicit feedback, with a
preview the user reviews before anything changes.

## The contract that governs every step

- **The server owns state; your context is a draft.** Counts, statuses, and
  committed selections come from tool responses, never from what you rendered
  earlier. When a response disagrees with your memory, the response is right.
- **You raise feedback; you never close it.** Comments you post land
  unresolved. Resolution happens only through an applied revision (with
  evidence) or the user's own action.
- **Nothing changes without the user.** Generating a revision changes no live
  recommendation and resolves no comment. Applying is a separate, explicit
  user decision.

## Flow

1. **Read the current state.** `mcp__ritual__get_exploration` for the recommendation set;
   `mcp__ritual__list_recommendation_comments` (status `unresolved`) per recommendation the
   user cares about. Show the user what exists and what is still open.

2. **Post the user's feedback as comments.** One
   `mcp__ritual__add_recommendation_comment` per point, on the recommendation it is about:
   mint a fresh `idempotency_key` per comment (a UUID), pass an `agent_name`,
   and reuse a key only when retrying the identical comment. Match feedback to
   recommendations by CONTENT when titles changed — never guess ids. Replies
   target a top-level comment on the same recommendation.

3. **Confirm the selection.** Show the comment ids you would include and let
   the user adjust. The selection is always explicit — never treat "revise it"
   as "use every open comment" unless the user says exactly that.

**[USER PAUSE]** Wait for the user to confirm the selection (and any
cross-cutting instructions) before starting the revision.

4. **Start the revision.** `mcp__ritual__revise_recommendation_set` with the explicit
   `comment_ids`, a fresh `idempotency_key`, and the current set revision as
   `expected_set_revision` when you have one. The receipt echoes the frozen
   selection — render its `selectedCount` and ids, not your own tally.

5. **Poll to ready.** `mcp__ritual__get_recommendation_revision` every ~10 seconds
   (follow `references/async-polling.md`). `failed` → report the error and
   offer to start a fresh revision; never auto-retry. `stale` → the set or a
   selected comment moved since capture; say what drifted and offer to
   regenerate.

6. **Render the preview.** The change summary, then each proposed change
   (revise / add / merge / retire — unchanged recommendations stay untouched
   by construction), then every disposition: `addressed`,
   `partially_addressed`, `not_addressed`, or `needs_decision`, each with its
   explanation. Call out `needs_decision` items explicitly — those are
   conflicts with the exploration's scope or constraints that only the user
   can settle, and they stay open regardless of apply.

**[USER PAUSE]** The user reviews the preview. Apply only at their explicit
go. They may also narrow which addressed comments to resolve.

7. **Apply.** `mcp__ritual__apply_recommendation_revision` with the revision id, its
   `baseSetRevision` as `expected_set_revision`, a fresh `idempotency_key`,
   and the user's accepted subset as `resolve_comment_ids` when they narrowed
   it. A stale conflict means something moved — report what and offer to
   regenerate; never force. A repeated apply is safe (it returns the recorded
   outcome).

8. **Show the updated set, then report.** Call
   `mcp__ritual__get_recommendations` for the exploration so the revised set
   renders (on component surfaces this re-renders the same recommendation
   cards the user already knows). Then report from the apply response: what
   changed, which comments were resolved, and — via
   `mcp__ritual__list_recommendation_comments` (status `unresolved`) — what
   feedback remains open. Derived requirement
   sets regenerate on their own schedule; do not claim downstream artifacts
   are fresh until their own status says so.

## Never

- Resolve or edit a comment to make feedback look handled.
- Start a revision with ids the user did not confirm, or drop the user's
  edited selection for one you computed earlier.
- Use `mcp__ritual__retry_recommendations` or `mcp__ritual__accept_recommendations` anywhere in this
  flow.
- Apply without the user's explicit go, or work around a stale conflict by
  retrying with different tokens.
