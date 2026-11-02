<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Brandes-Köpf node placer (`p4nodes.bk`)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the brandes-koepf node placer`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p4nodes/bk`.
Scratch: a private subdirectory `<scratchpad>/T6/`.

## Context

Mission 7d (README), N4, N6–N8. Seven classes, 2,313 Java lines: `BKNodePlacer` 628 (the phase: conflict marking,
four layouts, choice, feasibility, debug output; static `getEdge` `:501`, `getBlocks` `:517`, `getClasses` `:544`),
`BKAligner` 236 (`import static BKNodePlacer.getBlocks/getEdge`, `J/BKAligner.java:17-18`), `BKCompactor` 421
(`ICompactor`; nested `ClassNode` `:396`, `ClassEdge` `:416`; `sinkNodes` `:55`), `BKAlignedLayout` 359 (nested enums
`VDirection` `:343`, `HDirection` `:353`; `toString` `:320`), `ThresholdStrategy` 432 (abstract; nested
`NullThresholdStrategy` `:144`, `SimpleThresholdStrategy` `:167`, `Postprocessable` `:415`), `NeighborhoodInformation`
203 (`NeighborComparator` `:196-202`, `(int) Math.signum(cmp)`), `ICompactor` 34. `BKNodePlacer` declares
`HIERARCHY_PROCESSING_ADDITIONS` (`:123-126`, before P5): cached static getter (N4). No `Random`.

## Task

1. Port the seven files to `src/alg/layered/p4nodes/bk/` with `@see`, Java method boundaries, every branch.
   `BKNodePlacer` → facade plus section files (P1); nested types as prefixed files (M15): `BKCompactorClassNode.ts`,
   `BKCompactorClassEdge.ts`, `BKAlignedLayoutHDirection.ts`, `BKAlignedLayoutVDirection.ts`,
   `ThresholdStrategyNullThresholdStrategy.ts`, `ThresholdStrategySimpleThresholdStrategy.ts`,
   `ThresholdStrategyPostprocessable.ts`, `NeighborhoodInformationNeighborComparator.ts` (or a local comparator
   function; keep the Java name in the `@see`). Keep the Java import boundary `BKAligner` → `BKNodePlacer` statics with
   `BKNodePlacer` → `BKAligner`; if the entry-point probe (T2's fitness test, run per `npx vitest run
   test/architecture/layered-entry-points.fitness.test.ts` after T8 wires the arm) reports a temporal dead zone, move
   `getEdge`/`getBlocks` to a `BKNodePlacerBlocks.ts` section both import, and journal in the hand-back.
2. N6: `BKCompactor.placeBlock` (`J/BKCompactor.java:167`, recursion over neighbouring blocks' roots) → explicit-stack
   loop plus a verbatim recursive twin in the test file, equal on every BK row graph and on a 5,000-node chain under
   `npx vitest run --pool=forks --execArgv=--jitless` (precedent `src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:145-180`).
   Confirm it is a true recursion first (it calls itself at two sites inside the neighbour loop); if not, keep the
   Java shape and say so.
3. N7 (AD-10): `sinkNodes` (`:55`, `Maps.newHashMap`, iterated at `:341` and `:378`) → insertion-ordered `Map`, one
   journal line in the hand-back; `BKNodePlacer.markedEdges` (`:140`) and `ThresholdStrategy.blockFinished` (`:55`) are
   membership-only `Set`s; `getBlocks`/`getClasses` (`Maps.newLinkedHashMap`, `Sets.newLinkedHashSet`) → `Map`/`Set`.
   `Arrays.sort(calculatedYs)` (`:452`) on `double[]` → numeric sort. `NeighborComparator` → `d2i(Math.signum(cmp))`
   with `Collections.sort` → the stable sort the 7c classes use (`Array.prototype.sort` is stable).
4. N8: `monitor.log(...)` calls verbatim (`J/BKNodePlacer.java:230-234`, `:277-281`, `:608-611`, `:622-624`),
   including `BKAlignedLayout.toString` (`:320-335`), `getClasses` and the `+` string building (`Map`/`List`
   `toString` as Java prints them: state the shape in the hand-back; a test pins it).
5. C6: the `==`/`!=` at `BKAlignedLayout.java:170,205,243` compare `LNode`s (identity); `bal.align[v.id].equals(v)`
   sites are identity; no boxed compare expected — state the audit.
6. Tests, colocated, L4: replay every `scenarios/*` and `models/*` row whose stop is `P4` with `BRANDES_KOEPF`, all
   13 straightening/alignment configurations, with the placer injected through T3's `Factories`;
   `comparePlacement` `[]`, `comparePlacementFullDump` `[]` where a dump exists; the twin test; a test with a logging
   monitor (`new BasicProgressMonitor().withLogging(true)`, `src/core/util/BasicProgressMonitor.ts:106-110,271-292`) that the
   four Java log messages appear for a small row.

## Write-set

`src/alg/layered/p4nodes/bk/*.ts` and their `.test.ts` (seven classes, their section and nested-type files).

## Read-set

`J/*.java`, `src/alg/layered/p3order/LayerSweepCrossingMinimizer.ts:1-80` (cached static configuration getter),
`src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:140-180`, `src/java/lang/JavaMath.ts` (`d2i`),
`src/core/util/{Pair,BasicProgressMonitor}.ts`, `src/guava/Lists.ts`, `test/helpers/layered-placement-replay-*.ts`
(T3 contract), `decisions.md` N4–N8.

## Architecture decisions

N4, N5 (`d2i`), N6 (`placeBlock`), N7 (`sinkNodes`), N8 (log lines verbatim), M15, P1.

## Interface contract (consumed by T8)

`new BKNodePlacer()` with `getLayoutProcessorConfiguration(graph)` and `process(graph, monitor)` as in Java.

## Acceptance criteria

- Given the 13 BK configurations' rows, when replayed with the placer injected, then no diff.
- Given the `placeBlock` twin on every BK row and a 5,000-node chain under `--jitless`, when compared, then equal and
  no overflow.
- Given a logging monitor on a small row, when BK runs, then the four Java log lines appear verbatim.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
