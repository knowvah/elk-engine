<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: close-out

## Write-set

`docs/translation-rules.md` (final counts in § 6.8), `plans/roadmap.md` (append only), `plans/dev-assert/README.md`
(mission summary at the end), `plans/dev-assert/{inventory,decision-journal}.md`, `.agent-notes/dev-assert.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. § 6.8: add the outcome in one line: restored / `restored (throw kept)` / not portable counts, a link to
   `plans/dev-assert/inventory.md`.
2. `grep -rnE "no devAssert helper|devAssert helper (yet|exists)|assertions are (off|disabled)|omitted.*assert|assert.*omitted" src`:
   every hit is either a `not-portable` row's comment or removed. Journal the residue.
3. File `follow-up` issues (not `queue:ready`), each self-contained:
   - Migrate the three AssertionError stand-ins (`DefaultLinkingService.ts:53-60`, `CyclicLinkingException` in
     `LazyLinkingResourceTypes.ts`, `SplinesMath`'s private-constructor throw if ported) onto
     `src/java/lang/AssertionError.ts`, with the Java parent chains.
   - The `restored (throw kept)` arms: the Java returns a value after `assert false`, the port throws. List the rows.
   - A corpus sweep of the TS port with assertions on, to find port defects the suite does not reach.
   - Any defect found on the way.
4. Queue gates 1-7 (README "Quality gates"); journal each result. Gate 7 diff against the base must be empty.
5. Append `## Revision 2026-MM-DD (dev-assert)` to `plans/roadmap.md` in the form of earlier revisions: the helper,
   counts, issues filed, and that "Any time: devAssert" follow-ups of earlier revisions are closed by this mission.
   Never edit an earlier line.
6. Write `.agent-notes/dev-assert.md` (template of `~/.claude/rules/memory.md`) for anything novel, such as how Vitest
   `setupFiles` interact with the switch and any assertion that fired.
7. Mission summary at the end of `README.md`. Squash per README "Landing"; journal the tag and the commit. Comment on
   #45 with the summary and the issues filed (do not close it).

## Acceptance criteria

- Given gates 1-7, when T8 ends, then all are green and journaled with their numbers (coverage four percentages,
  typedoc warning count, CodeQL result, ref diff empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #45`, and the tag
  `dev-assert/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
