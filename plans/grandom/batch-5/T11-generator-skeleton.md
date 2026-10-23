<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Generator skeleton, elements, rewire, `BlindTextGenerator`

**Agent:** typescript-pro · **Commit:** `feat(T11): port the random graph generator elements and rewiring`

## Context
D4 and D8 ([decisions.md](../decisions.md#d4--randomgraphgenerator-split)). `RandomGraphGenerator.java` fields
(`random`, `options`, `nodeLabelCounter`, `portLabelCounter`, `maxHierarchyLevel`, …), ctor `:80`, `randomInt`
`:1759`, `isHypernode` `:1771`, `get`/`set` `:1775-1782`; elements `createIndependentSet` `:1040`, `createClique`
`:1058`, `createNode` `:1075`, `createPort` `:1115`, `distributePorts` `:1686`; `connect` `:1174`, `addEdgeLabel`
`:1247`, `retrievePort` `:1269` (rewire calls them); rewire
`moveSource` `:1340`, `moveTarget` `:1419`, `split` `:1502`. `BlindTextGenerator.java` makes a fresh `new Random()`
per call (unseeded; never in exact goldens). Every `float` through `Math.fround` (D8); `createNode` sets
`CoreOptions.HYPERNODE` / `PORT_CONSTRAINTS` from `src/core/options`.

## Task
1. `RandomGraphGenerator.ts`: class, fields (non-private, `@internal`), ctor, `randomInt`, `isHypernode`, `get`, `set`.
   The `generate` methods come in T12.
2. `RandomGraphGeneratorElements.ts`, `RandomGraphGeneratorRewire.ts`: the methods above as exported functions taking
   the generator first, Java order and draws kept.
3. `RandomGraphGeneratorConnect.ts`: `connect`, `addEdgeLabel`, `retrievePort` only (the rest comes in T12).
4. `BlindTextGenerator.ts`: `generate()` with `new Random()` per call; text constant verbatim.
5. Tests, expected values derived from the Java source before the code (AD-13): with a seeded `Random` and hand-set
   `GeneratorOptions`, `createNode` ids/labels/sizes (sizes equal `RandVal.floatVal` draws on a parallel
   `Random(seed)`), `createClique` edge count n(n−1)/2, `retrievePort` reuse vs create, `moveSource`/`moveTarget`/
   `split` resulting topology, `distributePorts` sides; `BlindTextGenerator` length in [40, 49] and a substring of
   the blind text.

## Write-set
`src/core/debug/grandom/generators/{RandomGraphGenerator,RandomGraphGeneratorElements,RandomGraphGeneratorRewire,
RandomGraphGeneratorConnect,BlindTextGenerator}.ts` (+ tests).

## Read-set
`RandomGraphGenerator.java` at the lines above, `BlindTextGenerator.java`, `src/graph/util/ElkGraphUtil.ts`,
`src/core/options` (`CoreOptions`, `PortSide`, `PortConstraints`), T7's `GeneratorOptions`/`RandVal`, T4's shims,
`docs/translation-rules.md` §1.5–1.6, §3, §6.5.

## Interface contracts (outputs)
Generator class + helper functions with Java names; consumed by T12–T14.

## Acceptance criteria
- Given `CREATE_NODE_LABELS` and `SET_NODE_SIZE`, when `createNode` runs twice, then ids `n0`, `n1`, labels `N0`,
  `N1`, and sizes equal the parallel `floatVal` draws.
- Given a node whose ports have only outgoing edges and `USE_EXISTING_PORTS_CHANCE` = exact 1, when
  `retrievePort(node, true)` runs, then an existing port is returned; with chance 0 a new port is created.
- Given an edge `a→b`, when `split(edge)` runs, then it returns `(m, e2)` with `a→m` (the original edge, target
  moved) and `e2 = m→b`, both contained by `updateContainment`'s choice (`RandomGraphGenerator.java:1502-1513`).
- Given `BlindTextGenerator.generate()` called 50 times, when checked, then every length is in [40, 49].

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
