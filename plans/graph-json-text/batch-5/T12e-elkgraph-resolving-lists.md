<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12e — ElkGraph resolving lists

**Agent:** typescript-pro · **Commit:** `feat(T12e): resolve proxies in elkgraph edge endpoint lists`

## Context
D13: `ElkEdgeImpl.getSources/getTargets` (`ElkEdgeImpl.java:195-209`) and `ElkConnectableShapeImpl.getOutgoingEdges/
getIncomingEdges` are `EObjectWithInverseResolvingEList.ManyInverse` in Java; the port uses the non-resolving
`ManyInverse` (`src/graph/impl/ElkEdgeImpl.ts:80-92`, `ElkConnectableShapeImpl.ts:38-50`). T12b provides the resolving
lists; T12h records the inverse state the JVM produces (proxy's own inverse lists after load; target inverse lists
after access vs. `resolveLazyCrossReferences`).

## Task
1. Switch the four getters to the resolving list classes; update the class docs' "Not ported (D4)" notes for the
   `eIsProxy()` arms D13 now covers (`toString` proxy arms only where output is observable; else documented).
2. Tests: every existing `src/graph` and layout test passes unchanged; new unit tests build a proxy `ElkNode` (URI set,
   via T12a) in `sources` and check resolution through a stub resource (T12a `ResourceImpl` subclass) and the inverse
   effects T12h recorded.
3. Benchmark edge-endpoint access before/after on the largest layout test graph (report numbers; d13-plan risk 8).

## Write-set
`src/graph/impl/{ElkEdgeImpl,ElkConnectableShapeImpl}.ts` (+ colocated tests); doc-only edits to other
`src/graph/impl/*Impl.ts` "Not ported" notes if they name D4 proxies (list them).

## Acceptance criteria
- Given the full suite and the 4b vectors, when run, then unchanged.
- Given the T12h rows, when the same access paths run on a TS-built equivalent, then the inverse lists match.
