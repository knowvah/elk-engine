<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Spline data: `SplineSegment`, `SplinesMath`, `Rectangle`, the router's nested types

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the spline segment and its geometry helpers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T6/`.

## Context

Mission 7e (README), R1, R6, R9, R12, R14. 951 Java lines the spline router (T8) and the bend-point calculator (T9)
build on: `SplineSegment` 304 (staged since 7a as `src/alg/layered/p5edges/splines/SplineSegment.ts`, `@staged 7e`;
public fields `:60-121`, nested `EdgeInformation` `:129`, constructors `:155,208` — the first iterates the
`Set<Pair<SideToProcess, LEdge>>` R9 describes —, `addEdge` `:232`, `anchorY` `:245`, `compareTo` `:261`,
`setRelevantPositions` `:284`), `SplinesMath` 310 (static geometry; `DEC_FORMAT` `:135-148`), `Rectangle` 337
(`union` overloads `:148-196`, `enlarge` `:215`, `getFromPortSide` `:283`, `toNodeMargins` `:307`, `toString`
`:329` with `DEC_FORMAT` `:322`). `SplineSegment` imports `SplineEdgeRouter.Dependency` (`:1011`) and `SideToProcess`
(`:1043`): nested types of T8's class, ported here as prefixed files so T8 and T9 import them (M15).

## Task

1. Port `SplineSegment.ts` (replace the stub; remove the `@staged` line and the row from
   `test/architecture/staged-classes.json`), `SplineSegmentEdgeInformation.ts`, `SplineEdgeRouterDependency.ts`,
   `SplineEdgeRouterSideToProcess.ts` (enum with `values`/`valueOf`/`ordinal`), `SplinesMath.ts`, `Rectangle.ts` with
   `@see`, Java method boundaries, every branch; overloads per `alg-common.md` §6.5. `SplineSegment.edges` is an
   insertion-ordered `Set` (R9, journal), `leftPorts`/`rightPorts` plain `Set`s, `edgeInformation` a `Map`; the
   constructor iterates its argument in the order given. `DEC_FORMAT.format(x)` becomes a local one-decimal
   HALF_EVEN formatter in each file (R6; prose only). `SplineSegment.compareTo` and `Rectangle` arithmetic verbatim.
2. C6: grep for boxed compares (none expected; state it). R8: `union` and `convertKVectorToString` are overload
   pairs, not recursion; confirm.
3. Tests, colocated, L4 (R14): every `calls/SplinesMath/*` and `calls/Rectangle/*` row through T3's `runCall` with
   the callers mapped to the static methods, `compareCall` `[]`; `SplineSegment` structural cases (field defaults,
   `compareTo` ordering on `mark`, `isHyperEdge`, the `EdgeInformation` shape) and the constructor on a hand-built
   two-edge port set asserting only what the Java text states structurally (which ports land left/right); the
   geometry literals wait for T8's rows (say so).
4. `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`, `npx vitest run <files>
   test/architecture/staged-classes.fitness.test.ts` clean.

## Write-set

`src/alg/layered/p5edges/splines/{SplineSegment,SplineSegmentEdgeInformation,SplineEdgeRouterDependency,
SplineEdgeRouterSideToProcess,SplinesMath,Rectangle}.ts` (+ tests), `test/architecture/staged-classes.json`.

## Read-set

The three Java files, `J/p5edges/splines/SplineEdgeRouter.java:1011-1049` (the nested types),
`src/alg/layered/p5edges/splines/SplineSegment.ts` (stub), `test/architecture/staged-classes.fitness.test.ts:1-40`,
`src/alg/layered/p4nodes/bk/BKAlignedLayout*.ts` (M15 enum/nested pattern), `src/core/math/{ElkRectangle,ElkMargin,
KVector}.ts`, `src/alg/layered/graph/LShape.ts`, `test/helpers/layered-routing-replay-ops.ts` (`runCall`),
`decisions.md` R6, R9, R12, R14.

## Architecture decisions

R1, R6 (formatter), R9 (`edges` insertion order), R12 (`calls` rows as the proof), R14, M15, L1 (unstaging).

## Interface contract (consumed by T7, T8, T9)

Java names exactly: `SplineSegment` with both constructors (`(singlePort, edges: Iterable<Pair<SideToProcess, LEdge>>,
sourceSide)`, `(edge, sourceSide, targetSide)`), public fields as in `:60-121`, `addEdge`, `isHyperEdge`, `compareTo`,
`setRelevantPositions`; `SplineEdgeRouterDependency(source, target, weight)`; `SplineEdgeRouterSideToProcess.LEFT/RIGHT`;
`SplinesMath` and `Rectangle` statics and instance methods as in the Java.

## Acceptance criteria

- Given every `calls/SplinesMath/*` and `calls/Rectangle/*` row, when run through `runCall`, then `compareCall` is `[]`.
- Given `staged-classes.json`, when the fitness test runs, then green without the `SplineSegment` row and the file has
  no `@staged` marker.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean.

## Observability / Rollback

N/A. Reversible.
