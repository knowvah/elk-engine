<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: docs, gates, close-out and squash

**Agent:** orchestrator. **Budget:** 50 min (the coverage run dominates).

## Task

1. **Docs (D6):** `docs/architecture/alg-packing.md` § 3.2 and the rows near `:524` and `:536`; `docs/conformance.md` near
   `:346-352`, `:2321` and (if current) `:2242`. One closing row appended to `plans/alg-packing/decision-journal.md`.
2. **Follow-ups:** `gh issue create --label follow-up` for any defect met on the way; skip if none.
3. **Gates** (queue rules; journal each with command and summary line; check `uptime` before gate 4):
   - `npm run format:check`
   - `npm run typecheck`
   - `npm run complexity` (read the report)
   - `npm run coverage`, detached with `nohup nice -n 10 … ; echo "exit $?"`, polled at most 9 min at a time
   - `npm run docs:build`
   - `npm run codeql` (fix findings; a new `accepted.json` entry only for a proven false positive, journaled)
   - `git diff --stat <base> -- test/golden/refs/` shows only `java/spore-layout.json`, already proven by D5
4. `plans/roadmap.md`: append `## Revision 2026-11-<dd> (spore-jitter-exact)` in the style of earlier revisions.
5. `.agent-notes/spore-jitter-exact.md`: novel findings only (for example whether the jitter rows passed the round-trip and
   stepwise checks unchanged, and the raw-bit share of the shifted values).
6. README: batches `[x]`, `## Mission summary (<date>)` as in `plans/spore-recursion-depth/README.md`.
7. Comment on #106 with the result (rows added, tally, commit after squash). Delete nothing under `plans/`.
8. **Squash:** tag the tip `spore-jitter-exact/pre-squash`, `git reset --soft <base>`, one
   `git -c commit.gpgsign=false commit -F <file>`:
   - Subject: `test(spore): record and replay exact rows for the seeded shift` (≤ 72 chars, lowercase, no period).
   - Body: why a new group (D1, D3), the row shape (D2), the D5 proof, the tally, the docs, any follow-up, the gate totals,
     the pre-squash tag.
   - Footer: `Refs: #106`. No attribution lines (the queue rules forbid them).
9. Never push.

## Write-set

`docs/architecture/alg-packing.md`, `docs/conformance.md`, `plans/alg-packing/decision-journal.md` (appended row),
`plans/roadmap.md` (appended section), `.agent-notes/spore-jitter-exact.md`, the README and the journal.

## Acceptance criteria

- Given the final tree, when gates 1-7 run, then all pass and each result is journaled.
- Given the squash, when `git log <base>..HEAD` runs, then it shows exactly one commit and the tag holds the task history.
- Given the docs, when `grep -n '#106' docs/architecture/alg-packing.md` runs, then no line calls the exact rows open.

**Observability:** N/A. **Rollback:** Reversible (revert the one commit).
