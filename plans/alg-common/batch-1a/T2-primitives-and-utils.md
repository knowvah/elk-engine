<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Geometry primitives, utils, `Scanline`, spore `InternalProperties`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T2): port alg.common geometry primitives and utils`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). These leaves are used by T8 (Bowyer–Watson, `NaiveMinST`, hull), T9 (`compaction/oned` uses
`Scanline`) and T11 (spore).
- `TTriangle` reads `spore.InternalProperties.FUZZINESS` (`J/TTriangle.java:98`), so `InternalProperties` lands here.
- `utils.Utils` imports `TEdge`.

## Task
1. Port the following, one class per file, with `@see` headers:
   - `J/TEdge.java`, `J/TTriangle.java`, `J/Point.java` (and its nested types, in prefixed files if any), `J/Tree.java`,
     `J/ICostFunction.java`;
   - `J/utils/Utils.java`, `J/utils/SVGImage.java`;
   - `J/compaction/Scanline.java`;
   - `J/spore/InternalProperties.java`.
2. **Hashing (P2, V6/V7):**
   - port `equals` and `hashCode` of `TEdge` (`:44-58`), `TTriangle` (`:106-120`) and `Point` (`:80-95`) exactly, with
     `Int32` arithmetic and the landed `KVector.hashCode()`;
   - export a `HashStrategy` for each class that `JavaHashSet`/`JavaHashMap` can use; see
     `src/java/util/HashStrategy.ts` and the `MapPropertyHolder` `PROPERTY` precedent.
3. **`SVGImage` (AC4):**
   - port every member verbatim: `groups` (`Maps.newLinkedHashMap` → `Map`), `g`, `addGroups`, `clearGroup`,
     `removeGroup`, `setViewBox`, `clear`, the `add*` overloads (§6.5), `save`, `isave`;
   - the constructor's enable rule (`:57-60`) is kept;
   - `save`/`isave` build the document exactly as Java does up to the `FileWriter`/`PrintWriter`, then write nothing,
     with a comment naming `:252-301`;
   - no Node built-in in `src/`.
4. **`Scanline`:** keep the event comparator and queue order. `java.util.PriorityQueue` order matters only through the
   comparator. Check which collection Java uses and mirror it; journal it.
5. Write unit tests derived from the Java:
   - hash values for hand-built edges and triangles, computed from the Java formulas;
   - `equals` symmetry, including `TEdge(u,v)` vs `TEdge(v,u)` as Java defines it;
   - `TTriangle` circumcenter and `inCircumcircle` on known triangles;
   - `SVGImage` bookkeeping with the file write disabled and enabled (no side effect either way);
   - `Scanline` event order with ties.

## Write-set
- `src/alg/common/{TEdge,TTriangle,Point,Tree,ICostFunction}.ts` (+ prefixed nested files)
- `src/alg/common/utils/{Utils,SVGImage}.ts`, `src/alg/common/compaction/Scanline.ts`,
  `src/alg/common/spore/InternalProperties.ts`
- colocated tests

## Read-set
- The nine Java files.
- `src/core/math/{KVector,ElkRectangle}.ts`, `src/java/util/{HashStrategy,JavaHashSet,JavaHashMap}.ts`,
  `src/graph/properties/{Property,MapPropertyHolder}.ts`.
- `docs/translation-rules-collections.md` §2.1 (V6–V8).
- `decisions.md#ac4--debug-output`, `#pre-made`.

## Interface contracts (outputs, consumed by T8, T9, T11)
- `TEdge` (public `u`, `v`), `TTriangle` (`a`, `b`, `c`, `getCircumcenter()`, `inCircumcircle(v)`, `contains*` as in
  Java), `Point`, `Tree<T>` (`node`, `children`), `ICostFunction` (`cost(e: TEdge): number`).
- Exported hash strategies: `TEDGE_STRATEGY`, `TTRIANGLE_STRATEGY` (names may follow the landed convention; journal
  them).
- `SVGImage` with the Java API; `Scanline` with its Java API; `InternalProperties` constants.

## Acceptance criteria
- Given two `TEdge`s with the same endpoints, when compared and hashed, then `equals` and `hashCode` follow
  `TEdge.java:44-58`.
- Given a `JavaHashSet` of `TTriangle`s built with the exported strategy, when iterated, then the order is the one
  `JavaHashSet` gives for the Java `hashCode` values (checked against hand-computed hashes).
- Given `new SVGImage(null)` and `new SVGImage("x")`, when shapes are added and `save()` runs, then no file system
  access happens and the bookkeeping follows the Java.
- Given `Scanline` events with equal keys, when processed, then the order follows the Java comparator.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
