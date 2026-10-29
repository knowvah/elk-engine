<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Docs, roadmap, notes, summary

**Agent:** main session (executor) · **Commit:** `docs(T13): record mission 7b in the architecture docs and roadmap`

## Context

Mission 7b (README). 7a's T12 (`plans/layered-framework/batch-9/T12-docs-and-roadmap.md`) is the pattern; every
document is append-or-extend, never rewrite.

## Task

1. `docs/architecture/alg-layered.md`: a new part "b" section (or sibling file `alg-layered-phases.md` if the file
   would pass 500 lines): the p1/p2 package map with the TS paths, the processor set and why (SC1), the prefix replay
   (B4) and its 7f hand-over, the row kinds (B1, B2), the recursion rewrites (B8) with the twin files, evidence
   (row counts, invariant tests, sweep), runbook (re-record, sweep, `--dump`, reading a refused row).
2. `docs/conformance.md`: section "alg.layered, part b: cycles and layers (mission 7b)" before "Temporary gaps", with
   the counts and the open-by-design divergences (B3 components flag, no `DefaultConfiguration` sizing); index row.
3. `docs/architecture/{overview,port-map-alg-layered}.md`: the 7b sentence and status rows; `inventory.md` note if
   the LOC table needs it.
4. `plans/roadmap.md`: § "Revision <date> (layered-cycles-layers)", append-only: row 7b done, scope moves confirmed
   (SC2 tests to 7f, SC3 `TestGraphCreator` to 7c), the 7c/7f hand-offs (re-replay of 7b rows through the real
   pipeline; `SEPARATE_CONNECTED_COMPONENTS` default), follow-ups found during the run, tooling notes (javac
   multi-file launcher).
5. `.agent-notes/layered-cycles-layers.md`: the run's observations (memory.md template).
6. README "Mission summary": tasks, exit evidence, decisions, divergences fixed at origin, gates, follow-ups.

## Write-set

As the batch overview lists.

## Read-set

The journal, `unreached.md`, the gate outputs, `docs/architecture/alg-layered.md`, `docs/conformance.md`,
`plans/roadmap.md` § Revision 2026-10-28.

## Acceptance criteria

- Given `npm run docs:build`, when run, then green; every counts sentence equals the ref file's `rowCounts`.
- Given the roadmap, when diffed, then only appended lines.

## Observability / Rollback

N/A. Reversible.
