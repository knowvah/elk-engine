<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — alg-packing, mission 8c (issue #39; auto-confirmed at planning, 2026-11-13)

Planned unattended (`/plan-mission --unattended`): every row below is the planner's recommendation, recorded under
[Auto-confirmed (unattended)](#auto-confirmed-unattended) with the rejected options and the evidence, for the maintainer to audit.
They amend, and never rewrite, AD-1…AD-16 and the earlier missions' rows. Cite rows with their mission (`alg-packing PK3`).

Paths: `R` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.rectpacking/src/org/eclipse/elk/alg/rectpacking`, `S` = the same for
`alg.spore`, `P` = for `alg.topdownpacking`; `RT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking`,
`ST` = `test/org.eclipse.elk.alg.spore.test/src/org/eclipse/elk/alg/spore/test`, `PT` = `test/org.eclipse.elk.alg.topdown.test/src/org/eclipse/elk/alg/topdown`.

| ID | Decision |
|----|----------|
| PK1 | **Evidence: three JVM recorders**, `rectpacking.json`, `spore-layout.json`, `topdownpacking.json`; rows embed the input as ELK JSON (NS1); groups `full`, `stops`, `throws`, plus `sort` (PK7), `minst` (PK5), `jitter` (PK4); `-XX:hashCode=2` |
| PK2 | **Goldens: a new `packing` set** (`regen-goldens.sh --set packing`), designed inputs naming `elk.algorithm`, one golden per option value, NaiveMinST tie-order goldens for both spore algorithms |
| PK3 | **`GridElkNode` is a delegating class** `implements ElkNode, Grid<ElkNode>` over the TS `ElkNode` interface; the type-guard registry admits more than one class per interface so `isElkNode(grid)` is true, as Java's `instanceof` is |
| PK4 | **`Math.random()` jitter** (`S/ElkGraphImporter.java:167-169`) is ported verbatim; recorded rows and goldens avoid coincident centres; `jitter` rows assert invariants only; nondeterministic sweep cases are counted, not compared |
| PK5 | **Value-hashed spore containers** use the landed `JavaHashSet`/`JavaHashMap` with the `TEdge`/`KVector` strategies, replaying the insertion history (`clear` keeps capacity; `addAll` into the scanline set); `minst` rows prove the end-to-end `NaiveMinST` tie order |
| PK6 | **Recursion:** verbatim; AC6 probe of `DepthFirstCompaction`, `GrowTreePhase.growAt`, `MinSTPhase.addNode` on a 2,000-node chain under `--jitless`; convert only a site that overflows in TS where the oracle completes |
| PK7 | **`InteractiveNodeReorderer`'s contract-violating comparator** is kept verbatim; JVM `sort` vectors decide whether `Array.prototype.sort` reproduces `Collections.sort`; any row it does not is `needs-ruling`, never a sort written from memory |
| PK8 | **Staging and registration:** staged providers and staged strategy enums (`// @staged 8c`) until wired, `MARKER` widened by one token; tests register providers explicitly; `PENDING_TYPES` stays `[]` |
| PK9 | **Sweep and hand-offs:** oracle `sweep.sh --filter` over the four algorithm ids; TS through `ts-layout-compare.ts`, which gains the registrations; re-run the 8a/8b residual cases and remove the `SUFFIX_DIFFERENCES` row (8b hand-off) |
| PK10 | **JUnit:** all eight suites (30 runs) ported whole; baseline in [java-baseline.md](java-baseline.md) |
| PK11 | **Scope edges:** cross-bundle suites (`NodeMicroLayoutTest`, `PlainJavaInitializationTest`, `ElkReflectTest`) stay 8x; issues #58, #68, #71 stay with the maintainer (evidence comments only) |
| PK12 | **Commit:** squash to one commit on the base sha, tag `alg-packing/pre-squash`, footer `Refs: #39` |

## PK1 — Recorders and row contract

Single-file launchers copied from `tools/vectors/DiscoVectors.java` + `disco-vectors.sh` (classpath, `-XX:hashCode=2`, `ORIGIN:`
header), row `{ id, group, input, expected }`, `input` exported by `ElkGraphJson.forGraph(root)` and re-imported before the run
(round-trip self-check), doubles as 16-hex raw bits (NS6), `throws`: `expected.throws = { class, message, frame }` by root cause.

| Recorder | Ref | Stops after |
|----------|-----|-------------|
| `RectPackingVectors.java`, `rectpacking-vectors.sh` | `rectpacking.json` | each intermediate processor (`MinSizePreProcessor`, `NodeSizeReorderer`, `InteractiveNodeReorderer` with `CURRENT_POSITION`), p1 (chosen `DrawingData`, target width), p2 (rows → stacks → blocks → rects with bounds), p3, `MinSizePostProcessor`, provider end (node bounds, graph size, padding) |
| `SporeLayoutVectors.java`, `spore-layout-vectors.sh` | `spore-layout.json` | import (vertices, rectangles, root), triangulation edge sequence (both the plain path and the `addAll` into the scanline set), spanning tree with child order (MIN and MAX), `growAt` / `DepthFirstCompaction` results, each overlap iteration (`overlapEdges` sequence, node positions), provider end |
| `TopdownPackingVectors.java`, `topdownpacking-vectors.sh` | `topdownpacking.json` | P1 (grid: rows, cols, **row list sizes**, cell ids; `GridElkNode.put` inserts, PK3), P2 (node bounds), provider end; `getPredictedGraphSize` rows |

- Reflection reaches private state (test code). Stop rows record list orders as the Java iterates them.
- **Scenarios** (seeded `java.util.Random`, seed ≠ 0): **rectpacking:** 1-60 nodes, mixed sizes, labels and ports (NS4 sizes;
  `NodeMicroLayout`, `MinSizePreProcessor`), every `widthApproximation.strategy`, `optimizationGoal`, `packing.strategy`,
  `whiteSpaceElimination.strategy`, `trybox`, `orderBySize`, `rowCompaction`, `compaction.iterations`, `targetWidth`, `lastPlaceShift`,
  `aspectRatio`, `padding`, `nodeNode` spacing, hierarchical children (`Compactor.copyPosition`), `interactive` with
  `desiredPosition` (ties included), the 3 native corpus models (`interactiveRectpacking_*`, `interactiveLayout_mixedHierarchy`).
  **spore:** both algorithms, distinct centres, grids of equal spacing (cost ties), every `structure.structureExtractionStrategy`,
  `processingOrder.{treeConstruction,spanningTreeCostFunction,rootSelection,preferredRoot}`, `compaction.{compactionStrategy,orthogonal}`,
  `overlapRemoval.{maxIterations,runScanline}`, margins, `nodeNode` spacing, the corpus inputs `test/corpus/generated/spore*-graph-small.json`
  (if their centres coincide they become `jitter` rows). **topdownpacking:** 0-40 children, `hierarchicalNodeWidth`, `aspectRatio`,
  `padding`, `nodeNode` spacing, the corpus input `topdownpacking-hierarchy-small.json`, a two-level `topdownLayout` graph.
- **Throw rows:** what each bundle rejects: `UnsupportedConfigurationException` (`R/p1widthapproximation/TargetWidthWidthApproximator.java:47`,
  `R/p3whitespaceelimination/EqualWhitespaceEliminator.java:50`), the `IllegalArgumentException` default arms reachable through
  `valueOf`-free paths (else `U`), `ScanlineOverlapCheck`'s `IllegalStateException`, and topdown's grid bounds.
- Sizes: 16 MiB per ref, 5,000 lines per launcher.
- **Rejected:** goldens + JUnit only (no localisation for a final-layout mismatch).

## PK2 — The `packing` golden set

`tools/oracle/regen-goldens.sh` gains `--set packing`: manifest `test/golden/packing.json`, refs `test/golden/refs/elk-packing/`,
inputs `test/golden/packing-inputs/`, `jvmFlags: -XX:hashCode=2`; landed sets stay byte-identical (the `force-disco` branch is the template).

- Per algorithm (`rectpacking`, `sporeOverlap`, `sporeCompaction`, `topdownpacking`): the default plus one golden per non-default
  value of every algorithm-specific enum or boolean option and one non-default value of every numeric option, enumerated from
  `tools/melk/sources/{RectPacking,SPOrE,Topdownpacking}.melk`. Options on a node set them in the input.
- **NaiveMinST tie-order goldens** (the issue's named exit item): for each spore algorithm at least two inputs whose spanning-tree
  construction meets equal-cost edges (an equally spaced grid, a regular polygon), and the recorder proves each is order-sensitive
  (the `minst` twin of PK5 changes the tree). Entry ids end `--minst-ties-<n>`.
- **The `retarget` lesson (8a T4, 8b FD2):** every input names `elk.algorithm`; a test asserts each ref's `resolvedAlgorithm`.
- Spore inputs have distinct node centres (PK4); topdownpacking inputs set `topdownLayout` and `topdown.nodeType` where the algorithm
  needs them to run.
- **Rejected:** new `variants.json` keys (multiplies every corpus case); retargeted corpus models (spore's centres coincide, PK4).

## PK3 — `GridElkNode`

Evidence (planning): `P/GridElkNode.java:44` `implements ElkNode, Grid<ElkNode>`; 7 methods of real logic (`put` :67-76 **inserts**
with `add(col, item)` :73; `get`, `getRow`, `getColumn`, `getColumns`, `getRows`, `setGridSize`); everything else delegates to the
wrapped node, which stays in the tree (the wrapper is never stored in it). One construction site (`P/TopdownpackingLayoutProvider.java:43`).
The phases call `getWidth`, `getHeight`, `setDimensions`, `getChildren`, `getProperty`, `getIdentifier` and the grid methods; the
wrapper reaches an `ElkNode`-typed consumer at `progressMonitor.logGraph` (`P/BottomRowEqualWhitespaceEliminator.java:102`), whose
copy goes through accessors (`src/core/util/BasicProgressMonitor.ts:292-299`, `copyGraph`). In TS `ElkNode` is an interface
(`src/graph/ElkNode.ts:13`) over `ElkConnectableShape`, `ElkShape`, `ElkGraphElement`, `EMapPropertyHolder` (`InternalEObject`,
`IPropertyHolder`); `isElkNode` is `instanceof` against one registered class (`src/graph/ElkGraphPackage.ts:176-198`).
`docs/architecture/elkgraph-model.md` §5 and §9 already name this mission to "extend the guards for `GridElkNode`".

**Decision.**

- `src/alg/topdownpacking/GridElkNode.ts`: `class GridElkNode implements ElkNode, Grid<ElkNode>`, delegating **every member the TS
  interfaces declare** in Java's order; the Java's EMF members the TS interfaces lack (`eClass`, `eGet`, `eSet`, `eIsSet`, `eUnset`,
  `eInvoke`, `eAdapters`, `eDeliver`, `eNotify`, …) have no TS counterpart (AD-11) and are listed in one comment naming their lines.
  `put` keeps insert semantics (row lists grow; `BottomRowEqualWhitespaceEliminator` walks back over the nulls).
- `src/graph/ElkGraphPackage.ts`: the registry holds a list per interface name; `registerImpl` appends a class once; `isInstance`
  is true for any registered class. `GridElkNode.ts` registers itself under `ElkNode` and each interface `ElkNode` extends that has a
  guard. Behaviour for every landed class is unchanged (proved by the landed guard tests plus one new case per name).
- If the file exceeds 500 lines, split the delegation by interface into sections behind the class (7h push-forward), never by
  dropping members.
- **Rejected:** an adapter exposing `.node` (rewrites every phase call site and the `ElkNode`-typed `logGraph` call; breaks method
  boundaries); `extends ElkNodeImpl` (a second node with its own containment and properties, diverging from delegation); a narrower
  interface without the guard (the design doc requires the guards to admit it; Java's `instanceof ElkNode` is true).

## PK4 — `Math.random()` jitter

`S/ElkGraphImporter.java:167-169` shifts a node centre by `(Math.random() - 0.5) * 0.001` while the centre equals one already in the
value-hashed `nodeMap`. Java's `Math.random()` is unseeded; `docs/parity-report.md` counts 806 (`sporeCompaction`) and 787
(`sporeOverlap`) nondeterministic corpus cases for this reason. The port calls `Math.random()` (browser-safe, same contract), the same
policy as the unseeded one-argument `Collections.shuffle` (CLAUDE.md: "unseeded, invariants only").

- Recorder `full`/`stops` rows and goldens use distinct centres; the recorder asserts no row reached the loop (a counter by reflection
  or a re-run equality check) and moves any that did to `jitter`.
- `jitter` rows record invariants only: node count, no remaining overlap (overlap removal), every node moved at most a recorded bound,
  and that two oracle runs differ or agree. The TS test checks the same invariants.
- The TS sweep compares only cases the oracle classifies deterministic; nondeterministic ones are counted per algorithm.
- **Rejected:** injecting a seeded source (an API the Java lacks, YAGNI; AD-14); a known-divergence entry (the outputs already match
  wherever the oracle is deterministic).

## PK5 — Hashed containers

| Site | Keys | Iterated | Port |
|------|------|----------|------|
| `S/OverlapRemovalLayoutProvider.java:86` `overlapEdges` (`Sets.newHashSet`), filled by the scanline, `clear()` per iteration, assigned to `graph.tEdges` | `TEdge` (value) | yes, via `NaiveMinST` | `JavaHashSet` + `TEDGE_STRATEGY`; `clear` keeps capacity |
| `S/p1structure/DelaunayTriangulationPhase.java:~50-56` `addAll(triangulate(...))` into the existing set | `TEdge` | yes | the same set object; insertion history replayed |
| `S/ElkGraphImporter.java:110,228` `nodeMap` | `KVector` (value) | lookup only; `updateGraph` collapses equal centres (keep) | `JavaHashMap` + the KVector strategy of `src/alg/common/NaiveMinST.ts:18` |
| `S/p2processingorder/MinSTPhase.java:39` | `KVector` | lookup only | the same |
| landed `NaiveMinST` (`src/alg/common/NaiveMinST.ts`), `BowyerWatsonTriangulation` | `TEdge`, `TTriangle`, `KVector` | tie order = input set order | unchanged; proven for triangulation inputs by `TriangulationVectors.test.ts` (22 rows) |

- The `minst` group records, per row, the edge sequence entering `NaiveMinST`, the tree with child order, and `orderSensitive` (the
  recorder re-runs with the edge list reversed). It covers the scanline path (`overlapEdges` + `addAll`), both cost functions, MIN and
  MAX trees.
- Rectpacking and topdownpacking have no hashed container (planning grep); lists keep insertion order; `List.remove(Object)` and
  `contains` are identity (`indexOf` on the array).
- A row whose order depends on a treeified bin is classified, not re-recorded (8a TR3; `.agent-notes/java-foundations.md`).

## PK6 — Recursion

Input-depth sites: landed `src/alg/common/spore/DepthFirstCompaction.ts` (`compactTree`, `getMinUnderlap`, `minUnderlapWithSubtree`,
`translateSubtree`; handed to 8c by the alg-common journal), `S/p3execution/GrowTreePhase.java:86` `growAt`,
`S/p2processingorder/MinSTPhase.java:90-94` `addNode`. Debug-only recursions (`drawTree`, `draw`) and `R/p2packing/Compactor.java:190-195`
`copyPosition` (hierarchy depth) stay verbatim. T14 runs both spore algorithms on a 2,000-node chain (centres on a line, so the tree is a
path) in the oracle (default `-Xss`) and in TS under `node --jitless`; it converts only a site that overflows in TS where the oracle
completes, with the AC6 verbatim-reference comparison. Beyond 2,000: a `follow-up` issue (8b #70 precedent).

## PK7 — The contract-violating comparator

`R/intermediate/InteractiveNodeReorderer.java:56-63` returns `-1` for equal `desiredPosition`s in both directions, so the tie order is
implementation-defined (and Java's sort may throw `IllegalArgumentException` from 32 elements; `docs/translation-rules-collections.md`
§2.3). The recorder's `sort` group runs `Collections.sort` with that comparator on tie-heavy position lists of length 1-64 (seeded)
and records the output order or the throw. T13 checks whether `Array.prototype.sort` with the verbatim comparator reproduces every row.

- All rows equal: use `Array.prototype.sort`, journal it with the row count.
- Any row differs or throws only in Java: keep `Array.prototype.sort`, file `needs-ruling` naming the rows, and list them in
  `docs/conformance.md`; never write a TimSort from memory of OpenJDK (AD-9).

## PK8 — Staging and registration

Each generated option class imports its provider, and the strategy enums' `create()` instantiate phase classes that import the
options. T5 generates `RectPacking`, `SPOrE`, `Topdownpacking` options with `melk:generate` and lands every type they name: the four
providers (`RectPackingLayoutProvider`, `OverlapRemovalLayoutProvider`, `ShrinkTreeLayoutProvider`, `TopdownpackingLayoutProvider`)
and any enum whose `create()` needs a later class are staged (line-2 marker `// @staged 8c`, non-throwing constructor, throwing
`layout`/`create`), with rows in `test/architecture/staged-classes.json`. Each wiring task unstages its classes; T13 leaves the list `[]`.

- **Fitness extension (pre-approved at planning):** `test/architecture/staged-classes.fitness.test.ts:22` accepts `7f2|7[b-h]|8a|8b`;
  T5 widens `MARKER` by the token `8c` and the header comment. No expected value, ref or tolerance changes; audit point.
- `PENDING_TYPES` stays `[]` (`test/melk/model-algorithms.test.ts:121-123`, AD-13).
- TDZ: strategy enums that name phase classes are non-leaf; run the per-module import smoke after each wiring task and add
  `NON_LEAF_DEFAULT_TYPES` entries where it says so; never an entry-order import.
- Tests register providers explicitly (`SporeMetaDataProvider` registers both spore algorithms).

## PK9 — Sweep and the hand-offs it closes

Oracle: `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" tools/oracle/sweep.sh --filter /<alg>/ --out $TMPDIR/alg-packing/sweep-<alg>`
for `rectpacking`, `sporeOverlap`, `sporeCompaction`, `topdownpacking`. TS: `npx tsx tools/corpus/ts-layout-compare.ts --algorithms <ids> ...`;
T13 adds the three metadata providers. Target: 0 `mismatch`, 0 one-sided throws among deterministic cases; nothing committed (AD-5).

- **8b hand-off:** register rectpacking in `test/golden/force-disco-goldens.test.ts` and remove the `SUFFIX_DIFFERENCES` row (its own
  comment says the row must then be removed; the ref is unchanged, the comparison becomes stricter). Re-run the force, stress and disco
  sweeps over `interactiveRectpacking_{hierarchy,oneBigNode}` (6 residuals) and the 7 tree residuals of #68 that need rectpacking or
  force keys; comment the results on #68 and #71. Do not close them.

## PK10 — JUnit suites

| Java | TS | Runs |
|------|----|------|
| `RT/PaddingTest.java`, `RT/CompactionTest.java`, `RT/issues/Issue583Test.java` | `src/alg/rectpacking/{PaddingTest,CompactionTest}.test.ts`, `src/alg/rectpacking/issues/Issue583Test.test.ts` | 4, 10, 1 |
| `ST/UtilsTest.java`, `ST/ScanlineOverlapRemovalTest.java` | `src/alg/spore/{UtilsTest,ScanlineOverlapRemovalTest}.test.ts` | 3, 1 |
| `PT/test/TopdownPackingTest.java`, `PT/test/TopdownLayoutTest.java`, `PT/layered/test/PortPlacementCalculationTest.java` | `src/alg/topdownpacking/{TopdownPackingTest,TopdownLayoutTest,PortPlacementCalculationTest}.test.ts` | 4, 5, 2 |

Assertions verbatim (the Java's `delta 1` stays `1`). `TopdownLayoutTest` and `PortPlacementCalculationTest` run fixed and layered
through `RecursiveGraphLayoutEngine` (`registerLayered()` from `test/helpers/layered-framework-replay.ts`, as `tree-goldens.test.ts`
does). `ScanlineOverlapRemovalTest`'s `EcoreUtil.Copier` becomes `copyGraph` (`src/graph/util/ElkGraphCopy.ts`).

## PK11 — Scope edges and hand-offs

- `NodeMicroLayoutTest` needs layered, force, stress, mrtree, radial and rectpacking: all exist after 8c, but it stays 8x with
  `PlainJavaInitializationTest` and `ElkReflectTest` (TR9, FD9); T15's hand-off says they are unblocked.
- Issues #58, #68, #71: comments with evidence only.
- `System.err.println` (`R/p2packing/Compaction.java:74`) becomes `console.error` (layered-pipeline F2). `float monitorProgress = 1.0f / n`
  (`R/RectPackingLayoutProvider.java:107`) uses `Math.fround`. `Double.MIN_VALUE` (`R/util/RectRow.java:155`) is `Number.MIN_VALUE`
  (smallest positive subnormal in both). Spore `DEBUG_SVG` kept (programmatic option). `InteractiveRectPackingGraphVisitor`'s reversed
  `endsWith` kept verbatim. `RectangleExpansion`'s `@see` import of `RowFillingAndCompaction` is Javadoc only: no TS import.
- `IllegalArgumentException` default arms of single-value enums are `U` rows.

## PK12 — Commit

Per-task commits during the run; at the end `git tag alg-packing/pre-squash`, `git reset --soft <base>` and one commit
`feat(packing): port rectpacking, spore and topdownpacking (8c)` with a body and `Refs: #39`.

## Pre-made (carried over)

| Rule | Source |
|------|--------|
| Expectations from the oracle, JVM vectors or the Java before the code; no hand-derived numeric expectation | AD-13, 7h L4 |
| `@see` per symbol; one class per file; Java names; sections behind a facade only where a limit forces it | AD-7, 7h push-forward |
| Inputs embedded as ELK JSON; doubles as raw bits; 1e-6 | NS1, NS6, AD-4 |
| Label sizes for 0×0 labels: `6.5 * text.length()` × `13.0` | NS4 |
| `assert` sites stay comments naming the Java line | NS5 |
| A green replay is evidence only when replay-alone coverage shows the code ran | 7a X4 note |
| TDZ: `NON_LEAF_DEFAULT_TYPES` + per-module import smoke; never an entry-order import; a base class may be entered through another module | 7a F10, 8b T8 |
| Whole-ref test loops carry an explicit 60 s timeout | 8a batch 2 `fix` |
| Dump helpers read `getAllProperties()`, never `getProperty`, for cloneable defaults | `.agent-notes/alg-force-disco.md` |
| A Java array allocation with a computed size checks for a negative size (`NegativeArraySizeException`) | 8b T9 |

## Auto-confirmed (unattended)

| Row | Rejected options | Evidence |
|-----|------------------|----------|
| PK1 | goldens + JUnit only; one recorder for all three | every 7x/8x mission's stop rows localised its divergences; three disjoint write-sets run in parallel |
| PK2 | `variants.json` keys; retargeted corpus | `docs/parity-report.md` (806/787 nondeterministic spore cases); 8b FD2 |
| PK3 | adapter with `.node`; `extends ElkNodeImpl`; no guard | `P/GridElkNode.java:44,67-76`; `src/graph/ElkGraphPackage.ts:176-198`; `docs/architecture/elkgraph-model.md` §5, §9 |
| PK4 | seeded injection; known divergence | `S/ElkGraphImporter.java:167-169`; CLAUDE.md shuffle policy; `docs/parity-report.md:60-61` |
| PK5 | identity `Map`/`Set` | `TEdge.java:55-56`, `KVector.java:154-156` value hashes; `TriangulationVectors.test.ts` proves the bin model; spore path unproven |
| PK6 | convert every recursion up front | 7h C7; AC6; 8b FD7 |
| PK7 | a TimSort shim; `Array.prototype.sort` without vectors | AD-9; `docs/translation-rules-collections.md` §2.3 |
| PK8 (+ the one-token `MARKER` widening) | `PENDING_TYPES`; one task per bundle | `test/melk/model-algorithms.test.ts:121-123`; 8a TR5, 8b FD5 |
| PK9 | defer every TS sweep and the hand-offs to row 9 | 8b hand-off (`plans/roadmap.md`, Revision 2026-11-11 alg-force-disco); `force-disco-goldens.test.ts:76-83` |
| PK10 | omit the two topdown suites that run layered | they are in the bundle's test plugin; layered is landed (7h) |
| PK11 | port `NodeMicroLayoutTest` here | it lives in `alg.common.test` and needs every algorithm; 8x owns cross-bundle suites (TR9) |
| PK12 | per-batch commits | queue rules |

Audit points: the `MARKER` widening (PK8); the landed-code change to `ElkGraphPackage.ts` (PK3); the `SUFFIX_DIFFERENCES` row removal
(PK9); `Math.random()` in shipped code (PK4).
