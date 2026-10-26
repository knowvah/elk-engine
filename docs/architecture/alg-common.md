<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.common, part a (mission 6a)

What mission 6a (`alg-common`, roadmap row 6, first half) ported, the evidence for each package, how the HashSet order
of `NaiveMinST` is reproduced, and a runbook for the three failure modes the plan expected. Decisions cited are
`plans/alg-common/decisions.md` (AC1-AC6, P1-P7); task ids (T1-T13) are in `plans/alg-common/decision-journal.md`.
AD-n are `plans/elk-engine-skeleton/decisions.md`. Nothing here is exported from `src/index.ts` (AD-14), and no
algorithm provider is ported. Counts of oracle scenarios live in [conformance.md](../conformance.md#alg-common).

| Section                                   | Answers                                                        |
| ----------------------------------------- | -------------------------------------------------------------- |
| [1. Package map](#package-map)            | What 6a ported, where it lives, and what 6b adds               |
| [2. Evidence](#evidence)                  | JUnit ports and `alg-common.json` sections per package         |
| [3. Hash order (V6-V8)](#hash-order)      | How `BowyerWatsonTriangulation` and `NaiveMinST` match the JVM |
| [4. PolyominoOptions](#polyomino-options) | How the options class is generated                             |
| [5. Design notes](#design-notes)          | Facades, stand-ins, explicit stacks, AC4                       |
| [6. Runbook](#runbook)                    | Re-recording, regenerating, and the three failure modes        |

## 1. Package map {#package-map}

Java packages are under `org.eclipse.elk.alg.common`; TS paths are under `src/alg/common/` (P1). Nested classes and
enums live in prefixed files (M15). Class counts exclude `*.test.ts`.

| Java package           | TS directory           | Ported in 6a (task)                                                                                                                           |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| (root)                 | `.`                    | `TEdge`, `TTriangle`, `Point`, `Tree`, `ICostFunction` (T2); `BowyerWatsonTriangulation`, `NaiveMinST`, `RectilinearConvexHull` (T8)          |
| `utils`                | `utils`                | `SVGImage`, `UniqueTriple`, `Utils` (T2, T6)                                                                                                  |
| `compaction`           | `compaction`           | `Scanline`, `DebugUtil` (T2, T9)                                                                                                              |
| `compaction.options`   | `compaction/options`   | the three enums (T1) and the generated `PolyominoOptions` (T1)                                                                                |
| `compaction.oned`      | `compaction/oned`      | `OneDimensionalCompactor` facade plus section modules, `CGraph`, `CGroup`, `CNode`, both constraint calculators, `LongestPathCompaction` (T9) |
| `networksimplex`       | `networksimplex`       | `NGraph`, `NNode`, `NEdge` (T3); `NetworkSimplex` facade plus `Subtrees`, `Tree`, `CutValues`, `Pivot`, `Normalize` sections (T7)             |
| `overlaps`             | `overlaps`             | `RectangleStripOverlapRemover`, `GreedyRectangleStripOverlapRemover` (T10)                                                                    |
| `spore`                | `spore`                | `InternalProperties` (T2), `Node`, `ScanlineOverlapCheck`, `DepthFirstCompaction` (T11)                                                       |
| `polyomino.structures` | `polyomino/structures` | `TwoBitGrid`, `PlanarGrid`, `Polyomino`, `Polyominoes`, `Direction`, `IThreeValueGrid` (T6)                                                   |
| `polyomino`            | `polyomino`            | `PolyominoCompactor`, the six comparators, the successors, `ProfileFill` (T6, T12)                                                            |
| `issues` (test)        | `issues`               | `Issue475Test` (T5)                                                                                                                           |

**Mission 6b adds** (AC1): `nodespacing/**` (`cellsystem`, `internal`, `internal/algorithm`, 26 classes) and
`NodeMicroLayout`, the only root class that imports `nodespacing`. The evidence plan for it is the AC2 oracle
`NodeMicroLayout` sweep, because `NodeMicroLayoutTest` needs five other algorithms.

## 2. Evidence {#evidence}

| Package                   | JUnit ports (green)                                                      | `alg-common.json` section (rows, all replay)                        |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| root geometry             | `RectilinearConvexHullTest` (T8)                                         | `triangulation` (22), via `TriangulationVectors.test.ts`            |
| `networksimplex`          | `NetworkSimplexTest` (T7)                                                | none: the JUnit is the evidence                                     |
| `compaction.oned`         | `OneDimensionalCompactorTest`, 17 of 17 (T9)                             | none: the JUnit is the evidence                                     |
| `overlaps`                | none                                                                     | `overlaps` (34), via `OverlapsVectors.test.ts`                      |
| `spore`                   | none                                                                     | `spore` (18: 8 scanline, 10 depth-first compaction), `SporeVectors` |
| `polyomino`, `structures` | none                                                                     | `polyomino` (108, 3 expect `IndexOutOfBoundsException`)             |
| `issues`                  | `Issue475Test` (T5)                                                      | none                                                                |
| generated options         | freshness and `.melk` cross-check, `test/melk/polyomino-options.test.ts` | none                                                                |

The recorder is `tools/vectors/AlgCommonVectors.java` (T4, P6): fixed seeds 7001, 7101, 7201, 7301 and 7401, every
scenario run twice inside the recording and identical, two full recordings byte-identical. Replay compares edge order,
costs, tree shapes and numbers within the AD-4 bar; rows that the JVM answers with an exception must throw.

## 3. Hash order (V6-V8) {#hash-order}

`NaiveMinST` copies a `HashSet<TEdge>` to a list and sorts it by weight, so the tie order of equal weights is the
HashSet iteration order (AD-10, [collections 2.1](../translation-rules-collections.md#21-iterated-value-hashed-containers-port-with-javahashmap)).
The sites and their ports:

| Site                                 | Java container                      | TS                                                      |
| ------------------------------------ | ----------------------------------- | ------------------------------------------------------- |
| `BowyerWatsonTriangulation.java:85`  | `HashSet<TTriangle>` (V6)           | `JavaHashSet` with `TTRIANGLE_STRATEGY`                 |
| `BowyerWatsonTriangulation.java:155` | `HashSet<TEdge>` (V7)               | `JavaHashSet` with `TEDGE_STRATEGY`                     |
| `NaiveMinST.java:52`                 | `HashSet<TEdge>`, copied and sorted | `JavaHashSet` with `TEDGE_STRATEGY`, then a stable sort |
| `NaiveMinST.java:65`                 | `HashMap<KVector, …>`               | `JavaHashMap` with a `KVector` strategy                 |
| `NaiveMinST.java:60`                 | `LinkedHashSet`                     | `Set` (insertion order already)                         |

The strategies (`TEDGE_STRATEGY`, `TTRIANGLE_STRATEGY`, `POINT_STRATEGY`, T2) port `hashCode` and `equals` verbatim
with `Int32` arithmetic, and their expected hashes were computed by an independent script from the Java formulas.
V8 is now implemented and proven: the 22 `triangulation` rows pin the triangulation edge iteration order and both cost
trees, including the `constant` cost function, which gives every edge the same weight so the tree is decided entirely by
tie order (it is order-sensitive in 18 of the 22 rows). The sort is `Array.prototype.sort` with the `Double.compare`
shim, which is stable like `Collections.sort`, so ties keep HashSet order.

## 4. PolyominoOptions {#polyomino-options}

`PolyominoOptions` has no Java source in the tree: Xtext generates it from `Polyomino.melk`, and the only copy is in the
oracle's `src-gen`. T1 ported the three enums under `compaction/options/` by hand and generated the class with
`npm run melk:generate Polyomino`, which places it at `src/alg/common/compaction/options/PolyominoOptions.ts`.
`DEFAULT_BUNDLES` in `tools/melk/generate.ts` stays `['Core', 'Labels']` because `test/melk/emit.test.ts:110-119` pins
it (stop 6). Regenerating `Core`, `Labels` and `Polyomino` together left every landed file byte-identical.
Defaults are `QUADRANTS_LINE_BY_LINE`, `BY_SIZE_AND_SHAPE`, `NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST` and
fill `true`. Each property is a `static readonly` after its private default; no default reads another options class, so
no cached getter was needed, and nothing registers the class until disco (8a). `test/melk/polyomino-options.test.ts`
holds the freshness test, a regex cross-check of id, default and target against the `.melk` source (independent of the
generator), and an import-first test for the TDZ failure below.

## 5. Design notes {#design-notes}

- **Facades (P1).** `NetworkSimplex` and `OneDimensionalCompactor` exceed 500 lines in Java and are split into a
  facade plus section modules that never import the facade. Helper splits follow Java section boundaries.
- **Explicit stacks (AC6).** `NetworkSimplex.tightTreeDFS` and `postorderTraversal` recurse as deep as the input
  (4,000 levels in `NetworkSimplexTest`). Interpreted V8 frames overflow the default stack, and the failure is
  deterministic under `--jitless`. They are explicit-stack loops that reproduce the Java visit, mutation and
  accumulation order, proven by `NetworkSimplexTree.test.ts` against a verbatim recursive reference on 16 seeded graphs
  and a 50,000-node path. `DepthFirstCompaction` still recurses per spanning-tree level; check it with `--jitless`
  before 8x feeds it a large graph.
- **`TreeSet` stand-ins.** `src/java/util` has no live `TreeSet`, so three task-local sorted-array sets exist
  (`ScanlineConstraintCalculatorTreeSet.ts`, a file-private set in `RectangleStripOverlapRemover.ts`, and
  `SortedNodeSet` in `ScanlineOverlapCheckHandler.ts`). Each keeps `TreeSet.add`'s rejection of a comparator-equal
  element. One is to be promoted to `src/java/util/TreeSet.ts` before layered.
- **No debug files (AC4).** `SVGImage.save`/`isave`, `DebugUtil` and `NGraph.writeDebugGraph` keep their logic up to the
  file write and write nothing, because `src/` is browser-safe. Every `/*d*/` call stays, since some compute values.
- **Overloads.** `Scanline.execute`, `TTriangle.contains`, and the `PlanarGrid` Polyomino overloads dispatch at run
  time (translation rules 6.5). `PlanarGrid` uses `import type` for `Polyomino` and a duck-typed guard to avoid an ESM
  cycle (`Polyomino extends PlanarGrid`).
- **Bits.** `TwoBitGrid` words are Java `long`: 32 cells of 2 bits fill 64 bits, so cell 31's weak bit is the sign bit.
  Words are `bigint` through `Int64`, and indices through `Int32`.

## 6. Runbook {#runbook}

Run from the repository root. `$ELK_SOURCE_DIR`, `$ELK_ORACLE_DIR` and `$ELK_MODELS_DIR` default to the repo-relative
paths of AD-15; the oracle must be built (`tools/oracle/build.sh`). Never edit `tools/vectors/vector-cache.sh` or
`tools/vectors/JavaVectors.java`, and never regenerate a landed ref to get a test green (AD-13).

### 6.1 Re-record the vectors

```bash
tools/vectors/alg-common-vectors.sh test/golden/refs/java
git status --short test/golden/refs/java    # must show nothing for a same-JDK re-record
ELK_VECTORS_CACHE=off tools/vectors/alg-common-vectors.sh test/golden/refs/java   # cold, touches no cache
```

The recorder prints one `cache:` line. It must be byte-stable across two runs (stop 8). A diff after a same-JDK
re-record means the oracle jars, the classpath or `AlgCommonVectors.java` changed: journal the cause. Adding a file
under `tools/vectors/` changes the inputs digest, so the next recorder runs are cold once.

### 6.2 Regenerate PolyominoOptions

```bash
npm run melk:generate Polyomino
git status --short src test    # must show nothing unless the generator or `Polyomino.melk` changed
npx vitest run test/melk
```

Never change `DEFAULT_BUNDLES` to include `Polyomino`. If generating changes any file other than
`PolyominoOptions.ts`, or the output needs a hand edit, stop and journal it (stop 6). The Java class to compare with is
`$ELK_ORACLE_DIR/plugins/org.eclipse.elk.alg.common/src-gen/.../compaction/options/PolyominoOptions.java`.

### 6.3 Failure modes

| Failure                        | Detection                                                                                                                                                                                                        | Fix                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HashSet tie order              | `TriangulationVectors.test.ts` shows a different edge order or a different `constant`-cost tree while ids and counts match                                                                                       | Compare the `TEDGE_STRATEGY`/`TTRIANGLE_STRATEGY`/`POINT_STRATEGY` hash with the Java formula first (`TEdge.java:56`, `TTriangle.java:119`, `KVector.java:155`). Then follow [collections 2.5](../translation-rules-collections.md#25-runbook-javahashmap-order-mismatch-in-a-ported-site): a new vector from a separate generator, never an edit of `JavaVectors.java`. A mismatch traced to `JavaHashSet` itself is stop 7 |
| `PolyominoOptions` TDZ         | a `ReferenceError` (TDZ) when `PolyominoOptions` and `CoreOptions` load in the wrong order; the `loads without a TDZ error when imported before CoreOptions` case in `test/melk/polyomino-options.test.ts` fails | Today no default reads another options class, so plain `static readonly` fields are safe. If one does, the constant must be a cached static getter (M12). Do not hand edit the file: fix the generator and regenerate (6.2)                                                                                                                                                                                                  |
| `Int32` bit maths in the grids | `TwoBitGrid.test.ts` or `PlanarGrid.test.ts` fails at cell 31 of a word, or `PolyominoVectors.test.ts` rows differ in profile or intersection results; a word loses its top bit or reads as a negative `number`  | Words are `bigint` through `Int64.shl/ushr`, never `number` shifts (those wrap at 32 bits). Indices go through `Int32.shr/and`. Reads past the width inside the last word return 0 and writes throw, as Java; do not "fix" the asymmetry                                                                                                                                                                                     |

A fourth source of surprise is stack depth: if a ported recursion fails with `RangeError` only under suite load, run
the test under `--jitless` (a scratch vitest config with `pool: 'forks'` and `execArgv`), then convert it per AC6.
