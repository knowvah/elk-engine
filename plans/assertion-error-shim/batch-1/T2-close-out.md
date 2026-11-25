<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: gates, records and squash

**Owner:** orchestrator. **Budget:** 45 min (most of it the coverage run).

## Write-set

- `plans/roadmap.md` (an appended `## Revision <date> (assertion-error-shim)` section; no earlier line changes)
- `.agent-notes/assertion-error-shim.md` (new, only for novel observations; otherwise journal "no novel discoveries")
- this mission's journal, and the README's batch table and mission summary

## Steps

1. Run queue gates 1-7 in order, and journal each result as a `gate` row.
   - Gate 4: start `npm run coverage` detached under `nice -n 10`, and poll it (queue rules).
   - Gate 6: fix any new CodeQL finding on a touched line. Accept one only as a proven false positive, journaled.
   - Gate 7: `git diff --exit-code <base> -- test/golden/refs/` must be clean (D6).
2. Comment on #114 with what landed: the three sites, D2's name, D4's fitness edit, the gates. Leave the labels: the issue closes
   when the branch merges.
3. Append the roadmap revision, in the shape of the earlier revisions.
4. Write `.agent-notes/assertion-error-shim.md` if anything novel was found.
5. Fill the README's batch table, and add a `## Mission summary (<date>)` section in the shape of `rectpacking-next-row-arm`.
6. Tag the tip `assertion-error-shim/pre-squash`. Then run `git reset --soft <base>`, and make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `refactor(java): move the assertionerror stand-ins onto the shim`.
   - Body: why (one shim for `java.lang.AssertionError`, and the Java parent chain); D2's name change and the evidence that no
     reader sees it; D4's one named fitness edit; gates 1-7; "no ref, vector or golden changed".
   - Footer: `Refs: #114`. No attribution lines (queue rule).
7. Never push.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and each has a journal row with its numbers.
- Given the squash, when `git log --oneline <base>..HEAD` runs, then it prints exactly one commit, and the
  `assertion-error-shim/pre-squash` tag holds the per-task history.
- Given `plans/roadmap.md`, when diffed against the base, then only appended lines appear.

## Observability

N/A. There are no new observable operations.

## Rollback

Reversible: the one commit can be reverted, and the tag keeps the per-task commits.
