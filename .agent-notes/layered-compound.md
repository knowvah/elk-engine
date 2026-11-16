<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-compound (mission 7h, 2026-11-10)

## Observation: the recorder's tree dump writes node objects for layerless nodes only

- **Context**: T2 aligning the TS dump twin with T1's recorder (`Dump.graph`, copied from 7f).
- **Finding**: a node that sits in a layer appears only as a path in `layers`; its position, size, ports and labels are in no
  node object. After the layering, 185 of the 670 graphs of the 161 recorded trees had empty `layerlessNodes`. The recorder
  now writes `layerNodes` per graph (node objects of the layer-only nodes, in path order); the TS twin appends layer-only
  nodes to the layerless list for one landed `dumpWithPropertyValues` call and removes them in a `finally`.
- **Impact**: any recorder that dumps a graph at a stop after the layering needs `layerNodes` (or the equivalent), or its
  stop rows cannot check node coordinates.
- **Confidence**: High

## Observation: the compound tree comparison needs value-form maps, and they need mutation checks

- **Context**: T6, T7, T8 and T9 comparing `expected.tree` with the TS dump.
- **Finding**: the recorder writes property values in the C4 form (`{t:'int',v}`, `{t:'double',v:'12.0'}`, a bare array for a
  list of elements, an enum class as `Outer.Inner`, an outside element as `{class:<fqcn>}`); the TS dump writes `{t:'number'}`
  and `{t:'list',...}`; the landed `compareLGraphDump` reads an expected `int` or `double` only against `{t:'number'}`. Without
  maps every row reported dozens of self-diffs. The first maps compared an outside element's class as one marker, so an outside
  edge compared equal to an outside node until T9's mutation checks named it.
- **Impact**: a new tree comparison must map both sides to one form and carry mutation checks (`layered-compound-replay-mutation.test.ts`)
  for position, side, reference target, enum, class of an outside element; a green comparison alone proves nothing.
- **Confidence**: High

## Observation: `normalizeIdentityHashes` also rewrites a port index inside an edge's text in a property string

- **Context**: T14 comparing the logged row's `crossHierarchyMap` property.
- **Finding**: the DOT-target pattern (`-> \d+`) rewrites the `-> <port index>` inside `CrossHierarchyEdge.toString` text, so the
  general logged comparison cannot see a wrong port index there.
- **Impact**: `crossHierarchyDiffs` compares every `crossHierarchyMap` line exactly and un-normalised; do the same for any
  property whose text embeds `->`.
- **Confidence**: High

## Observation: the TypeScript multimaps had no `toString`

- **Context**: T14, logged row `sites/JsonDebugUtil/loggedCompound`.
- **Finding**: the debug JSON printed the root's `crossHierarchyMap` as `LinkedHashMultimap@H` because `BucketMultimap` had no
  `toString`, so `javaToString` fell to `objectToString`. `src/guava/Multimap.ts` now prints `{k1=[v1, v2], k2=[v3]}` (Guava
  `AbstractMultimap.toString()` is `asMap().toString()`).
- **Impact**: a multimap in a debug or logged string compares only after this method; the five multimap kinds share it.
- **Confidence**: High

## Observation: a flat engine run also produces "stops" under the recorder's rule

- **Context**: T2 mirroring `StopRecorder.stopProcessor` in the TS replay.
- **Finding**: the rule fires on finished notifications of a hierarchy-aware processor with `isRoot`, so a flat default row has
  stops `P3_NODE_ORDERING/LAYER_SWEEP` and `TWO_SIDED_GREEDY_SWITCH`. The recorder only rejects a run with zero stops.
- **Impact**: a stop's existence does not mean the graph is hierarchical; use the level paths to tell.
- **Confidence**: High

## Observation: an `.elkt` root without an identifier has the level path `""`

- **Context**: T2 level paths against `expected.plans` keys.
- **Finding**: a graph loaded from an `.elkt` whose root has no identifier has the level path `""`; the recorder's and the
  TS replay's level paths agree on all 516 rows with it.
- **Impact**: do not assume a non-empty root path when keying plans by level.
- **Confidence**: Medium

## Observation: `tsx` scratch scripts outside the repo need the `.mts` extension

- **Context**: T9/T13 scratch probes in `$TMPDIR/7h/`.
- **Finding**: a `tsx` scratch script outside the repository runs only with the `.mts` extension.
- **Impact**: name scratch scripts `*.mts`.
- **Confidence**: Medium

## Observation: `npm run complexity` counts NLOC after prettier wraps lines

- **Context**: splitting the 1,048-line `CompoundGraphPreprocessor` and the postprocessor under the 30-NLOC limit.
- **Finding**: the project gate measures the formatted file, so a function the write hook accepted can exceed 30 NLOC once
  prettier wraps its long lines. The gate is stricter than the hook.
- **Impact**: split with margin, or run `npx prettier --write` before reading the hook's verdict.
- **Confidence**: Medium

## Observation: the label sweep's 50 `INCLUDE_CHILDREN` cases are 45 after the stress filter

- **Context**: T13 enumerating H5 part (a).
- **Finding**: part (a) enumerates 50 candidates (10 label-bearing `.elkt` × 5 variants); `examples/hierarchy/hierarchicalLayoutMixing.elkt`
  uses `elk.stress`, so 1 model (5 cases) is out of scope and 45 are swept. Part (b): 115 candidates, 100 swept (three models out
  of scope). Part (a)'s 9 swept models are a subset of part (b)'s 20, so 45 cases repeat under another id.
- **Impact**: "50" is the pre-filter count; sweep totals are 1,169 cases.
- **Confidence**: High

## Observation: H5 part (c)'s wording selects no file unless the option is applied

- **Context**: T13, ptolemy hierarchical `.json` selection.
- **Finding**: none of the 256 `realworld/ptolemy/hierarchical/*.json` sets `hierarchyHandling` (0 hold the text
  `INCLUDE_CHILDREN`), so the rule "with `INCLUDE_CHILDREN` set at the root" selects 0 files. The sweep applies it to every file.
- **Impact**: 1,024 cases (256 × 4 directions); a later reading of H5 must say "apply", not "select".
- **Confidence**: High

## Observation: macOS `sed -i` needs `''`, and a mutation harness must refuse to run inside the worktree

- **Context**: T15's first mutation attempt.
- **Finding**: `sed -i` without an empty suffix argument failed on macOS after the first in-place edit had already mutated two
  production files (restored with `git checkout --`). The harness then refused to run inside the worktree and mutates four
  scratch copies.
- **Impact**: mutate scratch copies only; check `git status` before and after.
- **Confidence**: High

## Observation: `moveExternalPorts` is unobservable for nested graphs

- **Context**: T15, mutants R29, R30, R34 to R38 surviving every row.
- **Finding**: `HierarchicalNodeResizingProcessor.moveExternalPorts` (Java `:207-220`) shifts a coordinate that
  `LGraphUtil.getExternalPortPosition` overwrites, and for a nested graph `graphLayoutToNode` writes the same final position in
  the same `process` call (49 variants equal). It is visible only when the layered top-level graph has an ElkNode parent, and
  then in the tree at the resizer stop (EAST (288,18) against (132,18)), not in the export.
- **Impact**: only the Java-structure class tests and issue #60's graph kill these mutants; do not read a surviving mutant here
  as a missing row.
- **Confidence**: High

## Observation: the importer orders edges by container depth

- **Context**: T15, equivalent mutants G21 and G22.
- **Finding**: `ElkGraphImporter` visits edges by container depth, the outside edge first, so a non-exported inner port never
  precedes another edge of its loop.
- **Impact**: arms that assume the opposite order are unreachable from imported graphs; they need a hand-built graph.
- **Confidence**: High

## Observation: the postprocessor's key order is visible in the intermediate tree only

- **Context**: T9 twin verdicts for `CompoundGraphPostprocessor.java:89`.
- **Finding**: re-attaching original edges in key order lists a shared port's edges in key order; 13 ids (7 `models` and
  `scenarios` rows, 6 `sites` run rows) differ when the iteration is reversed, and the exported layout of both runs is
  string-identical.
- **Impact**: a tree comparison catches an order defect that no export or golden can; keep the tree rows.
- **Confidence**: High

## Observation: the oracle's `425_selfLoopInCompoundNode` throws on the `.elkt` and completes through the recorder's inline export

- **Context**: batch 6 reconciliation of T12 and T13.
- **Finding**: the oracle throws `NullPointerException` at `ElkGraphImporter.java:1146` for the `.elkt` (5 of 5 sweep variants);
  the recorder's inline export of the same model completes. The port throws a `TypeError` at the same import step.
- **Impact**: compare like with like when two reports disagree about one input; the site row records the `.elkt` case.
- **Confidence**: High

## Observation: `Issue665Test` has no case left once its stress model is filtered, and the runner throws on an empty list

- **Context**: T11, H13.
- **Finding**: the runner's `validate` throws on an empty graph list, so the file emits one `it.skip` with the reason; the
  runner's filter seam is a name regex and cannot drop a path, so `STRESS_PENDING` resolves the sources itself.
- **Impact**: removing `stress-pending.ts` when `elk.stress` lands restores the 1 + 2 cases with no runner change.
- **Confidence**: High
