<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Enum `create` section, predicate stub, ARMS tally

**Agent:** orchestrator (main session) · **Commit:** `refactor(T2): move the processor factory chain to a section`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7e (README), R4, R5. `src/alg/layered/intermediate/IntermediateProcessorStrategy.ts` is at 499 of 500 lines
(7d flag 3): the next arm wired there trips the complexity hook. The nine-link `create` chain (`:214-460`) moves to a
section file before batch 2 ports anything, so that T5, T9 and T10 wire arms in a file with room. The orthogonal and
spline routers read `PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT` (`J/p5edges/OrthogonalEdgeRouter.java:261-263`,
`J/p5edges/splines/SplineEdgeRouter.java:211-214`); T4 and T8 would otherwise import a file T5 writes in the same
batch, so this task writes the predicate now and T5 completes the class.

## Task

1. `src/alg/layered/intermediate/IntermediateProcessorStrategyCreate.ts`: `export function
   createIntermediateProcessor(strategy: IntermediateProcessorStrategy): ILayoutProcessor<LGraph>` holding the nine
   links verbatim, each `switch` on `strategy.name()` with the Java constant names as string literals (R5), the
   `notPorted` helper, and the last link's `IllegalArgumentException` text unchanged; `import type` for the enum, value
   imports for the processor classes (moved from the enum file). The enum file keeps the constants, `#VALUES`,
   `values`, `valueOf`, `ordinal`, `name`, `toString`, `compareTo` and a `create()` that returns
   `createIntermediateProcessor(this)`; its doc comment names the section. No arm changes behaviour; the six 7e arms
   still throw naming 7e (edit their mission string from `7f` to `7e`: `HYPEREDGE_DUMMY_MERGER`,
   `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `HIERARCHICAL_PORT_POSITION_PROCESSOR`, `FINAL_SPLINE_BENDPOINTS_CALCULATOR`,
   `LONG_EDGE_JOINER`, `NORTH_SOUTH_PORT_POSTPROCESSOR`).
2. `IntermediateProcessorStrategy.test.ts`: the `ARMS` table (`:97-`) moves those six to `'7e'`; the tally
   (`:251-255`) becomes `{ '7b': 10, '7c': 10, '7d': 5, '7e': 6, '7f': 19, '7g': 9 }` (count the table first; 59
   members); the "ports exactly" case (`:233-239`) keeps 25 ported / 34 pending until T10. A new case asserts that
   `createIntermediateProcessor` and `create()` agree for every member (instance class or the same exception).
3. `src/alg/layered/p5edges/PolylineEdgeRouter.ts`: the class with `@see`, `PRED_EXTERNAL_WEST_OR_EAST_PORT`
   ported verbatim as a static function `(node: LNode) => boolean` (`J/p5edges/PolylineEdgeRouter.java:62-69`, reads
   `InternalProperties.EXT_PORT_SIDE`, `NodeType.EXTERNAL_PORT`), and `getLayoutProcessorConfiguration`/`process`
   throwing `UnsupportedOperationException('PolylineEdgeRouter is completed in T5')`; a header comment `// mission-
   internal stub: T5 completes it` (not `@staged`: `staged-classes.json` is for later missions). A colocated test
   pins the predicate on a hand-built external-port dummy (structural, L4-neutral) and the throw.
4. `npx vitest run test/architecture test/melk src/alg/layered/intermediate/IntermediateProcessorStrategy.test.ts
   src/alg/layered/p5edges`: green; `npm run typecheck`, `npm run format:check`, `npm run complexity` clean; the
   enum file is well under 500 lines (report the count).

## Write-set

`src/alg/layered/intermediate/{IntermediateProcessorStrategy,IntermediateProcessorStrategyCreate}.ts` + their tests,
`src/alg/layered/p5edges/PolylineEdgeRouter.ts` + test.

## Read-set

`src/alg/layered/intermediate/IntermediateProcessorStrategy.ts` (whole), `IntermediateProcessorStrategy.test.ts:90-260`,
`J/intermediate/IntermediateProcessorStrategy.java:184-330` (the switch), `J/p5edges/PolylineEdgeRouter.java:60-70`,
`src/alg/layered/p4nodes/SimpleNodePlacer.ts:1-50` (file shape), `decisions.md` R4, R5, `plans/layered-framework/decisions.md`
P1 (sections never import the facade).

## Architecture decisions

R5 (section switching on `name()`, type-only import), R4 (nothing new is wired here), P1, M15.

## Interface contract (consumed by T4, T5, T8, T9, T10)

`createIntermediateProcessor(strategy)` is the only place an arm is wired: T5, T9 and T10 edit the section, never the
enum. `PolylineEdgeRouter.PRED_EXTERNAL_WEST_OR_EAST_PORT(node)` is importable from
`src/alg/layered/p5edges/PolylineEdgeRouter.ts` from batch 2 on.

## Acceptance criteria

- Given every enum member, when `create()` and `createIntermediateProcessor` run, then the same instance class or
  the same exception message; the tally is `7b 10 / 7c 10 / 7d 5 / 7e 6 / 7f 19 / 7g 9`.
- Given the entry-point fitness test, when run, then green (no import order changed).
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean; the enum file is under 300 lines.

## Observability / Rollback

N/A. Reversible: revert the commit.
