<!-- SPDX-License-Identifier: EPL-2.0 -->

# T22 — Docs, roadmap revision, notes, squash

**Agent:** documentation-engineer (sonnet) drafts; the orchestrator checks every number against the journal and runs the gates
and the squash · **Commit:** `docs(T22): record mission 7g, its evidence and hand-offs to 7h`, then the W11 squash.

## Task

1. `docs/architecture/alg-layered-loops.md` (7f2's `alg-layered-labels.md` shape): package map, the 9 arms, the recorder and its
   groups, the sweep, AD-10 sites, R9 verdict, runbook (re-record, sweep, suites, corpus runs). Link it from
   `docs/architecture/overview.md` (table row and the state paragraph: self loops, wrapping and compaction run; only
   `INCLUDE_CHILDREN` throws, naming 7h).
2. `docs/conformance.md`: the 7g section (rows, suites with oracle counts at start and end, sweep counts, known divergences if
   any, upstream typos if any).
3. `plans/roadmap.md`: append `## Revision <date> (layered-loops-wrapping-compaction)` as earlier missions did (never edit an
   earlier line): what is done, evidence, enum tally (58 ported, 1 pending), **hand-offs to 7h** (the 7h refusals of the new ref
   and sweep, `include-children*` rows, U items owned by 7h, suites), flags for the maintainer, follow-ups.
4. `.agent-notes/layered-loops-wrapping-compaction.md`: novel observations only (memory rule template).
5. README "Mission summary": tasks done, exit evidence, decisions during the run, divergences fixed at origin, gates, flags.
6. Mission-end gates (README "Quality gates", all of them, queue gates 1–6), each result a journal row.
7. Squash (W11): `git tag layered-loops-wrapping-compaction/pre-squash`, `git reset --soft <base>`, one
   `git -c commit.gpgsign=false commit -F <msg>`: subject `feat(layered): port self loops, wrapping and compaction (7g)`, body
   (≤ 80 columns) listing the task ids and the evidence, footer `Refs: #35`. Then `git status --porcelain` is empty and
   `git rev-list --count <base>..HEAD` is 1.

## Write-set

`docs/architecture/alg-layered-loops.md`, `docs/architecture/overview.md`, `docs/conformance.md`, `plans/roadmap.md` (append),
`.agent-notes/layered-loops-wrapping-compaction.md`, `plans/layered-loops-wrapping-compaction/{README.md,decision-journal.md}`.

## Read-set

`docs/architecture/alg-layered-labels.md`, `docs/conformance.md` (7f2 section), roadmap § Revision 2026-11-06 (layered-labels),
the journal, `unreached.md`.

## Acceptance criteria

- Given `npm run docs:build`, when run, then green with the new page linked.
- Given every number in the docs and the roadmap revision, when checked against the journal, then they agree.
- Given the squash, when done, then one commit on the base with `Refs: #35`, the pre-squash tag at the old HEAD, a clean tree.

## Observability / Rollback

N/A. Reversible: the pre-squash tag keeps the per-task history; reverting the squash commit undoes the mission.
