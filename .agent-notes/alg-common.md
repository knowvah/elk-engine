<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — alg-common (mission 6a, 2026-10-24)

Planning-time notes are in `alg-common-planning.md`.

## Observation: vendoring a ticket model touches three files

- **Context**: T5, `475_fixedLayoutWithLongLabels.elkt`.
- **Finding**: `layoutElkt` reads only `test/golden/inputs/`; a vendored model needs the file, a SHA-256 row in
  `test/golden/inputs/manifest.json`, and an entry in `TICKET_INPUTS` (`test/golden/algorithm-refs.test.ts`), which
  pins the exact vendored set.
- **Impact**: later JUnit ports over ticket models (7a, 8x) plan all three into their write-set, and the
  `TICKET_INPUTS` edit is an AD-13 change to raise with the user.
- **Confidence**: High

## Observation: `PolyominoOptions` exists only in the oracle's `src-gen`

- **Context**: T4 recorder, T1 codegen.
- **Finding**: no `PolyominoOptions.java` under `$ELK_SOURCE_DIR`; the generated class is in
  `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.alg.common/src-gen/.../compaction/options/`. Defaults
  `QUADRANTS_LINE_BY_LINE`, `BY_SIZE_AND_SHAPE`, `NUM_OF_EXTERNAL_SIDES_THAN_NUM_OF_EXTENSIONS_LAST`, fill `true`.
- **Impact**: generated `*Options` classes are cross-checked against the oracle `src-gen`, not the source tree.
- **Confidence**: High

## Observation: `TwoBitGrid` words are 64-bit and reads past the width do not throw

- **Context**: T6.
- **Finding**: 32 cells × 2 bits fill a Java `long` (cell 31's weak bit is the sign bit), so words are `bigint`. Reads
  for `x >= width` inside the last allocated word return 0; writes throw. `PlanarGrid`'s center-based getters inherit
  this.
- **Impact**: disco's `TwoBitGridTest` (8a) must treat words as `bigint` and expect the asymmetric bounds.
- **Confidence**: High

## Observation: `PlanarGrid` must not value-import `Polyomino`

- **Context**: T6; Java `PlanarGrid` overloads on `Polyomino`.
- **Finding**: `Polyomino extends PlanarGrid`, so a value import closes an ESM cycle with a TDZ error when
  `PlanarGrid` loads first. The port uses `import type` and a duck-typed guard for overload dispatch.
- **Impact**: keep it that way in T12 and disco; a Java caller that types a `Polyomino` as `PlanarGrid` would select
  the other overload (none exists in `alg.common` or disco).
- **Confidence**: High

## Observation: `PolyominoCompactor` throws on extensions outside the grid

- **Context**: T4 polyomino matrix.
- **Finding**: the extension loop calls `PlanarGrid.weaklyIntersectsArea` (`:370-381`), which is not bounds tolerant,
  so `packPolyominoes` throws `IndexOutOfBoundsException` on 3 of 108 recorded rows (aspect 2.5).
- **Impact**: the T12 replay expects the throw on those rows; disco inputs can hit it too.
- **Confidence**: High

## Observation: `NGraph.makeConnected` and `isAcyclic` renumber `internalId`

- **Context**: T3.
- **Finding**: both overwrite `NNode.internalId` with the position in `nodes`.
- **Impact**: `NetworkSimplex` (T7) and layered callers must not rely on `internalId` across these calls (Java does
  the same).
- **Confidence**: High

## Observation: `RectangleStripOverlapRemover` quirks pinned by the oracle

- **Context**: T4 overlaps `tie-*` rows.
- **Finding**: `computeOverlaps` keeps a `TreeSet` ordered by right border, so a rectangle with an equal right border
  is dropped from the scanline set; `exportRectangle` for `DOWN` adds `startCoordinate` to a `y` the strategy already
  wrote on the same `ElkRectangle`.
- **Impact**: T10 keeps both; the `tie-*` rows pin them.
- **Confidence**: High

## Observation: recursive Java traversals can overflow V8's stack only in the interpreter

- **Context**: batch-2 gate, `NetworkSimplexTest.testDeltas` (T7).
- **Finding**: a 4000-deep recursion (`tightTreeDFS` on a tight path) passed alone but failed under full-suite load:
  interpreted frames (~250–375 B) exceed the default ~984 KB stack, optimized frames fit, and tier-up timing varies.
  `--jitless` (scratch vitest config, `pool: 'forks'`, `execArgv`) reproduces it deterministically; `NODE_OPTIONS`
  rejects `--no-opt`, and vitest 5 has no `--poolOptions` CLI flag.
- **Impact**: user decision: such recursions become explicit-stack loops proven against a verbatim recursive reference.
  Check every unbounded-depth recursive port (spore `DepthFirstCompaction`, layered DFS passes) with `--jitless`.
- **Confidence**: High

## Observation: `src/java/util` has no live `TreeSet`

- **Context**: T9, T10, T11.
- **Finding**: `Sets.newTreeSet` is an insertion-ordered snapshot; three tasks wrote private sorted-array stand-ins
  (`ScanlineConstraintCalculatorTreeSet.ts` with `floor`/`ceiling`/`lower`/`higher`, and file-private sets in
  `RectangleStripOverlapRemover.ts` and `ScanlineOverlapCheckHandler.ts`), each keeping `TreeSet.add`'s
  comparator-equal rejection.
- **Impact**: promote one to `src/java/util/TreeSet.ts` before layered (`CrossingsCounter`, `NodeContext`).
- **Confidence**: High

## Observation: no dev-assert helper exists despite translation-rules §6.8

- **Context**: T10 `default: assert false` branches.
- **Finding**: §6.8 names a `devAssert` helper that was never written; `KVector.ts` and
  `ElkSpacingsElkCoreSpacingsBuilder.ts` omit assertions with a comment, and T10 followed that.
- **Impact**: every later `assert` site faces the same choice until the helper exists.
- **Confidence**: High

## Observation: `QuadraticConstraintCalculation` drops predefined constraints; the scanline overlap message is dead

- **Context**: T9.
- **Finding**: the quadratic algorithm clears every node's constraints first (`QuadraticConstraintCalculation.java:30-32`),
  so only `SCANLINE_CONSTRAINTS` keeps predefined ones; `ScanlineConstraintCalculator.insert`'s overlap `System.err`
  never fires (`floor`/`ceiling` right after `add` return the node itself).
- **Impact**: layered horizontal compaction relying on predefined constraints must use the scanline algorithm; expect
  no stderr from overlapping hitboxes.
- **Confidence**: High

## Observation: `ElkMath.distance` needs a vector at least as long as the gap

- **Context**: T11 `Node.distance` unit tests.
- **Finding**: rays are traced with length `|v|`, so a unit vector across a 20-unit gap returns Infinity.
- **Impact**: spore callers (8x) pass a vector scaled to the underlap, as `DepthFirstCompaction` does.
- **Confidence**: High

## Observation: the architecture page includes `overview.md` and `component-map.md` by line range

- **Context**: T13 edited both files.
- **Finding**: `docs-site/guide/architecture.md:7-25` includes `docs/architecture/overview.md{3,23}`, `{42,49}`, `{64,}` and
  `component-map.md{3,20}`, `{71,91}`, `{116,}` by line number. The ranges no longer match the files (for example
  `overview.md{42,49}` now falls inside a PlantUML block), so earlier missions' additions already shifted them.
- **Impact**: T13 edited both files in place (same line counts, no new rows) and did not touch the site file (outside
  its write-set). The ranges need a dedicated fix, ideally by section anchors instead of numbers.
- **Confidence**: Medium (read from the include directives; the rendered page was not inspected)

## Observation: scratch-worktree runs skip the pinned-clone corpus checks even with absolute dirs

- **Context**: stop-12 verification of the regrouped commits.
- **Finding**: `census.test.ts:25` and `corpus.test.ts:41` call `resolveModelsDir({})`, so they ignore
  `ELK_MODELS_DIR` and resolve `../../eclipse-elk/elk-models` from the worktree; `json-sweep.test.ts` needs the
  untracked `test/corpus/.json-sweep`. A worktree under the scratchpad therefore shows 7 extra skips (and one
  skip-only test name) whatever the env says; this refines the 5b note that absolute dirs suffice.
- **Impact**: compare skip counts against the same-tree in-repo run, or put the worktree at the repo's sibling depth.
- **Confidence**: High
