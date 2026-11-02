<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3a — `InLayerEdgeTestGraphCreator`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3a): port the in-layer edge test graph creator`

## Context

`JT/intermediate/greedyswitch/InLayerEdgeTestGraphCreator.java` (407 lines) extends `TestGraphCreator` and adds 13
in-layer-edge graph builders used by `CrossingsCounterTest`, `InLayerEdgeTwoNodeCrossingCounterTest` and
`AllCrossingsCounterTest` (batch 3). T2 ported the base class to `test/helpers/TestGraphCreator.ts`; follow its header
for the overload mapping. Decisions T3 and T5 apply.

## Task

`test/helpers/InLayerEdgeTestGraphCreator.ts`: `export class InLayerEdgeTestGraphCreator extends TestGraphCreator`,
every Java method in order, Java names, public, `@see` per member. `InLayerEdgeTestGraphCreator.test.ts`: structural
checks per builder from the Java source (layers, nodes per layer, port sides, edges, in-layer edge count).

## Write-set

`test/helpers/InLayerEdgeTestGraphCreator.ts`, `test/helpers/InLayerEdgeTestGraphCreator.test.ts`.

## Interface contract (consumed by T7)

The Java public surface, same names and parameter order; constructor as Java (fresh graph and `MockRandom` from the
base constructor).

## Acceptance criteria

- Given each builder, when called on a fresh creator, then the structure equals the Java builder's.
- Given typecheck and prettier on the two files, then clean; the test file passes.

## Observability / Rollback

N/A — test helper. Reversible (new files).
