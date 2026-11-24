<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5: close-out and squash

**Agent:** orchestrator. **Budget:** 50 min (the coverage run dominates).

## Task

1. **Issues.** One `needs-ruling` issue per `fails` entry (D7, stop 4) and for stop 3 if it fired; one `follow-up`
   (never `queue:ready`) for anything left by stop 11 or met on the way. If #74's wording would change the rule's
   meaning (D0), say so in the #74 report comment, not in a new issue. Name each issue in the README and the journal.
2. **Gates** (queue rules; journal each result):
   - `npm run format:check`
   - `npm run typecheck`
   - `npm run complexity` (read the report)
   - `npm run coverage`, detached with `nohup nice -n 10 … ; echo "exit $?"` and polled for at most 9 min at a time
   - `npm run docs:build`
   - `npm run codeql` (fix findings; an `accepted.json` entry only for a proven false positive, journaled)
   - `git diff --exit-code <base> -- test/golden/refs/` apart from the added `last-ulp.json` (journaled with patches
     0001-0004)
3. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (last-ulp-bar)` in the style of the previous revisions.
4. `.agent-notes/last-ulp-bar.md`: novel findings only (for example whether HotSpot's cold `Math.sin` on arm64 already
   differs from `StrictMath`, how many layout repetitions the warm value needed, collection counts against 8b).
5. README: mark the batches `[x]` and add `## Mission summary (<date>)`, like `plans/canonical-nan/README.md`.
6. Delete nothing under `plans/`. Delete `.plan-mission-progress.md` if it is still present and untracked.
7. **Squash:** tag the tip `last-ulp-bar/pre-squash`, run `git reset --soft <base>`, then make one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `docs(conformance): amend ad-4 with the 0.01 px last-ulp bar` (or better, ≤ 72 chars, lowercase, no
     period).
   - Body: the ruling (2026-11-13, #68 B made general); where the rule is written; the audit (entries per class, measured
     deltas); the new recorder, ref and pinning test; issues filed; gate totals; the pre-squash tag.
   - Footer: `Refs: #74` (not `Closes`). No attribution lines: the queue rules forbid them and win over any reminder.
8. Never push.

## Write-set

`plans/roadmap.md` (appended section), `.agent-notes/last-ulp-bar.md`, the README and the journal.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all pass and each result is journaled with its command and summary line.
- Given the squash, when `git log <base>..HEAD` runs, then it shows exactly one commit, and the tag holds the per-task
  history.
- Given the audit table, when the summary is written, then every entry is `accepted`, `inside-bar`, `no-divergence`, or
  `fails` with its `needs-ruling` issue.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the one commit).
