<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: gates, records and squash

**Owner:** orchestrator. **Budget:** 60 min (most of it the coverage run).

## Write-set

- `plans/roadmap.md` (an appended `## Revision <date> (rectpacking-next-row-arm)` section; no earlier line changes)
- `.agent-notes/rectpacking-next-row-arm.md` (new, only for novel observations; otherwise journal "no novel discoveries")
- this mission's journal, and the README's batch table and mission summary

## Steps

1. Run queue gates 1-7 in order. Start `npm run coverage` detached and poll it (queue rules). Journal each result as a `gate` row.
   - Gate 7: `git diff --exit-code <base> -- test/golden/refs/`. It must be clean, apart from `rectpacking-extra.json` under D4.
   - Gate 6: a new CodeQL finding is fixed, not accepted, unless it is a proven false positive. No `src/` change is planned, so
     none is expected.
2. Append the roadmap revision: the result, the branch, the evidence, the issue comment, and any filed issue.
3. Write `.agent-notes/rectpacking-next-row-arm.md` if anything novel was found.
4. Fill the README's batch table and add a `## Mission summary (<date>)` section, in the shape of `rectpacking-open-arm`.
5. Tag the tip `rectpacking-next-row-arm/pre-squash`. Then run `git reset --soft <base>` and make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: T2's subject for the branch taken.
   - Body: why the guards are always true (or what was recorded), the evidence counts, gates 1-7, and "no landed ref, vector,
     golden or assertion changed".
   - Footer: `Refs: #107`. No attribution lines (queue rule).
6. Never push.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and each has a journal row with its numbers.
- Given the squash, when `git log --oneline <base>..HEAD` runs, then it prints exactly one commit, and the
  `rectpacking-next-row-arm/pre-squash` tag holds the per-task history.
- Given `plans/roadmap.md`, when diffed against the base, then only appended lines appear.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: the one commit can be reverted, and the tag keeps the per-task commits.
