<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: gates, records, issue comments and squash

**Owner:** orchestrator. **Budget:** 30 min plus the coverage run.

## Write-set

- `plans/roadmap.md` (an appended `## Revision <date> (deferred-bundles-acceptance)` section; no earlier line changes)
- `.agent-notes/deferred-bundles-acceptance.md` (new, only for novel observations; otherwise journal "no novel discoveries")
- this mission's journal, and the README's batch table and mission summary

## Steps

1. Run queue gates 1-7 in order. Start `npm run coverage` detached and poll it (queue rules). Journal each result as a `gate` row.
   - Gate 7: `git diff --exit-code <base> -- test/golden/refs/` must be clean; no recorder input changed.
   - Gate 6: no `src/` change is planned, so no new CodeQL finding is expected; a new one is fixed, not accepted.
2. Append the roadmap revision: row 11 closes (ADR accepted, amended); AD-17; the bundle table now has 18 keys; #95 holds the
   ports from step 2 on; the runner-API question waits for the maintainer.
3. Comment on #88 and #95 per [D6](../decisions.md#d6-issue-traffic), naming the pre-squash tag (the squash sha follows in the
   driver's report). Do not change labels.
4. Write `.agent-notes/deferred-bundles-acceptance.md` if anything novel was found.
5. Fill the README's batch table and add `## Mission summary (<date>)` in the shape of earlier missions.
6. Tag the tip `deferred-bundles-acceptance/pre-squash`. Run `git reset --soft <base>` and make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `docs(adr): accept the deferred-bundles decision as amended (11)`.
   - Body: the ruling in two lines (libavoid out; Graphviz in with an injected runner, #95), what changed (ADR, AD-17, CLAUDE.md,
     inventory, port-map, bundle table plus fitness block), gates 1-7, and "no `src/` file and no landed ref, vector, golden or
     assertion changed".
   - Footer: `Refs: #88`. No attribution lines (queue rule).
7. Never push.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all are green and each has a journal row with its numbers.
- Given the squash, when `git log --oneline <base>..HEAD` runs, then it prints exactly one commit, and the pre-squash tag holds
  the per-task history.
- Given `plans/roadmap.md` and `plans/elk-engine-skeleton/decisions.md`, when diffed against the base, then only appended lines
  appear.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: the one commit can be reverted, and the tag keeps the per-task commits.
