<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Simple, interactive and linear-segments placers; staged `DebugUtil`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T5): port the simple, interactive and linear segments placers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T5/`.

## Context

Mission 7d (README), N4–N8. Three `ILayoutPhase<LayeredPhases, LGraph>` classes: `SimpleNodePlacer` 103,
`InteractiveNodePlacer` 132 (reads the nodes' interactive positions), `LinearSegmentsNodePlacer` 888 (segments,
sorting, balancing, post-processing; the nested `LinearSegment` class at `:68`, the `Mode` enum at `:571`, two private
`Property<Integer>` constants `INPUT_PRIO`/`OUTPUT_PRIO` at `:172-175` whose Java ids must be kept, they appear in
`changed`). All three declare `HIERARCHY_PROCESSING_ADDITIONS` adding `HIERARCHICAL_PORT_POSITION_PROCESSOR` before P5
(e.g. `J/p4nodes/SimpleNodePlacer.java:47-57`, `LinearSegmentsNodePlacer.java:157-167`): write it as a cached static getter (N4). `LinearSegmentsNodePlacer.java:450`
calls `DebugUtil.logDebugGraph(monitor, layeredGraph, segmentList, outgoingList)` behind `monitor.isLoggingEnabled()`;
`DebugUtil` (`J/DebugUtil.java`, 123 lines) needs `DotDebugUtil` (233) and `JsonDebugUtil` (653), both 7f.

## Task

1. Port `SimpleNodePlacer` and `InteractiveNodePlacer` to `src/alg/layered/p4nodes/` with `@see`, every branch,
   `Math.max` on doubles verbatim.
2. Port `LinearSegmentsNodePlacer` as a facade plus section files along the Java file's own sections
   (`LinearSegmentsNodePlacer<Section>.ts`, P1), `LinearSegment` as `LinearSegmentsNodePlacerLinearSegment.ts` (M15,
   `compareTo`, `equals`/`hashCode` by `id` kept as methods; it is only held in `List`s), the `Mode` enum as a prefixed
   file; `nodes.indexOf(node)` (`:112`) is identity; `DebugUtil` call site verbatim.
3. N6: `fillSegment` (`:466`, recursion along a long edge's dummies, depth = layer count) → explicit-stack loop in the
   port plus a verbatim recursive twin in the test file; prove them equal on every `LINEAR_SEGMENTS` row graph and on a
   5,000-layer chain under `npx vitest run --pool=forks --execArgv=--jitless` (precedent:
   `src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:145-180`). If the scan was wrong and it is not a true
   recursion, keep the Java shape and journal in the hand-back.
4. N8: `src/alg/layered/DebugUtil.ts` as an L1 staged class: header `// @staged 7f` (second line, as
   `src/alg/layered/intermediate/LabelDummySwitcher.ts:1-12`), the three Java overloads named per `alg-common.md`
   § 6.5 (`logDebugGraph` dispatching on arity, or `logDebugGraphSlot`/`logDebugGraphSegments`/`logDebugGraphHyperedges`:
   state the mapping in the file header), the segment-graph overload (`J/DebugUtil.java:76-88`) throwing
   `notPorted('DotDebugUtil', '7f')` (the helper the enum arms use), the other two likewise naming 7f; add
   `{ "path": "src/alg/layered/DebugUtil.ts", "mission": "7f" }` to `test/architecture/staged-classes.json`;
   `npx vitest run test/architecture/staged-classes.fitness.test.ts` green.
5. C6: `INPUT_PRIO`/`OUTPUT_PRIO` are read as `int` into `Math.max` (`:231-235`, `:681-709`): value arithmetic, no box
   identity; state the audit. AD-10: no hashed container (`Lists` only); state it.
6. Tests, colocated, L4: replay every `scenarios/*` and `models/*` row whose stop is `P4` with strategy `SIMPLE`,
   `INTERACTIVE` or `LINEAR_SEGMENTS` (the `deflectionDampening` and `favorStraightEdges` variants included) with the
   placer injected through T3's `Factories`; `comparePlacement` `[]`, `comparePlacementFullDump` `[]` where a dump
   exists; the twin test; a test that the staged overload throws naming 7f.

## Write-set

`src/alg/layered/p4nodes/{SimpleNodePlacer,InteractiveNodePlacer,LinearSegmentsNodePlacer}.ts`, the
`LinearSegmentsNodePlacer*` section and nested-type files, their `.test.ts`, `src/alg/layered/DebugUtil.ts`,
`test/architecture/staged-classes.json`.

## Read-set

`J/p4nodes/{SimpleNodePlacer,InteractiveNodePlacer,LinearSegmentsNodePlacer}.java`, `J/DebugUtil.java`,
`src/alg/layered/p3order/LayerSweepCrossingMinimizer.ts:1-80` (a cached static configuration getter),
`src/alg/layered/options/NodePlacementStrategy.ts` (`notPorted`), `src/alg/layered/intermediate/LabelDummySwitcher.ts:1-30`,
`test/architecture/staged-classes.fitness.test.ts:1-30`, `src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:140-180`,
`test/helpers/layered-placement-replay-*.ts` (T3 contract), `decisions.md` N4–N8.

## Architecture decisions

N4 (cached static configuration getter), N5, N6 (`fillSegment`), N7, N8 (staged `DebugUtil`), L1, M15, P1.

## Interface contract (consumed by T8)

`new SimpleNodePlacer()`, `new InteractiveNodePlacer()`, `new LinearSegmentsNodePlacer()` with
`getLayoutProcessorConfiguration(graph)` and `process(graph, monitor)` as in Java.

## Acceptance criteria

- Given the P4 rows of the three strategies, when replayed with the placer injected, then no diff.
- Given the `fillSegment` twin on every row graph and a 5,000-layer chain under `--jitless`, when compared, then equal
  and no overflow.
- Given the staged `DebugUtil`, when the staged-class fitness test runs, then it passes, and the segment overload
  throws naming 7f.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
