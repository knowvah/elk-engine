<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Docs, roadmap, notes, summary, 7f2 hand-off

**Agent:** main session · **Commit:** `docs(T17): record mission 7f, its plan and follow-ups`

## Context

Mission 7f. 7e's T15 is the pattern (`plans/layered-edge-routing/batch-9/T15-docs-and-roadmap.md`, `docs/architecture/alg-layered-routing.md`, `docs/conformance.md` § "alg.layered, part e", `plans/roadmap.md` § Revision 2026-11-03). Every document is append-or-extend, never rewrite.

## Task

1. `docs/architecture/alg-layered-pipeline.md` (part f: the driver and the running pipeline, mission 7f), one-line pointer from `alg-layered.md`'s document table: package map (`ElkLayered`, `GraphConfigurator`, `components`, the five processors), the split and F1's scope moves, rows (`full` + `models` + `scenarios` + `sites`), the F4 hash check result, the SC4 re-replay, the runner subset and suite allocation, F11's idioms, evidence (row counts equal to `rowCounts`, suites and Java baseline, sweep counts and timings, cross-check tally, coverage), runbook (`tools/vectors/layered-pipeline-vectors.sh test/golden/refs/java`, `tools/oracle/pipeline-sweep.sh [--force]`, `PIPELINE_SWEEP_STRIDE=1 npx vitest run test/corpus/pipeline-sweep.test.ts`, `--dump`, `java-tests.sh`), and the failure table (divergence beyond 1e-6; hash-order differences; a refusal outside F1's categories; the entry-point dead zone; a cap exceeded; a later-mission throw from `layout`).
2. `docs/conformance.md`: section `## alg.layered, part f: the running pipeline (mission 7f) {#alg-layered-pipeline}` before `## Temporary gaps`, counts equal to `rowCounts`, Java baseline start and end, the goldens, SC4, the suites, the sweep, anchored cases, coverage; the index row after the 7e row; state what layouts still throw and which mission lifts each.
3. `docs/architecture/overview.md`: the 7f sentence after the 7e one and the document table row; "No layout algorithm runs yet" becomes accurate about layered: it runs except for the listed cases. `docs/architecture/port-map-alg-layered.md` is untouched unless a count changed.
4. `plans/roadmap.md` § `## Revision <date> (layered-pipeline)`, append-only: row 7f's first brief done with the evidence line; scope moves binding for 7f2–7h (F1: `components` from 7h, `HierarchicalNodeResizingProcessor` to 7h, the split, the tally); hand-offs for **7f2** (the label family, comments, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`, the debug utilities, the 43 `p2layers`/`intermediate` branches, `HyperedgeDummyMerger`'s 13 label arms, three `LongEdgeSplitter`/`SortByInputModelProcessor` arms, the 18 `LABEL_DUMMY_INSERTER` accepted refusals, `testEdgesPointTowardsNextLayers`, suites allocated there), **7g** (`ComponentsCompactor`, the 112 self-loop levels, R9's recheck, suites), **7h** (`HierarchicalNodeResizingProcessor`, compound stages, `include-children*` rows, the hierarchical driver path).
5. `.agent-notes/layered-pipeline.md`: observations in the memory-rule template.
6. README "Mission summary": tasks, exit evidence, decisions during the run, divergences fixed at origin, gates, flags for the user, follow-ups pointer. `npm run docs:build` green; `npm run format:check` clean.

## Write-set

`docs/architecture/{alg-layered-pipeline,alg-layered,overview}.md`, `docs/conformance.md`, `plans/roadmap.md`, `.agent-notes/layered-pipeline.md`, `plans/layered-pipeline/README.md`.

## Read-set

`plans/layered-edge-routing/batch-9/T15-docs-and-roadmap.md`, `docs/architecture/alg-layered-routing.md`, `plans/layered-pipeline/{decision-journal,decisions,suite-allocation,unreached}.md`.

## Interface contract

The roadmap revision is the binding input of the 7f2 brief.

## Acceptance criteria

- Given the docs, when built, then `npm run docs:build` is green and links resolve.
- Given the conformance counts, when compared, then they equal `rowCounts` and the journal's final gate runs.
- Given the roadmap, when diffed, then the change is append-only.

## Observability / Rollback

N/A (documents). Reversible.
