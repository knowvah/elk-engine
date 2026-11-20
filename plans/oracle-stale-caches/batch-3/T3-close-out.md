<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Write-set

`plans/roadmap.md` (append only), `plans/oracle-stale-caches/README.md` (mission summary at the end, batch status),
`plans/oracle-stale-caches/decision-journal.md`, `.agent-notes/oracle-stale-caches.md`,
`tools/codeql/accepted.json` (only for an accepted finding, journaled).

## Steps

1. File one `follow-up` issue (not `queue:ready`): the translated `docs-site/<locale>/conformance.md` pages still
   list only `census/` and `sweep/` in § 4 step 1 and § 5 (name the paragraphs T2 changed). File any other defect
   found on the way the same way.
2. Queue gates 1-7 (README "Quality gates"); journal each result with its numbers. Gate 7: `test/golden/refs/` and
   `tools/vectors/` diffs against the base are empty. A CodeQL finding on the new test is fixed, not accepted, unless
   it is a proven false positive (journal the proof).
3. Append `## Revision 2026-MM-DD (oracle-stale-caches)` to `plans/roadmap.md` in the form of earlier revisions:
   what changed in `build.sh` (filter, guard), the test and its cases, the live proof (output line, unchanged hash,
   no rebuild, cache warm), the docs changed, issues filed, and that #85's options 2 and 3 were rejected (D1). Never
   edit an earlier line.
4. Write `.agent-notes/oracle-stale-caches.md` (template of `~/.claude/rules/memory.md`) for anything novel: at least
   that the text-sizing-seam excludes workaround is no longer needed for the cache roots, and how to verify the live
   oracle without colding the vector cache (D3).
5. Mission summary at the end of `README.md`; mark all batches `[x]`. Squash per README "Landing"; journal the tag
   and the commit. Comment on #85 with the summary and the issues filed (do not close it; it closes when the branch
   merges).

## Acceptance criteria

- Given gates 1-7, when T3 ends, then all are green and journaled with their numbers (coverage four percentages,
  test counts, typedoc warning count, CodeQL result, both gate-7 diffs empty).
- Given the branch, then exactly one commit sits on the base, with footer `Refs: #85`, and the tag
  `oracle-stale-caches/pre-squash` holds the per-task history.
- Given `plans/roadmap.md`, then only appended lines differ from the base.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: `git reset --soft` to the base undoes the squash; the tag keeps the history.
