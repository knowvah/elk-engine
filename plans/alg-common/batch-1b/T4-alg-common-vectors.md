<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Oracle recorder `AlgCommonVectors` (AC3, P6)

**Agent:** java-architect (sonnet) · **Commit:** `test(T4): record alg.common oracle vectors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`.

## Context
Mission 6a (README). Polyomino packing, strip overlap removal, the spore helpers and Bowyer–Watson + `NaiveMinST` have
no Java tests. The source-built oracle is their behavioural spec (AC3). T8, T10, T11 and T12 replay this file in TS.
- **Pattern:** `tools/vectors/comment-vectors.sh` + `CommentVectors.java` (oracle classpath, third-party bundle list,
  `vector-cache.sh`, one `cache:` line). Read both first, and `.agent-notes/vector-cache-and-key-line.md`.
- **Never edit `tools/vectors/vector-cache.sh`** or `JavaVectors.java`, and never touch a landed file in
  `test/golden/refs/java/`.
- Adding files under `tools/vectors/` makes the next `elkt`/`elkj`/`elkr` runs cold once (by design); do not run those.

## Task
1. **`tools/vectors/AlgCommonVectors.java`:**
   - JDK 21 source launcher on the oracle classpath (the `alg.common`, `core` and `graph` jars plus third-party
     bundles);
   - SPDX header, plus a header comment documenting every section, its input fields and its output fields;
   - doubles as 16-hex raw bits (`JavaVectors.hex` convention);
   - **all inputs written into the JSON**, so the TS replay never needs Java `Random`. Generate them from a fixed seed.
2. **Sections** (call public APIs only, exactly as a caller would):
   - **`triangulation`:**
     - `BowyerWatsonTriangulation.triangulate(vertices, null)`: record the edges in the returned `Set`'s iteration
       order (V7);
     - `NaiveMinST.createSpanningTree(edges, root, cost)` with **two recorder-defined cost functions**: `euclidean`
       (`e.u.distance(e.v)`) and `constant` (always `1.0`, which maximises ties so the V8 tie order is observable).
       Record the tree as nested `[vertex, children…]` in child order;
     - include grid-aligned vertex sets (many equal edge lengths), random sets and degenerate ones (collinear points,
       duplicates, if Java accepts them);
     - run the 4-argument overload with a `null` debug file too.
   - **`polyomino`:**
     - build `Polyomino`s the way disco does (read `alg.disco`'s polyomino construction for the API only; disco
       stays unported);
     - call `new PolyominoCompactor().packPolyominoes(new Polyominoes<>(polys, aspectRatio, fill))` with each
       `TraversalStrategy` × `LowLevelSortingCriterion` × `HighLevelSortingCriterion` on a few seeded inputs, both `fill`
       values and two aspect ratios;
     - record each polyomino's final offset or position as the API exposes it. Configure options the way the Java code
       reads them (`PolyominoOptions` property ids on the `Polyominoes` holder or as parameters).
   - **`overlaps`:** `RectangleStripOverlapRemover.createForDirection(d).withGap(h, v).withStartCoordinate(s)`, with
     rectangles added and the default and greedy strategies. Run it and record each rectangle's final `x`/`y` in input
     order.
   - **`spore`:**
     - `new ScanlineOverlapCheck(handler, new SVGImage(null)).sweep(nodes)` with a recording `IOverlapHandler`: record
       the overlapping pairs in call order;
     - `DepthFirstCompaction.compact(tree, orthogonal)` and the other overload, on spore `Node` trees built from seeded
       rectangles: record node positions.
3. **Ties:** design out every tie except the intended `NaiveMinST` and edge-order ones. Run each scenario twice in one
   recording on fresh objects and fail on any difference (stop 8).
4. **`tools/vectors/alg-common-vectors.sh`:** the `comment-vectors.sh` structure with cache namespace `alg-common`,
   writing `test/golden/refs/java/alg-common.json`. Pass `shellcheck -x`.
5. Run the script twice. The output must be byte-identical, and the second run served from the cache.

## Write-set
`tools/vectors/{AlgCommonVectors.java,alg-common-vectors.sh}`, `test/golden/refs/java/alg-common.json`.

## Read-set
- `J/{BowyerWatsonTriangulation,NaiveMinST,TEdge,TTriangle,Tree,ICostFunction}.java`, `J/polyomino/**`,
  `J/compaction/options/*`, `J/overlaps/*`, `J/spore/*`.
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.disco/src/**` (API usage only).
- `tools/vectors/{comment-vectors.sh,CommentVectors.java,vector-cache.sh}` (read only).
- `decisions.md#ac3--6a-oracle-vectors`.

## Interface contracts (outputs, consumed by T8, T10, T11, T12)
```json
{ "jdk": "...", "oracle": "<commit>",
  "triangulation": [ { "name", "vertices": [[hex,hex]...], "edges": [[i,j]...], "trees": { "euclidean": [...], "constant": [...] }, "root": i } ],
  "polyomino":     [ { "name", "input": {...}, "options": {...}, "result": {...} } ],
  "overlaps":      [ { "name", "direction", "gap": [hex,hex], "start": hex, "strategy", "rects": [[hex x4]...], "result": [[hex,hex]...] } ],
  "spore":         [ { "name", "kind": "scanline"|"dfc", "input": {...}, "result": {...} } ] }
```
Field names inside `input`, `options` and `result` are free; document them in the recorder header. Vertices are
referenced by index.

## Acceptance criteria
- Given two consecutive runs, when the outputs are compared, then `alg-common.json` is byte-identical, and the second
  run prints a cache hit.
- Given each scenario run twice inside one recording, when compared, then the results are identical.
- Given the `triangulation` section, when inspected, then at least one scenario has equal-weight `constant`-cost edges
  where the recorded tree depends on edge iteration order.
- Given the `polyomino` section, when inspected, then every `TraversalStrategy`, `LowLevelSortingCriterion` and
  `HighLevelSortingCriterion` value appears.
- Given the recording, when `git status` runs, then no landed file under `test/golden/refs/` changed.

## Observability / Rollback
N/A — test tooling only. Reversible: revert the commit.
