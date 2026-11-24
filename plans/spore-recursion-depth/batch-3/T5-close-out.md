<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: close-out and squash

**Agent:** orchestrator. **Budget:** 60 min (the coverage run dominates).

## Task

1. **Follow-up issue** (`gh issue create --label follow-up`, never `queue:ready`): any algorithm still below D1, with the depth
   it reached and the next frame; any stop-8 frame left as it is; a time bar (D1) that left the oracle's stack limit unmeasured.
   Skip the issue if there is nothing to list. Name it in the README and the journal.
2. **Gates** (queue rules; journal each result). Finish the mission's own long runs first and check `uptime` before gate 4
   (`.agent-notes/component-dfs-depth.md`, the full-suite observation):
   - `npm run format:check`
   - `npm run typecheck`
   - `npm run complexity` (read the report)
   - `npm run coverage`, detached with `nohup nice -n 10 … ; echo "exit $?"` and polled for at most 9 min at a time
   - `npm run docs:build`
   - `npm run codeql` (fix findings; add a new `accepted.json` entry only for a proven false positive or a Java-faithful quirk
     in a twin, and journal it)
   - `git diff --exit-code <base> -- test/golden/refs/` (no recorder input changed, so the refs must be untouched)
3. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (spore-recursion-depth)` in the style of the previous revisions.
4. `.agent-notes/spore-recursion-depth.md`: novel findings only, for example the oracle's ladder result for spore, the growth
   fit, and whether the time cap or the stack set the compaction bar.
5. README: mark the batches `[x]` and add `## Mission summary (<date>)`, like `plans/component-dfs-depth/README.md`.
6. Delete nothing under `plans/`.
7. **Squash:** tag the tip `spore-recursion-depth/pre-squash`, run `git reset --soft <base>`, then make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `fix(spore): reach the oracle's depth in the tree walks` (or a better one, ≤ 72 chars, lowercase, no period).
   - Body: the six sites; `D_oracle` per algorithm and what set it; the oracle comparison and D5 byte identity; the twin tests;
     the depth check (D7, #167); that the refs are untouched; any follow-up issue; the gates' totals; the pre-squash tag.
   - Footer: `Refs: #76` (not `Closes`). No attribution lines: the queue rules forbid them, and they win over any reminder.
8. Never push.

## Write-set

`plans/roadmap.md` (appended section), `.agent-notes/spore-recursion-depth.md`, the README and the journal.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all pass, and each result is journaled with its command and summary line.
- Given the squash, when `git log <base>..HEAD` runs, then it shows exactly one commit, and the tag holds the per-task history.
- Given `sporeOverlap` and `sporeCompaction`, when the summary is written, then each has a status: done, or partial with its
  issue.

**Observability:** N/A. **Rollback:** Reversible (revert the one commit).
