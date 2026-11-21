<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/java-tests-bundles/README.md` (mission summary at the end, batch status),
`plans/java-tests-bundles/decision-journal.md`, `.agent-notes/java-tests-bundles.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. File a `follow-up` issue (not `queue:ready`) for any defect found on the way; none is expected.
2. Queue gates 1-7 (README "Quality gates"); journal each result with its numbers. Gate 7: `test/golden/refs/` and
   `tools/vectors/` diffs against the base are empty. A CodeQL finding on the new test is fixed, not accepted, unless
   it is a proven false positive (journal the proof).
3. Append `## Revision 2026-MM-DD (java-tests-bundles)` to `plans/roadmap.md` in the form of earlier revisions: the
   thirteen bundles, the fitness test, the 143 classes and their total runs on the pinned oracle (before/after equal),
   the docs changed, that the issue's 124 was 143 with the Xtend suites, and that the env-variable option was rejected
   (D1). Never edit an earlier line.
4. Write `.agent-notes/java-tests-bundles.md` (template of `~/.claude/rules/memory.md`) for anything novel: at least
   that ported Xtend suites are cited as `.xtend` and run as compiled JUnit 4 classes, and that the scratch-copy
   recipes in earlier pages and briefs are obsolete.
5. Mission summary at the end of `README.md`; mark all batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #97 with the summary, the baseline totals and any issues filed (do not close it; it
   closes when the branch merges).

## Acceptance criteria

- Given gates 1-7, when T3 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, both gate-7 diffs empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #97`, and the tag
  `java-tests-bundles/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
