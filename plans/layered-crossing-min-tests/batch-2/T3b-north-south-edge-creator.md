<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3b — `NorthSouthEdgeTestGraphCreator`

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3b): port the north-south edge test graph creator`

## Context

`JT/intermediate/greedyswitch/NorthSouthEdgeTestGraphCreator.java` (902 lines) extends `TestGraphCreator` and adds 30
builders of graphs with north/south port dummies and long-edge dummies, used by
`NorthSouthEdgeAllCrossingsCounterTest`, `AllCrossingsCounterTest` (T7), `NorthSouthEdgeNeighbouringNodeCrossingsCounterTest`,
`GreedySwitchProcessorTest` and `SwitchDeciderTest` (T8). T2 ported the base class to
`test/helpers/TestGraphCreator.ts` (see its header for the overload mapping); the base helpers `setAsNorthSouthNode`
and `setAsLongEdgeDummy` set the dummy properties. Decisions T3 and T5 apply.

## Task

`test/helpers/NorthSouthEdgeTestGraphCreator.ts`: `export class NorthSouthEdgeTestGraphCreator extends
TestGraphCreator`, every Java method in order, Java names, public, `@see` per member.
`NorthSouthEdgeTestGraphCreator.test.ts`: structural checks per builder from the Java source (layers, node types incl.
`NORTH_SOUTH_PORT` and `LONG_EDGE`, `IN_LAYER_LAYOUT_UNIT` / `ORIGIN` links, port sides, edges).

## Write-set

`test/helpers/NorthSouthEdgeTestGraphCreator.ts`, `test/helpers/NorthSouthEdgeTestGraphCreator.test.ts`.

## Interface contract (consumed by T7, T8)

The Java public surface, same names and parameter order; constructor as Java.

## Acceptance criteria

- Given each builder, when called on a fresh creator, then the structure equals the Java builder's, including which
  dummies point at which origin node.
- Given typecheck and prettier on the two files, then clean; the test file passes.

## Observability / Rollback

N/A — test helper. Reversible (new files).
