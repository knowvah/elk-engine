<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `BowyerWatsonTriangulation`, `NaiveMinST`, `RectilinearConvexHull` (exit task)

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T8): port triangulation, spanning tree and convex hull`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). This task carries the roadmap exit: the `NaiveMinST` replay must match the JVM's `HashSet` tie
order (V6–V8, `docs/translation-rules-collections.md` §2.1). Spore (8x) uses all three.
- T2 landed `TEdge`, `TTriangle`, `Point`, `Tree`, `ICostFunction`, `SVGImage`, `Scanline` and the hash strategies.
- T4 landed `test/golden/refs/java/alg-common.json`.

## Task
1. Port `J/BowyerWatsonTriangulation.java`:
   - `triangulation` (`:85`) and `tEdges` (`:155`) are `JavaHashSet`s with T2's strategies (V6/V7, P2), never a JS
     `Set`;
   - keep every `/*d*/` `SVGImage` line verbatim, including those that compute values (`:101-102`) (AC4);
   - keep `invalidTriangles` and the rest of the iteration exactly as written.
2. Port `J/NaiveMinST.java`, both `createSpanningTree` overloads (§6.5):
   - `weight` (`:52`, `TEdge` keys) and `treeNodes` (`:65`, `KVector` keys) are `JavaHashMap`s with value strategies;
   - `edges = Sets.newLinkedHashSet(edgeList)` (`:60`) is an insertion-ordered `Set`;
   - the list copy plus the sort by weight (`:53-59`) must be a **stable** sort, as `Collections.sort` is, so ties keep
     `HashSet` iteration order (V8).
3. Port `J/RectilinearConvexHull.java`, with its nested event handlers in prefixed files if they are classes (M15).
   Keep the `Scanline` usage and the `splitIntoRectangles` order.
4. Port `JT/RectilinearConvexHullTest.java` (its 2 `@Test` methods) to `src/alg/common/RectilinearConvexHullTest.test.ts`.
   Skip the Swing `main` with a comment naming the Java lines.
5. **Replay** (`src/alg/common/TriangulationVectors.test.ts`): for every `alg-common.json` `triangulation` scenario,
   decode the hex vertices.
   - `triangulate`: assert the edge **sequence** (iteration order) equals the recorded one.
   - Build both recorder cost functions exactly as `AlgCommonVectors.java` defines them, run `createSpanningTree`,
     and assert the tree structure **and child order**.
   - On a mismatch, name the mechanism (stop 5/7). Never edit the vector.

## Write-set
- `src/alg/common/{BowyerWatsonTriangulation,NaiveMinST,RectilinearConvexHull}.ts` (+ prefixed nested files)
- `src/alg/common/RectilinearConvexHullTest.test.ts`, `src/alg/common/TriangulationVectors.test.ts`
- colocated unit tests

## Read-set
- The three Java files and `JT/RectilinearConvexHullTest.java`.
- T2's `src/alg/common/*.ts` and `utils/SVGImage.ts`; `src/java/util/{JavaHashSet,JavaHashMap,HashStrategy}.ts`.
- `test/golden/refs/java/alg-common.json` and the header of `tools/vectors/AlgCommonVectors.java`.
- `docs/translation-rules-collections.md` §2.1 (V6–V8).

## Interface contracts (outputs, consumed by T11 and 8x)
- `BowyerWatsonTriangulation.triangulate(vertices: KVector[] | List, debugOutputFile: string | null): JavaHashSet<TEdge>`
  (or the landed `Set`-like type). It must iterate in JVM order.
- `NaiveMinST.createSpanningTree(tEdges, root, costFunction, debugOutputFile?)`: `Tree<KVector>`.
- `RectilinearConvexHull.of(points)`, `getHull()`, `splitIntoRectangles()`.

## Acceptance criteria
- Given both `RectilinearConvexHullTest` cases, when run, then they pass with the Java expectations.
- Given every `triangulation` scenario, when replayed, then the edge iteration order equals the JVM's.
- Given the `constant`-cost scenarios (all ties), when the spanning tree is built, then the structure and child order
  equal the JVM's: **the roadmap exit**.
- Given the `/*d*/` lines, when `debugOutputFile` is `null`, then they run without side effects and the results are
  unchanged.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
