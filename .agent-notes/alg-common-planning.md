<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — alg-common (mission 6a, 2026-10-24)

## Observation: half of `alg.common.test` cannot run before layered

- **Context**: mapping the 8 test files' dependencies (`test/org.eclipse.elk.alg.common.test/META-INF/MANIFEST.MF`
  requires force, layered, mrtree, radial, rectpacking and alg.test).
- **Finding**: `InsidePortLabelTest`, `NextToPortLabelPlacementTest`, `PortLabelPlacementVariantsTest` run
  `LayoutTestRunner` with `LayeredOptions.ALGORITHM_ID`; `NodeMicroLayoutTest` with layered, force, stress, mrtree,
  radial, rectpacking. `Issue475Test` runs only fixed; `RectilinearConvexHullTest`, `NetworkSimplexTest`,
  `OneDimensionalCompactorTest` are pure.
- **Impact**: 6a ports the 4 portable files; the other 4 are roadmap follow-ups (7a / 8x); nodespacing evidence in 6b is
  an oracle `NodeMicroLayout` sweep (AC2).
- **Confidence**: High

## Observation: the `.melk` generator's default bundles are pinned by a landed test

- **Context**: planning `PolyominoOptions` codegen.
- **Finding**: `tools/melk/config.ts` `PENDING_TYPES` is already empty; emission is selected by
  `DEFAULT_BUNDLES = ['Core', 'Labels']` (`tools/melk/generate.ts:11`), and `test/melk/emit.test.ts:110-119` asserts
  both the default and the exact emitted file list.
- **Impact**: T1 generates `Polyomino` by name (`npm run melk:generate Polyomino`) and adds its own freshness test;
  changing `DEFAULT_BUNDLES` would change a landed assertion (AD-13 stop).
- **Confidence**: High

## Observation: package edges inside `alg.common`

- **Context**: cutting 6a from 6b and batching tasks.
- **Finding**: only `NodeMicroLayout` in the root package imports `nodespacing`; `nodespacing` imports `overlaps`;
  `TTriangle` imports `spore.InternalProperties` (`FUZZINESS`, `TTriangle.java:98`); `UniqueTriple` is used only by
  polyomino; `spore.Node` imports `TEdge` and `utils.Utils`, `utils.Utils` imports `TEdge`; the 13 `compaction/oned`
  files reference each other in a cycle through `OneDimensionalCompactor`; `polyomino.ProfileFill` and
  `structures.Polyominoes` are mutually dependent.
- **Impact**: 6a is closed without nodespacing; oned is one task; `ProfileFill` ships with the structures.
- **Confidence**: High

## Observation: debug SVG output sits inside algorithm code

- **Context**: browser-safe `src/`.
- **Finding**: `/*d*/` lines in `BowyerWatsonTriangulation`, `NaiveMinST`, `spore/ScanlineOverlapCheck`,
  `spore/DepthFirstCompaction` call `SVGImage` (disabled when the file name is null or starts with `null`); some compute
  values (`triangle.getCircumcenter()`, `c.distance(...)`). `compaction/DebugUtil` has no caller in `alg.common`.
- **Impact**: AC4 keeps every call; only file writes become no-ops.
- **Confidence**: High

## Observation: hash sites in 6a

- **Context**: AD-10 review.
- **Finding**: value-hashed: `BowyerWatsonTriangulation.java:85` (`TTriangle`), `:155` (`TEdge`), `NaiveMinST.java:52`
  (`TEdge` keys), `:65` (`KVector` keys); identity-hashed: `NGraph.java:56`, `GreedyRectangleStripOverlapRemover.java:33`,
  `CGroup.java:66`, `OneDimensionalCompactor.java:500`; linked (insertion order already): `NaiveMinST.java:60`,
  `NetworkSimplex.java:241`, `CGroup.java:65`, `SVGImage.java:41`.
- **Impact**: value-hashed sites use `JavaHashMap`/`JavaHashSet` with ported strategies (P2); identity sites journaled.
- **Confidence**: High
