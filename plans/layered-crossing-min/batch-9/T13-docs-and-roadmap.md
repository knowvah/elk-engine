<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Docs, roadmap, notes, summary

**Agent:** main session · **Commit:** `docs(T13): record mission 7c in the architecture docs and roadmap`

## Context

Mission 7c (README). 7b's T13 is the pattern (`docs/architecture/alg-layered.md` § 8, `docs/conformance.md`
§ "alg.layered, part b", `plans/roadmap.md` § Revision 2026-10-29, the README summary); every document is
append-or-extend, never rewrite.

## Task

1. `docs/architecture/alg-layered.md` is at 327 lines: add § 9 "Part c: crossing minimization" if it stays under 500,
   else the sibling `docs/architecture/alg-layered-ordering.md` with a one-line pointer: package map (TS paths), the
   processor set and why (C2), the sweep driver's structure and the hierarchy boundary (C3), randomness (C4), the E1
   recipe as applied (C5), evidence (row counts, invariants, sweep, coverage), runbook (re-record, sweep, `--dump`,
   failure modes).
2. `docs/conformance.md`: section "alg.layered, part c: crossing minimization (mission 7c)" before "Temporary gaps"
   with counts equal to `rowCounts` and the open-by-design divergences; index row.
3. `docs/architecture/{overview,port-map-alg-layered,inventory}.md`: the 7c sentence and status block.
4. `plans/roadmap.md` § "Revision <date> (layered-crossing-min)", append-only: row 7c done, the **7c-tests** row (C1:
   the four graph creators and the hand-built suites, before 7d), scope moves confirmed, 7d/7f hand-offs (E1 recipe,
   boxed comparisons, the U branches 7f/7h re-measure, refused-row categories), follow-ups found during the run.
5. `.agent-notes/layered-crossing-min.md`: the run's observations (memory.md template).
6. README "Mission summary": tasks, exit evidence, decisions, divergences fixed at origin, gates, follow-ups.

## Write-set

As the batch overview lists.

## Read-set

The journal, `unreached.md`, the gate outputs, the 7b docs sections named above.

## Acceptance criteria

- Given `npm run docs:build`, when run, then green; every counts sentence equals the ref file's `rowCounts`.
- Given the roadmap, when diffed, then only appended lines.

## Observability / Rollback

N/A. Reversible.
