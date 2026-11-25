<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: gates, records and squash

**Owner:** orchestrator. **Budget:** 45 min (most of it the coverage run).

## Write-set

- `plans/roadmap.md` (an appended `## Revision <date> (self-loop-assert-arms)` section; no earlier line changes)
- `.agent-notes/self-loop-assert-arms.md` (new, only for novel observations; otherwise journal "no novel discoveries")
- this mission's journal, and the README's batch table and mission summary

## Steps

1. Run queue gates 1-7 in order, and journal each result as a `gate` row.
   - Gate 4: start `npm run coverage` detached under `nice -n 10`, and poll it (queue rules).
   - Gate 6: fix any new CodeQL finding on a touched line. Accept one only as a Java-faithful quirk or a proven false
     positive, journaled.
   - Gate 7: `git diff --exit-code <base> -- test/golden/refs/` must be clean (D6).
2. Comment on #115 with what landed: the six rows and their new behaviour, the D5 proofs (one line each), the tests, and
   the gates. Leave the labels: the issue closes when the branch merges.
3. Append the roadmap revision, in the shape of the earlier revisions.
4. Write `.agent-notes/self-loop-assert-arms.md` if anything novel was found.
5. Fill the README's batch table, and add a `## Mission summary (<date>)` section in the shape of
   `plans/assertion-error-shim/README.md`.
6. Tag the tip `self-loop-assert-arms/pre-squash`. Then run `git reset --soft <base>`, and make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `fix(layered): let six self-loop assert-false arms return as in java`.
   - Body: why (a JVM without `-ea` returns or goes on at each arm, and the kept throws of dev-assert D5.4 were the
     only deviation); D3's null flow and the `TypeError` at the switch; D5's proofs in one sentence; D2's choice of no
     bounds check; gates 1-7; "no ref, vector or golden changed".
   - Footer: `Refs: #115`. No attribution lines (queue rule).
7. Never push.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and each has a journal row with its numbers.
- Given the squash, when `git log --oneline <base>..HEAD` runs, then it prints exactly one commit, and the
  `self-loop-assert-arms/pre-squash` tag holds the per-task history.
- Given `plans/roadmap.md` and `plans/dev-assert/inventory.md`, when diffed against the base, then only appended lines
  appear.

## Observability

N/A. There are no new observable operations.

## Rollback

Reversible: the one commit can be reverted, and the tag keeps the per-task commits.
