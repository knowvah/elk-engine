<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — `TestGraphCreator`, `MockRandom`, identity assertion

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T2): port the greedy-switch test graph creator`

## Context

Mission 7c-tests ([README](../README.md)) ports ELK's hand-built crossing-minimization JUnit suites. All of them build
their graphs with `JT/intermediate/greedyswitch/TestGraphCreator.java` (1,388 lines; `JT` =
`$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`), directly or through two
subclasses ported in batch 2. Later missions' suites use it too (`BasicNodePlacementTest`, `BasicEdgeRouterTest`,
`InLayerConstraintProcessorTest`, `Issue726Test`, `Issue734Test`).
Decisions T3, T4, T5 apply ([decisions.md](../decisions.md)). The LGraph model is ported (`src/alg/layered/graph/`),
as are `InternalProperties`, `LayeredOptions`, `GraphProperties` and the `Random` shim (`src/java/util/Random.ts`).
Precedent for a ported Java test helper: `test/helpers/TestPhases.ts`.

## Task

1. `test/helpers/TestGraphCreator.ts`: a faithful port of the Java class — every field, every method (graph builders
   such as `getCrossFormedGraph`, `nestedGraph`, and the primitives `addNodeToLayer`, `addPortOnSide`,
   `eastWestEdgeFromTo`, `addInLayerEdge`, `setFixedOrderConstraint`, `setUpIds`, `copyOfNodesInLayer`, …) in Java order
   with Java names, all public (T3), `/** @see …/TestGraphCreator.java */` per member. The constructor makes a fresh
   graph and `MockRandom` and calls `setUpGraph` as Java does. `MockRandom` (exported nested class or sibling export)
   extends the `Random` shim per T4. Guava calls become local idiom (push-forward); Java `int` arithmetic in id or
   index helpers keeps Java semantics.
2. `test/helpers/junit-asserts.ts`: `expectSameElements<T>(actual: Iterable<T>, expected: readonly T[]): void` (T5).
3. Tests (`TestGraphCreator.test.ts`, `junit-asserts.test.ts` beside them): structural checks derived from the Java
   source of each builder — layer count, nodes per layer, node types, port sides per node, edge count — for every
   graph getter; `MockRandom` sequence and setters; `expectSameElements` passes on the same objects in order and fails
   on a structurally equal distinct node, a reordering and a length mismatch.

## Interface contract (consumed by T3a, T3b, T4–T8)

```ts
export class TestGraphCreator {
  constructor();
  getGraph(): LGraph;
  getRandom(): MockRandom;
  setRandom(random: MockRandom): void;
  // every Java method, same name and parameter order, e.g.
  getCrossFormedGraph(): LGraph;
  addNodeToLayer(layer: Layer): LNode;
  makeLayer(): Layer; // makeLayer(graph) overload → second method or optional parameter, noted inline
}
export class MockRandom extends Random {
  setNextBoolean(b: boolean): void; setChangeBy(d: number): void; setCurrent(f: number): void;
}
export function expectSameElements<T>(actual: Iterable<T>, expected: readonly T[]): void;
```

Java overloads (same name, different parameters) map to one TS method with optional or union parameters when the
bodies are trivially related, otherwise to suffixed names; list every overload mapping in the file header so the suite
agents can follow it.

## Write-set

`test/helpers/TestGraphCreator.ts`, `test/helpers/TestGraphCreator.test.ts`, `test/helpers/junit-asserts.ts`,
`test/helpers/junit-asserts.test.ts`.

## Acceptance criteria

- Given each graph getter, when called on a fresh creator, then its structure equals what the Java builder makes
  (the counts written in the test come from reading the Java source, one assertion block per getter).
- Given `MockRandom` with defaults, when `nextFloat()` is called twice, then the results are `Math.fround(0 + 0.0001)`
  and the float sum after it; `nextDouble()` returns the same float sequence; `nextBoolean()` returns the set value.
- Given two distinct nodes with equal structure, when `expectSameElements([a], [b])` runs, then it fails.
- Given `npm run typecheck` and `npx prettier --check` on the four files, then clean.

## Observability / Rollback

N/A — test helpers only. Reversible (new files).
