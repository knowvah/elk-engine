<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Docs, roadmap, notes, summary

**Agent:** main session · **Commit:** `docs(T13): record mission 7d, its plan and follow-ups`

## Context

Mission 7d (README). 7c's T13 is the pattern (`docs/architecture/alg-layered.md` § 9, `docs/conformance.md`
§ "alg.layered, part c" at `:1038`, `plans/roadmap.md` § Revision 2026-10-30 at `:715`, the README summary); every
document is append-or-extend, never rewrite. `docs/architecture/alg-layered.md` is at 460 lines, so part d goes to
the sibling `docs/architecture/alg-layered-placement.md` with a one-line pointer from § 1's document table and a
`## 10. Part d` stub in `alg-layered.md` (the 7c T13 rule: a section stays in the file only under 500 lines).

## Task

1. `docs/architecture/alg-layered-placement.md` (part d: node placement, mission 7d): package map (TS paths,
   section and prefixed files), the five processors and why (N1), rows and the geometry dump (N3), the recursion
   rewrites (N6: `placeBlock`, `fillSegment`, `follow`/`getEdgeWeight` as confirmed), the Java idioms reproduced
   (N5, N7, N8: `sinkNodes` order, the staged `DebugUtil`, the `monitor.log` lines), evidence (row counts equal to
   `rowCounts`, the invariant, the sweep counts and timings, coverage, the Java baseline), runbook
   (`tools/vectors/layered-placement-vectors.sh test/golden/refs/java`, `tools/oracle/placement-sweep.sh [--force]`,
   `PLACEMENT_SWEEP_STRIDE=1 npx vitest run test/corpus/placement-sweep.test.ts`, `java -cp <classpath>
   tools/vectors/LayeredPlacementVectors.java --dump <case id> $ELK_MODELS_DIR <outDir>`,
   `MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p4nodes.BasicNodePlacementTest`),
   and the failure table (geometry diff beyond 1e-6; a refusal outside N1's categories; the entry-point temporal
   dead zone; the recorder's `MODELS_REPO` absent).
2. `docs/conformance.md`: section `## alg.layered, part d: node placement (mission 7d) {#alg-layered-placement}`
   before `## Temporary gaps` (`:1115`) with counts equal to `rowCounts`, the Java baseline
   (`BasicNodePlacementTest` runs=8008 failures=0 at mission start and end, `MODELS_REPO` set), the invariant, the
   sweep, the anchored cases and coverage, the untouched landed files; the index row after the 7c row (`:29`):
   `| -   | [alg.layered node placement](#alg-layered-placement) | How is the fourth phase (7d) proven? |`.
3. `docs/architecture/overview.md`: the 7d sentence after the 7c one in "What elk-engine is" and the document
   table row for `alg-layered-placement.md`.
4. `plans/roadmap.md` § `## Revision <date> (layered-node-placement)`, append-only (no earlier line edited; the
   diff shows added lines only): row 7d done with the evidence line; the five-processor scope move (N1, binding
   for 7e–7h: `HYPEREDGE_DUMMY_MERGER` 7e, the label and comment processors and `ALTERNATING_LAYER_UNZIPPER` 7f,
   self loops, wrapping and breaking points 7g); the B9 tally `7b 10 / 7c 10 / 7d 5 / 7f 25 / 7g 9`; hand-offs
   (7e: `HIERARCHICAL_PORT_POSITION_PROCESSOR`, `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `HYPEREDGE_DUMMY_MERGER`,
   the P5 stop needs the P4 geometry recorder core; 7f: `DotDebugUtil`/`JsonDebugUtil` for the staged `DebugUtil`,
   the label processors, the before-P4 U branches; 7h: nested-graph U branches; every mission: the E1 recipe as
   applied, the geometry field and its trimming rule); follow-ups found during the run (from the journal).
5. `.agent-notes/layered-node-placement.md`: the run's observations gathered from every hand-back (memory.md
   template: Context, Finding, Impact, Confidence; factual only).
6. README "Mission summary (<date>)": tasks, exit evidence, decisions taken during the run, divergences fixed at
   origin, gates, follow-ups and flags for the user.
7. `npm run docs:build` green; `npm run format:check` clean.

## Write-set

As the batch overview lists.

## Read-set

The journal, `unreached.md`, the gate outputs, the T10 and T12 hand-backs, `docs/architecture/alg-layered.md:330-460`
(§ 9), `docs/conformance.md:1038-1114`, `plans/roadmap.md:715-830` (the 7c and 7c-tests revisions).

## Architecture decisions relevant

All of N1–N12 are summarised; N1's refusal categories and N9's baseline counts are the lines later missions read.

## Interface contract

None; the roadmap revision is the hand-off to 7e.

## Acceptance criteria

- Given `npm run docs:build`, when run, then green; every counts sentence equals the ref file's `rowCounts` and the
  sweep's `results.jsonl` counts.
- Given the roadmap, when diffed, then only appended lines.
- Given the conformance index, when read, then the 7d row links to a section that exists.

## Observability / Rollback

N/A. Reversible.
