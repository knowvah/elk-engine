<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — Docs, roadmap revision, notes, squash

**Agent:** documentation-engineer (sonnet) drafts. The orchestrator checks every number against the journal and runs the gates
and the squash. · **Commit:** `docs(T16): record mission 7h, its evidence and hand-offs`, then the H9 squash.

## Task

1. `docs/architecture/alg-layered-compound.md`, in the shape of the 7g page `alg-layered-loops.md`. Cover: the compound package
   map, the facade and sections split (H11), the hierarchical driver (`doCompoundLayout`, `hierarchicalLayout`, hierarchy-aware
   processors), the recorder and its groups (the hierarchical `models` stop, H2), the golden set (H4), the sweep, the H3 sites
   with their twin verdicts, and a runbook (re-record, goldens, sweep, suites). Link it from `docs/architecture/overview.md`: a
   table row, and a state paragraph saying layered runs every hierarchy-handling mode and no arm is pending.
2. `docs/conformance.md`: the 7h section. Include rows, goldens, suites with oracle counts at start and end, the H13 pending
   cases with the issue number, sweep counts, known divergences if any, and upstream typos if any.
3. `plans/roadmap.md`: append `## Revision <date> (layered-compound)` as earlier missions did, never editing an earlier line.
   Cover per H14: row 7h done, the evidence, the enum tally (59 ported, 0 pending), the empty staged list, hand-offs to 9, 8b
   (H13) and 12, flags for the maintainer (H13's issue, any new `needs-ruling`, #53/#54/#56 if still open), and follow-ups.
4. `.agent-notes/layered-compound.md`: novel observations only (memory rule template).
5. README "Mission summary": tasks done, exit evidence, decisions during the run, divergences fixed at origin, gates, flags.
6. Mission-end gates (README "Quality gates", all of them, queue gates 1–6), each result a journal row.
7. Squash (H9): `git tag layered-compound/pre-squash`, `git reset --soft <base>`, and one
   `git -c commit.gpgsign=false commit -F <msg>` with subject `feat(layered): port compound graph layout (7h)`, a body (≤ 80
   columns) listing the task ids and the evidence, and the footer `Refs: #36`. Afterwards `git status --porcelain` is empty and
   `git rev-list --count <base>..HEAD` is 1.

## Write-set

`docs/architecture/alg-layered-compound.md`, `docs/architecture/overview.md`, `docs/conformance.md`, `plans/roadmap.md` (append),
`.agent-notes/layered-compound.md`, `plans/layered-compound/{README.md,decision-journal.md}`.

## Read-set

`docs/architecture/alg-layered-loops.md`, `docs/conformance.md` (7g section), roadmap § Revision 2026-11-10
(layered-loops-wrapping-compaction), the journal, `unreached.md`.

## Acceptance criteria

- Given `npm run docs:build`, when run, then it is green with the new page linked.
- Given every number in the docs and the roadmap revision, when checked against the journal, then they agree.
- Given the squash, when done, then there is one commit on the base with `Refs: #36`, the pre-squash tag at the old HEAD, and a
  clean tree.

## Observability / Rollback

N/A. Reversible: the pre-squash tag keeps the per-task history, and reverting the squash commit undoes the mission.
