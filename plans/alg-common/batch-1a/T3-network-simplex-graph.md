<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — Network simplex graph: `NEdge`, `NNode`, `NGraph`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T3): port network simplex graph structures`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). `NetworkSimplex` (T7) operates on these. Layered (7a) builds `NGraph`s for node placement and
layering.

## Task
1. Port `J/networksimplex/{NEdge,NNode,NGraph}.java`. The nested builders (`NEdge.NEdgeBuilder`, and `NNode`'s if
   any) go in prefixed files (M15) and are reachable as Java code addresses them (`NEdge.of()` and so on).
2. `NGraph.java:56` `Map<NNode, ElkNode> nodeMap = Maps.newHashMap()` is identity-hashed. Use a `Map` in insertion
   order; journal it and draft an I-row (P2). Check whether its iteration is observable.
3. Keep every public field Java code touches (`id`, `layer`, `internal`, `treeNode`, `outgoingEdges`, `incomingEdges`,
   …) with Java default values: `0`, `false`, `null`, never `undefined`.
4. Port every helper of `NGraph`: `isConnected`, `makeConnected`, `writeDebugGraph` or equivalent. A file-writing debug
   helper follows AC4: keep the logic, write nothing.
5. Write unit tests derived from the Java: builder wiring (source/target lists on both nodes), `NGraph` connectivity
   helpers, and Java defaults.

## Write-set
`src/alg/common/networksimplex/{NEdge,NNode,NGraph}.ts`, prefixed builder files, colocated tests.

## Read-set
- The three Java files; `J/networksimplex/NetworkSimplex.java:1-130` (only to see which members it uses).
- `src/graph/ElkNode.ts`, `src/java/lang/Int32.ts`.
- `decisions.md#pre-made`.

## Interface contracts (outputs, consumed by T7)
- `NEdge.of(): NEdgeBuilder`, and `NEdgeBuilder.{source,target,delta,weight,…}().create()`, as Java.
- `NNode.of(): NNodeBuilder`, `NNode` fields as Java.
- `NGraph`: `nodes: NNode[]`, and the helpers as Java.

## Acceptance criteria
- Given an `NEdge` built from two nodes, when created, then it is in the source's `outgoingEdges` and the target's
  `incomingEdges`, as `NEdge.java` does.
- Given a disconnected `NGraph`, when `makeConnected` (or Java's equivalent) runs, then the result follows the Java.
- Given a new `NNode`, when inspected, then every field has the Java default value.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
