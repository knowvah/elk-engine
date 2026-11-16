<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: close-out

## Task

1. **Acceptance issue (DB2).** `gh issue create --label needs-ruling` titled
   `adr: accept the deferred-bundles decision (roadmap 11)`. Body: the per-bundle recommendation table from the ADR, the
   path `docs/architecture/deferred-bundles-adr.md`, what acceptance triggers (AD-17 appended to
   `plans/elk-engine-skeleton/decisions.md`; CLAUDE.md "Deferred" list; for a "go", the DB3 follow-up and a roadmap row),
   any locked rule a recommendation needs amended (stop 5), and `Refs: #42`. Replace `#TBD` in the ADR's Status with the
   new number. Journal a `ruling` row.
2. **Comment on #42** with the ADR path and the acceptance issue number.
3. **Roadmap.** Append `## Revision <date> (deferred-bundles-adr)` to `plans/roadmap.md` (never edit an earlier line):
   row 11 done as an ADR (Proposed), the per-bundle recommendation, acceptance pending on #<N>, `bundle-deps.json` unchanged
   (DB3), fitness enforcement by the existing tests (DB4).
4. **Notes.** `.agent-notes/deferred-bundles-adr.md` for anything novel (e.g. a surprising caller, licence finding, or
   dot-engine surface gap); if nothing novel, say so in the journal.
5. **Queue gates 1-6**, each result journaled as a `gate` row: `npm run format:check`; `npm run typecheck`;
   `npm run complexity`; `npm run coverage` (with every `*_SWEEP_DIR=/nonexistent`, as in the README); `npm run docs:build`;
   `git diff --exit-code <base> -- test/golden/refs/` (must be empty: no recorder input changed, so none is rerun).
6. **README.** Tick the batches and add a `## Mission summary` (tasks, exit items with journal rows, decisions, deviations,
   issues filed), as earlier briefs did.
7. **Squash.** `git tag deferred-bundles-adr/pre-squash`, `git reset --soft <base>`, one commit with
   `git -c commit.gpgsign=false commit -F <file>`:
   subject `docs(adr): propose deferred-bundles decision (11)`, a body naming the per-bundle recommendation and the
   acceptance issue, footer `Refs: #42`, and no attribution lines (queue rule). Lines ≤ 80, subject ≤ 72.

## Write-set

`docs/architecture/deferred-bundles-adr.md` (status line only), `plans/roadmap.md` (append), `.agent-notes/deferred-bundles-adr.md`,
`plans/deferred-bundles-adr/README.md`, `plans/deferred-bundles-adr/decision-journal.md`.

## Acceptance criteria

- Given the mission end, when `gh issue view <N>` runs, then it is open with label `needs-ruling` and names the ADR.
- Given `git log <base>..HEAD`, then exactly one commit, with `Refs: #42`, and the tag `deferred-bundles-adr/pre-squash` exists.
- Given gates 1-6, then each is green and journaled; gate 6 prints nothing.
- Given `git diff --stat <base>`, then nothing under `src/`, `test/`, `tools/` changed.

## Observability / rollback

N/A — no new observable operations. Reversible (docs and plan files; the issue can be closed).
