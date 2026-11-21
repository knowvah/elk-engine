<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: close-out

## Steps

1. Gate 7: rerun the three recorders (placement, routing, pipeline) on the final tree, one at a time, detached under
   `nice -n 10`; `git diff --exit-code test/golden/refs/` must be empty (T2-T4 refs reproduce); `git diff --stat <base> --
   test/golden/refs/` lists only the D5 refs, and the D5 id-keyed diff against the base passes for each.
2. Queue gates 1-6 per the README block; journal each (coverage numbers against the base's 98.81 / 96.99 / 98.56 /
   98.86).
3. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (layered-evidence-gaps)` as earlier revisions do: the four items
   and how each closed, rows added per ref, any proof, issues filed. Never edit an earlier line.
4. File `follow-up` issues (never `queue:ready`) for anything found on the way, e.g. a ptolemy IPP row (D1), the
   `plans/layered-edge-routing/unreached.md:31` / `:105` corrections. Name every `needs-ruling` issue from a stop.
5. `.agent-notes/layered-evidence-gaps.md`: novel observations only. Keep `.agent-notes/layered-evidence-gaps-planning.md`.
6. Mission summary at the end of the README (tasks, decisions journaled, gates, issues, known gaps). Mark batches `[x]`.
7. Squash per README "Landing": tag `layered-evidence-gaps/pre-squash`, `git reset --soft <base>`, one commit,
   `git -c commit.gpgsign=false commit -F <file>`. `git log --oneline <base>..HEAD` shows one commit. Never push.
8. Comment on #49 with the commit sha and a short result (do not close it; it closes when the branch merges).

## Write-set

`plans/roadmap.md`, `.agent-notes/layered-evidence-gaps.md`, `plans/layered-evidence-gaps/README.md`, the journal.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then each passes and is journaled.
- Given `<base>..HEAD`, when listed, then exactly one commit with footer `Refs: #49`.
- Given the pre-squash tag, when listed, then it names the per-task history.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: `git reset --soft` to the tag restores per-task history; reverting the squash commit restores the base.
