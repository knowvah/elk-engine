<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — `RecursiveGraphLayoutEngine`

**Agent:** typescript-pro, **model: opus** (621 lines of order-sensitive control flow) · **Commit:**
`feat(T16): port the recursive graph layout engine`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
The first TS layout entry point. `src/core/IGraphLayoutEngine.ts` is the interface. Flow
(`diagrams/data-flow.md`): `layout` counts nodes, begins the monitor, applies `DeprecatedLayoutOptionReplacer`
(exists) and — if the root has no `RESOLVED_ALGORITHM` — `LayoutAlgorithmResolver` via `ElkUtil.applyVisitors`, then
`layoutRecursively` (316 Java lines: topdown layout with `TopdownSizeApproximator` and scaling, hierarchy handling
`INCLUDE_CHILDREN` when the algorithm supports `COMPOUND`/`CLUSTERS` and `SEPARATE_CHILDREN` inheritance, inside
self loops when it supports `INSIDE_SELF_LOOPS`, child-first recursion) and `executeAlgorithm` (instance pool fetch,
`TestController` install/uninstall, `dispose` on exception, `release` on success). Side-effect order is load-bearing
("The Java Is Sacred": do not reorder). M6: `testEmptyAlgorithmId` needs layered and is deferred to mission 7a.
Scope discipline: implement exactly the Java; no new options or APIs; if scope is ambiguous, take the minimal reading
and journal it.

## Task
1. Port `J/RecursiveGraphLayoutEngine.java` in method order: both `layout` overloads, `layoutRecursively`,
   `executeAlgorithm`, `countNodesRecursively`, `evaluateHierarchyHandlingInheritance`, `countNodesWithHierarchy`,
   `gatherInsideSelfLoops`, `postProcessInsideSelfLoops`. `layoutRecursively` will exceed the complexity limits:
   split into private helpers at the Java's commented sections, in order (standing rule; stop 10 if impossible).
   Java `Queue`/`Lists`/`Collections` → arrays or `src/java/util` shims where order semantics matter.
2. Port `RecursiveGraphLayoutEngineTest`: `testUnresolvedGraph`, `testResolvedGraph`, `testUnknownAlgorithmId`
   verbatim; `testEmptyAlgorithmId` as a documented deferral in the header (pattern:
   `src/core/data/LayoutDataContentAssist.test.ts:1-12`). `PlainJavaInitialization` → `LayoutMetaDataService.getInstance()`
   (fixed/box/random registered).
3. Branch tests from the Java source using test-registered algorithms (supported features set as needed): topdown
   root/hierarchical/parallel node types with each approximator, `INCLUDE_CHILDREN` with and without `COMPOUND`
   support, `SEPARATE_CHILDREN` inheritance, inside self loops gather → layout → post-process offsets, provider
   exception → `dispose` and rethrow, `TestController` targeting.

## Write-set
`src/core/RecursiveGraphLayoutEngine.ts` (+ test).

## Read-set
`J/RecursiveGraphLayoutEngine.java`;
`$ELK_SOURCE_DIR/test/org.eclipse.elk.core.test/src/org/eclipse/elk/core/RecursiveGraphLayoutEngineTest.java`;
`src/core/{IGraphLayoutEngine,AbstractLayoutProvider}.ts`; `src/core/data/{LayoutAlgorithmData,
LayoutAlgorithmResolver,DeprecatedLayoutOptionReplacer}.ts`; `src/core/options/{CoreOptions (symbols),
TopdownSizeApproximator,TopdownNodeTypes,HierarchyHandling,ContentAlignment}.ts`; `src/core/util/{ElkUtil,
BasicProgressMonitor,InstancePool}.ts`; `src/core/testing/TestController.ts`; `src/graph/util/ElkGraphUtil.ts` (symbols).

## Interface contracts (outputs)
`class RecursiveGraphLayoutEngine implements IGraphLayoutEngine`: `layout(graph, monitor)`,
`layout(graph, testController | null, monitor)` (one method, Java overloads per the existing overload convention),
protected `layoutRecursively`, `executeAlgorithm`. Consumed by T17–T19.

## Acceptance criteria
- `testUnresolvedGraph`, `testResolvedGraph`, `testUnknownAlgorithmId` pass verbatim (box layout gives the root
  positive size; `foo.Bar` throws `UnsupportedConfigurationException`).
- Given a provider that throws, when `executeAlgorithm` runs, then `dispose()` ran, the instance was not released,
  the controller was uninstalled, and the same exception propagates.
- Given `INCLUDE_CHILDREN` on a node whose algorithm supports `COMPOUND`, when laid out, then children are not laid
  out separately and descendants get `SEPARATE_CHILDREN`-inheritance per `:175-215`.
- Given a node with an inside self loop and `INSIDE_SELF_LOOPS` support, when the parent is laid out, then the loop's
  section is offset by the node position (`postProcessInsideSelfLoops`).
- Given topdown layout with `LAYOUT_NEXT_LEVEL`, when laid out, then children are scaled as the Java computes.

## Observability / Rollback
Progress-monitor tasks and sub-tasks are created in the Java order (the in-memory observability surface).
Reversible: revert the commit.

## Amendment (M17 — user, 2026-10-23)
Write-set becomes `src/core/RecursiveGraphLayoutEngine.ts`, `src/core/RecursiveGraphLayoutEngineTopdown.ts` (+
colocated tests) and one new shared stub helper under `test/helpers/`.
