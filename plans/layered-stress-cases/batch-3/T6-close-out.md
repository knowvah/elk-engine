<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: gates, roadmap revision, notes, squash

## Steps

1. Queue gates 1-7, journaled with their numbers:
   1. `npm run format:check`
   2. `npm run typecheck`
   3. `npm run complexity`: read the report, not the exit code
   4. `npm run coverage`: 90/90/90/90, full suite. Deleting `stress-pending.ts` removes a covered helper. Check that the
      totals stay above the floor, and that `layout-test-runner.ts` keeps its coverage.
   5. `npm run docs:build`
   6. `npm run codeql`: every finding is accepted in `tools/codeql/accepted.json` with a reason. Any new entry is
      journaled.
   7. `git diff --exit-code <base> -- test/golden/refs/ ':!test/golden/refs/java/layered-label-metrics.json'` is clean.
      The metrics diff is exactly T1's append. The rerun recorder is T1's. No other recorder's inputs changed: D4 shows
      the compound recorder's `MODEL_TABLE` excludes the two new files, so say so in the journal.
2. Append `## Revision 2026-11-<dd> (layered-stress-cases)` to `plans/roadmap.md`, as earlier revisions do. Edit no
   earlier line.
3. Write `.agent-notes/layered-stress-cases.md` for anything novel, or record "no novel discoveries".
4. Fill in this brief's README "Mission summary" and mark every batch `[x]`.
5. Squash (D8): `git tag layered-stress-cases/pre-squash`, `git reset --soft <base>`, then one commit with
   `git -c commit.gpgsign=false commit -F <file>` (subject ≤ 72, lines ≤ 80, `Refs: #58`, no attribution lines).
   Never push. Leave the labels alone: the driver swaps `queue:planned` for `queue:on-branch`
   (`.claude/mission-driver.sh:358` in the main checkout). End with the driver's outcome line (`MISSION: done`).

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and journaled.
- Given `git log <base>..HEAD`, then exactly one commit exists, with `Refs: #58`.
- Given the ref diff against the base, then only `layered-label-metrics.json` changes, by 4 appended keys.

## Observability

N/A.

## Rollback

Reversible: the pre-squash tag keeps the per-task history.
