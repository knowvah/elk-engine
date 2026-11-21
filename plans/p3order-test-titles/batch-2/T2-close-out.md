<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/p3order-test-titles/README.md` (mission summary at the end, batch status),
`plans/p3order-test-titles/decision-journal.md`, `.agent-notes/p3order-test-titles.md` (only if novel),
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. Read `src/alg/layered/ElkLayered.ts` for `prepareLayoutTest`. If it is ported (not staged), file a `follow-up`
   issue (not `queue:ready`): `ElkLayeredTestExecutionState.ts:6` says it "is staged until 7f", which 7f made false;
   comment-only fix. If it is still staged, journal that and file nothing. File any other defect found on the way
   the same way.
2. Queue gates 1-7 (README "Quality gates"); journal each result with its numbers. Gate 7 diff against the base must
   be empty.
3. Append `## Revision 2026-MM-DD (p3order-test-titles)` to `plans/roadmap.md` in the form of earlier revisions:
   the three titles retitled (old → new), the closure rows cited, no assertion changed, issues filed, and that the
   7h follow-up named at `plans/layered-compound/decision-journal.md:101` (#62) is done. Never edit an earlier line.
4. Write `.agent-notes/p3order-test-titles.md` (template of `~/.claude/rules/memory.md`) for anything novel; if
   nothing, journal that.
5. Mission summary at the end of `README.md`; mark both batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #62 with the summary and the issues filed (do not close it).

## Acceptance criteria

- Given gates 1-7, when T2 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, ref diff empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #62`, and the tag
  `p3order-test-titles/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
