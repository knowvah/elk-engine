<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: close-out

## Steps

1. Stop-1 recheck: `gh pr view 1247 -R eclipse-elk/elk --json state,headRefOid,mergedAt`. Journal.
2. Gate 7: rerun the D3 scripts once more on the final tree (detached, `nice -n 10`); `git diff --exit-code
   test/golden/refs/ test/corpus/generated` must be empty (T2's refs reproduce); `git diff --stat <base> --
   test/golden/refs/` lists only D4 files. Rerun `java-tests.sh …ScanlineOverlapRemovalTest` (`runs=4 failures=0`).
3. Queue gates 1-6 per the README block; journal each result (coverage numbers vs the base's).
4. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (spore-scanline-0004)` as earlier revisions do (patch 0004
   carried, refs moved, evidence, issues filed). Never edit an earlier line.
5. `.agent-notes/spore-scanline-0004.md`: novel observations only (e.g. the first carried behavioural patch; any
   recorder or sweep quirk met). Keep `.agent-notes/spore-scanline-0004-planning.md`.
6. Mission summary at the end of the README (tasks, decisions journaled, gates, issues, known gaps). Mark batches `[x]`.
7. Squash per README "Landing": tag `spore-scanline-0004/pre-squash`, `git reset --soft <base>`, one commit,
   `git -c commit.gpgsign=false commit -F <file>`. `git log --oneline <base>..HEAD` shows one commit. Never push.
8. Comment on #111 with the commit sha and a short result (do not close it; it closes when the branch merges).

## Write-set

`plans/roadmap.md`, `.agent-notes/spore-scanline-0004.md`, `plans/spore-scanline-0004/README.md` (summary, checkboxes),
the journal.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then each passes and is journaled.
- Given `<base>..HEAD`, when listed, then exactly one commit with subject
  `fix(spore): report every overlap of a node inserted into the scanline` and footer `Refs: #111, #104, #108`.
- Given the pre-squash tag, when listed, then it names the per-task history.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: `git reset --soft` to the tag restores per-task history; reverting the squash commit and removing patch 0004
(plus an oracle rebuild) restores the previous state.
