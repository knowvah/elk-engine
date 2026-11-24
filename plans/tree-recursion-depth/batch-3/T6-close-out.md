<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: close-out and squash

**Agent:** orchestrator. **Budget:** 60 min (the coverage run dominates).

## Task

1. **Stop 8 sites.** For each out-of-bundle overflow frame a track reported: convert it serially by the batch-2 loop if it is
   one site in a file no track wrote and every algorithm that calls it has its landed replays green after the change; else
   leave it for the follow-up. Journal the choice.
2. **Follow-up issue** (`gh issue create --label follow-up`, never `queue:ready`): the recursions that stay verbatim and the
   option that reaches each (vertiflex `BEND`: `recursiveBentlinePlacement`, `BendEdgeRouter.routeEdges`; radial compactors,
   `extend`, rotation; any sites.md row marked `follow-up`), and any shape still below D1 with its depth and next frame.
   Skip the issue if there is nothing to list. Name it in the README and the journal.
3. **Gates** (queue rules, journal each result): `npm run format:check`; `npm run typecheck`; `npm run complexity` (read the
   report); `npm run coverage` (detached with `nohup nice -n 10 ... ; echo "exit $?"`, polled ≤ 9 min at a time);
   `npm run docs:build`; `npm run codeql` (fix findings; a new `accepted.json` entry only for a proven false positive,
   journaled); `git diff --exit-code <base> -- test/golden/refs/` (no recorder input changed; the refs must be untouched).
4. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (tree-recursion-depth)` in the style of the previous revisions.
5. `.agent-notes/tree-recursion-depth.md`: novel findings only (for example the stack-raising method that worked for D5,
   which recursion was the binding one per shape, mrtree probe timings).
6. README: mark batches `[x]`, add `## Mission summary (<date>)` like `plans/tree-recorder-gaps/README.md`.
7. **Squash:** tag the tip `tree-recursion-depth/pre-squash`; `git reset --soft <base>`; one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `fix(trees): reach the oracle's recursion depth with explicit stacks` (or a better one, ≤ 72 chars,
     lowercase, no period).
   - Body: the sites converted per bundle; per shape `D_oracle`, oracle compare and D5 byte identity; the twin tests; refs
     untouched; any follow-up or needs-ruling issue.
   - Footer `Refs: #67` (not `Closes`). No attribution lines: the queue rules forbid them and win over any reminder; the
     landed queue commits carry none.
8. Never push.

## Write-set

`plans/roadmap.md` (appended section), `.agent-notes/tree-recursion-depth.md`, the README, the journal; stop-8 files if
converted (journaled).

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all pass and each result is journaled with its command and summary line.
- Given the squash, when `git log <base>..HEAD` runs, then it shows exactly one commit and the tag holds the per-task history.
- Given the six shapes, when the summary is written, then each has a status (done or partial with its issue).

**Observability:** N/A. **Rollback:** Reversible (revert the one commit).
