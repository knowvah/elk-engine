<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Docs, roadmap, notes, summary, 7g and 7h hand-offs

**Agent:** main session · **Commit:** `docs(T19): record mission 7f2, its plan and follow-ups`

## Context

Mission 7f2. 7f's T17 is the pattern (`plans/layered-pipeline/batch-10/T17-docs-and-roadmap.md`, `docs/architecture/alg-layered-pipeline.md`,
`docs/conformance.md` § "alg.layered, part f", `plans/roadmap.md` § Revision 2026-11-05). Every document is append-or-extend, never
rewrite. Counts quoted anywhere equal the ref's `rowCounts` and the journal's final gate runs.

## Task

1. `docs/architecture/alg-layered-labels.md` (part g: labels, comments, unzipping, debug output, mission 7f2); one-line pointer from
   `alg-layered.md`'s document table: package map (the 15 classes of G1, the 12 arms), rows (`full` + `models` + `scenarios` + `sites`),
   G3's debug-JSON comparison, G4's `END_LABELS` order and the reversal twin, G5's two-run protocol, G6's manager, G8's append-only
   metrics, the unpinning of the 59 rows and FX5, FX2's result, the runner suites and counts against [java-baseline.md](../java-baseline.md),
   the sweep counts and timings, the FX3-style measurements, coverage, upstream branches (G10), runbook
   (`bash tools/vectors/layered-labels-vectors.sh test/golden/refs/java`, `bash tools/oracle/labels-sweep.sh [--force]`,
   `LABELS_SWEEP_STRIDE=1 npx vitest run test/corpus/labels-sweep.test.ts`, `--dump`, `bash tools/oracle/java-tests.sh`), and a failure table
   (divergence beyond 1e-6; hash-order differences; a refusal outside 7g and 7h; the entry-point dead zone; a cap exceeded; a metrics
   entry that changes, stop 20; a later-mission throw from `layout`). Diagrams from `diagrams/` are linked, not copied.
2. `docs/conformance.md`: section `## alg.layered, part g: labels, comments and debug output (mission 7f2) {#alg-layered-labels}` before
   `## Temporary gaps`, counts equal to `rowCounts`, Java baseline start and end, the suites, the sweep, anchored cases, coverage, upstream
   defects found (G10); the index row after the 7f row; state what layouts still throw and which mission lifts each (self loops,
   wrapping, compaction: 7g; `INCLUDE_CHILDREN`: 7h).
3. `docs/architecture/overview.md`: the 7f2 sentence after the 7f one and the document table row; the statement about what layered runs
   now updated (labels, comments, unzipping, logging run). `docs/architecture/port-map-alg-layered.md` untouched unless a count changed.
4. `plans/roadmap.md` § `## Revision <date> (layered-labels)`, append-only: row 7f's second brief done with the evidence line; the enum
   tally after 7f2 (ported 49, pending 10); hand-offs binding for **7g** (the 9 pending arms `SelfLoopPreProcessor`,
   `SelfLoopPortRestorer`, `SelfLoopPostProcessor`, `SelfLoopRouter`, `BreakingPointInserter`, `BreakingPointProcessor`,
   `BreakingPointRemover`, `SingleEdgeGraphWrapper`, `HorizontalGraphCompactor`, plus the staged `ComponentsCompactor`; the self-loop
   levels; the one pinned 7g row `models/ptolemy-sinewaveoptimization/N1/…`; suites; the accepted 7g refusals of `layered-labels.json`
   and the sweep, counted per category) and **7h** (`HierarchicalNodeResizingProcessor`, the 1 pending arm; compound stages;
   `include-children*` rows; the hierarchical driver path; accepted 7h refusals; the "vendor outside `inputs/realworld/`" rule of
   `.agent-notes/layered-pipeline.md`); the open user decisions.
5. `.agent-notes/layered-labels.md`: observations in the memory-rule template (context, finding, impact, confidence); include the
   `staged-classes` marker coupling and anything unexpected from T11–T18; confirm no other novel discoveries if none.
6. `plans/layered-labels/README.md` "Mission summary": tasks, exit evidence, decisions during the run (execution table of `decisions.md`),
   divergences fixed at origin, gates with measured numbers, flags for the user, follow-ups pointer. Mark the batch table `[x]`.
7. Run the end-of-mission gates the README lists and journal each result; `npm run docs:build` green; `npm run format:check` clean; then
   stop 14 (regroup into at most five commits, journal on both branches, hand over the landing commands).

## Write-set

`docs/architecture/{alg-layered-labels,alg-layered,overview}.md`, `docs/conformance.md`, `plans/roadmap.md`, `.agent-notes/layered-labels.md`,
`plans/layered-labels/README.md` (summary and batch table only).

## Read-set

`plans/layered-pipeline/batch-10/T17-docs-and-roadmap.md`, `docs/architecture/alg-layered-pipeline.md`,
`plans/layered-labels/{decision-journal,decisions,unreached,java-baseline}.md`, `plans/roadmap.md` (last revision).

## Architecture decisions

G1 (scope), G9 (hand-offs closed), G10 (upstream), G12 (landing), stop 14.

## Interface contract

The roadmap revision is the binding input of the 7g and 7h briefs.

## Acceptance criteria

- Given the docs, when built, then `npm run docs:build` is green and links resolve.
- Given the conformance counts, when compared, then they equal `rowCounts` and the journal's final gate runs.
- Given the roadmap, when diffed, then the change is append-only and lists the 7g and 7h hand-offs.
- Given `.agent-notes/layered-labels.md`, when read, then each observation has context, finding, impact and confidence.

## Observability / Rollback

N/A (documents). Reversible.
