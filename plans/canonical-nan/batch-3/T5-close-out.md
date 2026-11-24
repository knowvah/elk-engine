<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: close-out and squash

**Agent:** orchestrator. **Budget:** 60 min (the coverage run dominates).

## Task

1. **Follow-up issue** (`gh issue create --label follow-up`, never `queue:ready`): any site left as it is (stops 7, 11),
   and, if the audit shows recorders that cannot record NaN rows because of their guard, one issue proposing the D3
   alternative for the maintainer. Skip it if there is nothing to list. Name it in the README and the journal.
2. **Gates** (queue rules; journal each result):
   - `npm run format:check`
   - `npm run typecheck`
   - `npm run complexity` (read the report)
   - `npm run coverage`, detached with `nohup nice -n 10 … ; echo "exit $?"` and polled for at most 9 min at a time
   - `npm run docs:build`
   - `npm run codeql` (fix findings; add an `accepted.json` entry only for a proven false positive, and journal it)
   - `git diff --exit-code <base> -- test/golden/refs/`, apart from the NaN-only refs T4 journaled
3. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (canonical-nan)` in the style of the previous revisions.
4. `.agent-notes/canonical-nan.md`: novel findings only (for example which sweeps held NaN cases, whether the V8 side ever
   produced an `fff8…` NaN, recorder timings when cold).
5. README: mark the batches `[x]` and add `## Mission summary (<date>)`, like `plans/component-dfs-depth/README.md`.
6. Delete nothing under `plans/`. Delete `.plan-mission-progress.md` if it is still present and untracked.
7. **Squash:** tag the tip `canonical-nan/pre-squash`, run `git reset --soft <base>`, then make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `test(golden): hash nan canonically across layout comparisons` (or better, ≤ 72 chars, lowercase, no
     period).
   - Body: the ruling (#53); the audit count per class; JVM and TS moves and the shared helper; guards kept (D3); the
     fitness test; refs unchanged or the NaN-only list; sweep evidence; follow-up issue; gate totals; the pre-squash tag.
   - Footer: `Refs: #72` (not `Closes`). No attribution lines: the queue rules forbid them and win over any reminder.
8. Never push.

## Write-set

`plans/roadmap.md` (appended section), `.agent-notes/canonical-nan.md`, the README and the journal.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all pass and each result is journaled with its command and summary line.
- Given the squash, when `git log <base>..HEAD` runs, then it shows exactly one commit, and the tag holds the per-task
  history.
- Given the audit table, when the summary is written, then every site is `moved`, `kept` (canonical already), or
  `allowlisted` with its reason, or named in the follow-up.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the one commit).
