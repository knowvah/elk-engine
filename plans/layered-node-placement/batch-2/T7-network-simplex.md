<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — `NetworkSimplexPlacer`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port the network simplex node placer`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T7/`.

## Context

Mission 7d (README), N4–N7. One class of 1,356 Java lines (`J/p4nodes/NetworkSimplexPlacer.java`): builds an `NGraph`
(`src/alg/common/networksimplex/{NetworkSimplex,NGraph,NNode,NEdge}.ts`, 6a, the layerer of 7b is the TS precedent:
`src/alg/layered/p2layers/NetworkSimplexLayerer*.ts`), flexible nodes (`NodeFlexibility.getNodeFlexibility`,
`src/alg/layered/options/NodeFlexibility.ts:121`; `J/options/NodeFlexibility.java:84`), paths of long edges
(`:1232-1270`), applies the solution to node `y`, node sizes, port and label positions (`:744-781`). Nested
`NodeRep` `:821`, `EdgeRep` `:839`, `Path extends ArrayList<LEdge>` `:954`. `HIERARCHY_PROCESSING_ADDITIONS`
(`:158-161`, declared; `:212-216` returned on external ports; before P5): cached static getter (N4). Uses `DoubleMath.fuzzyEquals` (`src/guava/DoubleMath.ts`),
`Math.round`, `(int) Math.ceil`, `ElkMargin`, `NodeLabelPlacement`, `PortConstraints`, `PortSide`. No `Random`.

## Task

1. Port as a facade `NetworkSimplexPlacer.ts` plus section files along the Java sections (graph building, flexible
   nodes, paths and weights, applying the solution; P1) and the nested types as prefixed files
   (`NetworkSimplexPlacerNodeRep.ts`, `…EdgeRep.ts`, `…Path.ts`; `Path extends ArrayList` → a class over an array with
   the members the Java uses, `containsFlexibleNode(Predicate)` `:974` included) with `@see`, every branch.
2. N5: `(int) Math.ceil(…)` (`:414,482,545,557`) → `d2i(Math.ceil(…))`; `(int) Math.max(0, …)` (`:595-596`) → `d2i`;
   `Math.round` (`:333,341`) → the `JavaMath.round` shim; `Math.floor` verbatim. The two `assert` lines (`:592`,
   `:1131`) are omitted with a comment naming the Java line (every mission so far; the `devAssert` helper does not
   exist). `getEdgeWeight` is an overload pair (`:796` on `LEdge`, `:803` on two `NodeType`s), not a recursion: map the
   names per `alg-common.md` § 6.5.
3. N6: `follow` (`:1248-1265`, tail-recursive along a path of long-edge dummies, depth = layers) → explicit loop plus a
   verbatim recursive twin in the test, equal on every `NETWORK_SIMPLEX` row graph and on a 5,000-layer chain under
   `npx vitest run --pool=forks --execArgv=--jitless` (precedent `src/alg/layered/p1cycles/BasicCycleBreakerTest.test.ts:145-180`).
4. N7 (AD-10): `portMap` (`:175`, `Map<LGraphElement, NNode>`, lookups only) → `Map`; `flexibleWhereSpacePermitsEdges`
   (`:190`, `isEmpty` at `:266`) → `Set`; `NEdge`/`NNode` are identity-hashed (no `hashCode` override in
   `org.eclipse.elk.alg.common.networksimplex`). State any iteration you find in the hand-back.
5. C6: grep for `==`/`!=` on boxed values (`Integer` layer indices come from `NNode.layer`, an `int`); state the
   audit. `int` differences in comparators through `Int32.sub`.
6. Tests, colocated, L4: replay every `scenarios/*` and `models/*` row whose stop is `P4` with `NETWORK_SIMPLEX`,
   every flexibility variant included (those rows carry port and label geometry, N3), with the placer injected
   through T3's `Factories`; `comparePlacement` `[]`, `comparePlacementFullDump` `[]` where a dump exists; the `follow`
   twin test. The `NODE_PLACEMENT_REPEATER` rows belong to T4/T8, not here.

## Write-set

`src/alg/layered/p4nodes/NetworkSimplexPlacer.ts`, its section and nested-type files `NetworkSimplexPlacer*.ts`, their
`.test.ts`.

## Read-set

`J/p4nodes/NetworkSimplexPlacer.java`, `J/options/NodeFlexibility.java`, `src/alg/layered/p2layers/NetworkSimplexLayerer*.ts`
(the 6a API in use), `src/alg/common/networksimplex/{NetworkSimplex,NGraph,NNode,NEdge}.ts` (exports),
`src/java/lang/JavaMath.ts` (`d2i`, `round`), `src/guava/DoubleMath.ts`, `src/alg/layered/p3order/LayerSweepCrossingMinimizer.ts:1-80`
(cached static getter), `test/helpers/layered-placement-replay-*.ts` (T3 contract), `decisions.md` N4–N7.

## Architecture decisions

N4, N5 (`d2i`, `round`, asserts omitted), N6 (`follow`), N7, M15, P1.

## Interface contract (consumed by T8)

`new NetworkSimplexPlacer()` with `getLayoutProcessorConfiguration(graph)` and `process(graph, monitor)` as in Java.

## Acceptance criteria

- Given the `NETWORK_SIMPLEX` rows including every flexibility variant, when replayed with the placer injected, then no
  diff, port and label positions included.
- Given the `follow` twin on every row and the deep case under `--jitless`, when compared, then equal and no overflow.
- Given `npm run typecheck`, prettier and `npm run complexity`, when run, then clean (section files under the limits).

## Observability / Rollback

N/A. Reversible.
