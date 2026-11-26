<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: gates, records and squash

**Owner:** orchestrator. **Budget:** 60 min (most of it the coverage run).

## Write-set

- `plans/roadmap.md` (an appended `## Revision <date> (rectpacking-open-arm)` section; no earlier line changes)
- `.agent-notes/rectpacking-open-arm.md` (new, only for novel observations; otherwise journal "no novel discoveries")
- this mission's journal, and the README's batch table and mission summary

## Steps

1. Run queue gates 1-7 in order. Start `npm run coverage` detached and poll it (queue rules). Journal each result as a `gate` row.
   - Gate 7: `git diff --exit-code <base> -- test/golden/refs/`. It must be clean, apart from `rectpacking-extra.json` under D4.
   - Gate 6: a new CodeQL finding is fixed, not accepted, unless it is a proven false positive. No `src/` change is planned, so
     none is expected.
2. Append the roadmap revision: the result, the branch, the evidence, the issue comment, and any filed issue.
3. Write `.agent-notes/rectpacking-open-arm.md` if anything novel was found. A candidate is how an upstream fix can turn an open
   arm into a dead one between pins.
4. Fill the README's batch table and add a `## Mission summary (<date>)` section, in the shape of the earlier missions.
5. Tag the tip `rectpacking-open-arm/pre-squash`. Then run `git reset --soft <base>` and make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject, under D3: `docs(rectpacking): prove the open compaction arm dead at the pin`. Under D4 or D5, use T2's subject.
   - Body: why the arm is dead (or what was recorded), the evidence counts, gates 1-7, and "no landed ref, vector, golden or
     assertion changed".
   - Footer: `Refs: #81`. No attribution lines (queue rule).
6. Never push.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and each has a journal row with its numbers.
- Given the squash, when `git log --oneline <base>..HEAD` runs, then it prints exactly one commit, and the
  `rectpacking-open-arm/pre-squash` tag holds the per-task history.
- Given `plans/roadmap.md`, when diffed against the base, then only appended lines appear.

## Observability

N/A.

## Rollback

Reversible: the one commit can be reverted, and the tag keeps the per-task commits.
