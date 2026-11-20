<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: case-count proof, gates, close-out, squash

## Context

Issue #46 "Done when": each item consolidated or journaled as kept with the reason, the case count unchanged except
proven duplicates, coverage holds, the queue gates pass. Decisions [D7](../decisions.md#d7-case-count-evidence-from-vitests-json-reporter)
and [D8](../decisions.md#d8-one-commit-on-the-queue-branch).

## Write-set

- `plans/test-helper-consolidation/{README.md,decision-journal.md,inventory.md}`
- `plans/roadmap.md` (append `## Revision <date> (test-helper-consolidation)`; never edit an earlier line)
- `.agent-notes/test-helper-consolidation.md`

## Steps

1. Full suite with `--reporter=json` (sweep dirs off, README gate block) to `$TMPDIR/after-46.json`; compare with the
   mission-start baseline per file (count, titles, status). Journal totals and every difference; anything outside
   D7's list is stop 4. A "timed out in 5000ms" under load that passes when its file reruns alone is journaled, not a
   failure.
2. Grep for leftovers: `function fromPattern`, `elkt-layout-harness`, `function replaySite(id: string): OrderExpected`,
   a private `assertEqualsWithin` outside `junit-delta.ts`. Each hit is either an `inventory.md` `kept` row or a miss
   to fix.
3. Queue gates 1-7 from the README, each journaled with its exit code and figures (coverage four numbers vs the
   base's 98.81 / 96.99 / 98.56 / 98.86; typedoc warnings vs 200; CodeQL accepted set unchanged; `git diff
   --exit-code <base> -- test/golden/refs/` empty).
4. File issues found on the way (`follow-up` for defects or cleanups, `needs-ruling` for stops 3-5); none goes
   `queue:ready`.
5. Roadmap revision: what moved, what was kept and why (counts), the case delta (−199, −3, +N), follow-ups.
   `.agent-notes/test-helper-consolidation.md` for anything novel (for example the runner-order reliance of D4).
   Mission summary at the end of the README; tick the batch table.
6. `npx prettier --check plans/test-helper-consolidation plans/roadmap.md .agent-notes/test-helper-consolidation.md`.
7. Squash per the README's Landing section; comment on #46 with the commit sha, the case delta and any issues filed.

## Acceptance criteria

- Given the two JSON reports, when compared, then the only differences are D7's and each is journaled.
- Given gates 1-7, when run on the finished tree, then each exits 0 and is journaled.
- Given the branch, when T8 ends, then one commit on the base carries the mission and the tag
  `test-helper-consolidation/pre-squash` holds the per-task history.

## Observability / rollback

N/A — test code only. Reversible (revert the one commit).
