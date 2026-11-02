<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.layered, part a: the framework (mission 7a)

What mission 7a (`layered-framework`, roadmap row 7a) ported of `org.eclipse.elk.alg.layered`, how the LGraph model
and the ElkGraph ↔ LGraph transform are laid out, how a **staged class** (a forward reference a later sub-mission
completes) is marked, listed and replaced, how layered registers its metadata, the evidence, and a runbook. Decisions
cited are `plans/layered-framework/decisions.md` (L1–L7, S1–S4, X1–X6); task ids (T1–T12) are in that mission's
`decision-journal.md`; AD-n are `plans/elk-engine-skeleton/decisions.md`, M-n `plans/core-engine/decisions.md`, P-n
`plans/alg-common/decisions.md`. Nothing here is exported from `src/index.ts` (AD-14), and no layout runs yet: the
algorithm classes land in 7b–7h. Counts of oracle rows live in [conformance.md](../conformance.md#alg-layered-framework).

| Section                                     | Answers                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------- |
| [1. Package map](#package-map)              | What 7a ported, where it lives, what is staged                              |
| [2. LGraph model](#lgraph-model)            | The 13 graph classes and the Java idioms they keep                          |
| [3. Transform](#transform)                  | Importer and transferrer sections, hash sites, quirks kept                  |
| [4. Staged classes (L1)](#staged-classes)   | Marker, registry, fitness test, how a mission replaces a staged file        |
| [5. Options and registration](#options)     | Generated `LayeredOptions`, `Spacings`, L5 registration                     |
| [6. Evidence](#evidence)                    | The three replays, the site rows, coverage                                  |
| [7. Runbook](#runbook)                      | Re-recording, regenerating, reading a staged throw                          |
| [8. Part b: cycles and layers](#part-b)     | Mission 7b: p1cycles, p2layers, ten processors, phase rows, sweep           |
| [9. Part c: crossing minimization](#part-c) | Mission 7c: p3order, counting, greedy switch, model order, eight processors |
| [10. Part d: node placement](#part-d)       | Mission 7d: see [alg-layered-placement.md](alg-layered-placement.md)        |

## 1. Package map {#package-map}

Java packages are under `org.eclipse.elk.alg.layered`; TS paths under `src/alg/layered/` (AD-7). Section modules
behind a facade (P1) and nested types in prefixed files (M15) follow the alg.common precedent. Counts exclude
`*.test.ts`.

| Java package      | TS directory      | Ported in 7a (task)                                                                                                                                                                                                                                                                                                         |
| ----------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (root)            | `.`               | `LayeredLayoutProvider`, `LayeredPhases`, `IHierarchyAwareLayoutProcessor` (T7, T3); `ElkLayeredTestExecutionState` (M15 file of the nested class, T7); `ElkLayered` **staged** for 7f (L2)                                                                                                                                 |
| `components`      | `components`      | `ComponentOrderingStrategy` (T2); the rest is 7h                                                                                                                                                                                                                                                                            |
| `graph`           | `graph`           | `LGraphElement`, `LShape`, `LGraph`, `LNode` + `LNodeNodeType`, `LPort`, `LEdge`, `LLabel`, `Layer`, `LMargin`, `LPadding` (T3); `LGraphUtil` facade + `LGraphUtil{Arrays,Layers,GraphProperties,Ports,ExternalPorts,Other}` (T3); `LGraphAdapters` facade + the six adapter files and `PortComparator` (T5); `Tarjan` (T5) |
| `graph.transform` | `graph/transform` | `IGraphTransformer`, `ElkGraphTransformer` (T6); `ElkGraphTransformerUtility` (X1, T3); `ElkGraphImporter` facade + 11 sections; `ElkGraphLayoutTransferrer` facade + `Apply`, `Utility`, `NonMutating` (T6)                                                                                                                |
| `options`         | `options`         | 32 enums, `InternalProperties`, `Spacings` + `SpacingsUnspecifiedSpacingException`, `LayeredSpacings` + its builder (T2, T3, T4); generated `LayeredOptions` and `LayeredMetaDataProvider` (L7, T3/T7)                                                                                                                      |
| staged (L1)       | various           | `intermediate/LabelDummySwitcher` (7f), `intermediate/loops/{SelfLoopEdge,SelfLoopHolder,SelfLoopPort}` (7g), `intermediate/wrapping/{BreakingPointInserter,BreakingPointInserterBPInfo}` (7g), `compound/CrossHierarchyEdge` (7h), `p5edges/splines/SplineSegment` (7e)                                                    |

Moved out of 7a by L2 (to 7f): `ElkLayered` (staged here), `GraphConfigurator`, `InteractiveLayeredGraphVisitor`,
`DebugUtil`, `DotDebugUtil`, `JsonDebugUtil`. `IntermediateProcessorStrategy` goes to 7b (S3), `TestGraphCreator` to 7b
(L6), the `TreeSet` promotion to 7c (S2).

## 2. LGraph model {#lgraph-model}

The 13 `graph` classes are plain classes with the Java accessor names (AD-11 spirit; no EMF here). Idioms kept
(T3 journal rows):

- **Nullable references** are typed `T | null` (`LPort.getNode`, `LEdge.getSource/getTarget`, `LNode.getLayer/
getGraph/getNestedGraph`, `LGraph.getParentNode`); call sites that Java dereferences unchecked use `!`, so a Java
  NPE site still throws at run time (a `TypeError`, see the known divergences in conformance.md).
- **Java lists** are arrays. `List.remove(Object)` is a guarded splice (an unguarded `splice(indexOf, 1)` would drop
  the last element when the object is absent); `List.add(int, E)` in `LEdge.setTargetAndInsertAtIndex` throws
  `IndexOutOfBoundsException` as Java does.
- **`LNode.getPortSideView`** keeps `ArrayList.subList`'s live, write-through view: a module-private `Proxy` over the
  port list typed `LPort[]`, because 7c's `GreedyPortDistributor.switchPorts` writes through `Lists.reverse(view)`.
  A structural change through the view throws `UnsupportedOperationException`.
- **Overloads** dispatch by arity or `instanceof` (translation rules 6.5): `LNode.getPorts` (4 forms), `LNode.setLayer`
  (2), `LEdge.getOther` (port/node), `Spacings.getHorizontalSpacing` (element/node/type) and friends.
- **`IHierarchyAwareLayoutProcessor`** is a method-less Java marker tested with `instanceof`; the port adds a
  `unique symbol` brand `HIERARCHY_AWARE` and `isHierarchyAwareLayoutProcessor(o)` (translation rules 6.6). This is
  the only TS-only surface 7a added; the oracle lists `LayerSweepCrossingMinimizer` (7c) as the jar's only implementor.
- **`LGraphUtil`** (1,163 Java lines) is a facade plus six section modules at the Java section comments; sections never
  import the facade. `createExternalPortDummy`'s nine parameters arrive as `ExternalPortDummyArgs` with the Java names
  (5-parameter cap; graph-text T11 precedent).
- **`Tarjan.stronglyConnected`** is an explicit-stack loop (AC6) proven against a verbatim recursive reference on 80
  random graphs, 200-node chains and nested SCCs, and under `--jitless` at 10,000 nodes where the reference overflows.
  Its two hash containers (`nodeToSCCID`, the per-SCC `HashSet`) are insertion-ordered `Map`/`Set` (AD-10): a 7b
  replay mismatch traced to either is that mission's stop.
- **Java `assert` sites** (`LNode.setGraph`, `createExternalPortDummy` ×2, `ElkGraphImporter.java:203, 561-562, 730`)
  are omitted per the `KVector` precedent (the oracle runs without `-ea`). `NodeFlexibility.isAtLeast` keeps Java's
  missing `return` in the `NODE_SIZE_WHERE_SPACE_PERMITS` arm (it falls through to `isFlexiblePorts`).

## 3. Transform {#transform}

`ElkGraphTransformer` is the facade (`importGraph`, `applyLayout`, the static `getOriginIdentifier` delegating to
`ElkGraphTransformerUtility`, X1). The utility section lives in its own module because `LGraphElement.getDesignation`
needs it and a verbatim import would close the ESM cycle `LGraphElement → ElkGraphTransformer → ElkGraphImporter →
LGraph` with `class LGraph extends LGraphElement` evaluated before `LGraphElement` exists (TDZ).

- **`ElkGraphImporter`** (1,280 Java lines) → facade (`:80-141`) + `EntryPoints`, `Flat`, `Hierarchical`, `ModelOrder`,
  `Graphs`, `ExternalPorts`, `Nodes`, `Ports`, `Edges`, `Labels`, `Map`, split at the Java section comments (T6).
  `transformPort` takes a `PortTransformContext` for its last three Java parameters; `transformEdge` an internal
  record for its shared locals.
- **`ElkGraphLayoutTransferrer`** → facade (+ `applyLayoutNonMutating`) + `Apply`, `Utility`, `NonMutating` (the
  debug statics are suffixed `NonMutating`).
- **Hash sites (AD-10).** `ElkGraphImporter.java:83` `nodeAndPortMap` (EMF identity keys) is an insertion-ordered `Map`
  written and read by key only; `:237` and `:316` `HashSet<Integer> cbGroupModelOrders` are `Set<number>` whose only
  read is `size()`. Iteration order is unobservable at all three.
- **Quirks kept, unreached in 7a:** `transformExternalPort` casts `elkgraph.getParent()` unconditionally (`:801-805`,
  an NPE for a root graph in Java, so external ports are only importable below the root); `:668` discards a
  `KVector.diff`; `:705` clones `JUNCTION_POINTS` before the null check; `computeInsideNodeLabelPadding(null, …)`.

## 4. Staged classes (L1) {#staged-classes}

A **staged class** is a Java class a later sub-mission owns but 7a code references. Its file sits at the Java path,
the members 7a references are ported verbatim, and every other method throws
`UnsupportedOperationException('<Class.member> is ported in mission 7x')` with return type `never`, so no further
unported type is referenced. Line 2 of the file carries `// @staged <mission>`.

| File (`src/alg/layered/`)                              | Completes in | 7a reference                                                                                                    |
| ------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------- |
| `ElkLayered.ts`                                        | 7f           | `LayeredLayoutProvider` (`doLayout`, `doCompoundLayout`, `prepareLayoutTest` throw; `setTestController` ported) |
| `intermediate/LabelDummySwitcher.ts`                   | 7f           | `ElkGraphLayoutTransferrer{Apply,NonMutating}`                                                                  |
| `intermediate/loops/SelfLoopEdge.ts`                   | 7g           | `LGraphAdaptersLPortAdapter` self-loop branches                                                                 |
| `intermediate/loops/SelfLoopHolder.ts`                 | 7g           | `InternalProperties.SELF_LOOP_HOLDER`                                                                           |
| `intermediate/loops/SelfLoopPort.ts`                   | 7g           | `LGraphAdaptersLPortAdapter` self-loop branches                                                                 |
| `intermediate/wrapping/BreakingPointInserter.ts`       | 7g           | outer class of `BPInfo` (M15 pair)                                                                              |
| `intermediate/wrapping/BreakingPointInserterBPInfo.ts` | 7g           | `InternalProperties.BREAKING_POINT_INFO`                                                                        |
| `compound/CrossHierarchyEdge.ts`                       | 7h           | `InternalProperties`                                                                                            |
| `p5edges/splines/SplineSegment.ts`                     | 7e           | `InternalProperties`                                                                                            |

`test/architecture/staged-classes.json` lists `{ path, mission }` for each, and
`test/architecture/staged-classes.fitness.test.ts` keeps the marker and the list in sync both ways. Phase-strategy
factory arms (`CycleBreakingStrategy`, `LayeringStrategy`, `CrossingMinimizationStrategy`, `NodePlacementStrategy`)
throw `'<Class> is ported in mission 7b/7c/7d'` with no import and no staged file.

**Replacing a staged file (7b–7h):** port the class fully at the same path, delete the `@staged` line, remove its row
from `staged-classes.json` (the fitness test fails until both are done), replace any `create()` arm that named the
class, and re-run the three 7a replays unchanged (they must stay green: AD-13). The list is empty after 7h.

## 5. Options and registration {#options}

`npm run melk:generate Layered` (L7, the P3 precedent) emits `src/alg/layered/options/{LayeredOptions,
LayeredMetaDataProvider}.ts` from the vendored `tools/melk/sources/Layered.melk`; `DEFAULT_BUNDLES` is unchanged.
Two generator rules were added under S4 (Core, Labels and Polyomino stay byte-identical): a held-back algorithm's
class is emitted with its option constants and without its factory (X3, used while `LayeredLayoutProvider` sat in
`PENDING_TYPES` between T3 and T7), and `NON_LEAF_DEFAULT_TYPES` makes an option whose `*_DEFAULT` reads a non-leaf
class (`NodeFlexibility`, which imports `LayeredOptions`) a cached static getter (M16 pattern), which closed a TDZ when
entering through `NodeFlexibility`. `test/melk/layered-options.test.ts` compares the bundle's option model (140
calls) with `metadata.json`; `test/melk/layered-registry.test.ts` replays the `metadata/service` row.

Layered registers explicitly (L5): `LayoutMetaDataService.getInstance().registerLayoutMetaDataProviders(new
LayeredMetaDataProvider())`; `getInstance()` still registers core and labels only (C8). `LayeredSpacings` builds on
`ElkSpacings`' `AbstractSpacingsBuilder`; its `BASE_SPACING_OPTION`/`DEPENDENT_SPACING_OPTIONS` are lazy statics (ESM
cycle with `LayeredOptions`). `Spacings` ports the four `nodeTypeSpacing` overloads and the `UnspecifiedSpacingException`
(registered in the exception-hierarchy fitness test, X2). The recorder cannot encode `cmEnforcedGroupOrders`'
`List<Integer>` default, so both melk tests check that one record separately (`ShapePrimer`).

## 6. Evidence {#evidence}

Every expectation in 7a comes from the source-built oracle before its TS consumer existed (AD-13, L4); nothing is
hand-derived. Three layers:

| Layer                           | File                                                                                    | Rows                                                                                                                     | Replay                                                                                                                                                          | What it proves                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework replays (L3, T1)      | `test/golden/refs/java/layered-framework.json` (2.65 MB, JDK 21.0.1, oracle `8aaa3c14`) | 272: `transform` 129 (117 value + 12 exception), `adapters` 142 (9 exception), `metadata` 1                              | `graph/transform/LayeredFrameworkTransformVectors.test.ts` (T6), `graph/LayeredFrameworkAdapterVectors.test.ts` (T8), `test/melk/layered-registry.test.ts` (T7) | import → LGraph dump with every property → transfer back → ELK JSON, over the 31 curated, 4 ticket and 9 realworld models (+18 `#include-children` variants) and a pairwise sweep; node sizing and margins through `LGraphAdapters` over the same models plus an alignment/border-offset sweep (X4: nodes layered first); the registered layered option set (449 calls) equals `metadata.json` |
| Site rows (L4, X5–X7, T10)      | `test/golden/refs/java/layered-sites.json` (2.3 MB)                                     | 330 in 22 scenario groups (S1–S22 of `plans/layered-framework/unreached.md`), 128 with an ELK JSON `input`, 146 step ops | `LayeredSiteVectors.test.ts` + `test/helpers/layered-site-replay*.ts` (T11a)                                                                                    | every branch the framework replays leave untaken, including the structural ones (enum reflection rows, bookkeeping, strings, the provider's staged boundary)                                                                                                                                                                                                                                   |
| Anchored unit tests (T11b–T11d) | colocated `*.test.ts` and `*.sites.test.ts`                                             | 139 + 138 + 53 rows → ~600 cases, each `// oracle: <row id>; <Java file:line>`                                           | —                                                                                                                                                               | readable per-branch tests whose literals equal the rows (6c D1: the replay is the authority)                                                                                                                                                                                                                                                                                                   |

Plus the portable JUnit `LayeredSpacingTest` (15 of 16 cases; `AfterLayoutTest` → 7f, S1) and ~400 T3 unit tests
whose values are inputs copied unchanged, Java constants, ids or branch outcomes.

**Coverage.** Replay-alone coverage of the 7a sources before T10 was 59.8 / 40.1 / 61.7 / 60.6 % (statements /
branches / functions / lines; `unreached.md`). After T11 every non-staged 7a class is at 100 % branches except the
seven whose remainder is Java-unreachable or 7f-bound (`unreached.md` § Amendments): `LGraphUtil` 97.2, `LNode` 98.9,
`ElkGraphImporterHierarchical` 94.6, `ElkGraphLayoutTransferrer` 92.9, `…Apply` 94.1, `…NonMutating` 78.8 (eleven
arms dead by construction: the rebuilt graph carries no options), `LayeredLayoutProvider` 50 (the `isCanceled` arm
behind the staged throw). Whole-suite coverage stays above 99 / 97 / 99 / 99.

**Divergences found and fixed (all at origin, journaled).** Two in the whole mission, both in T3 code, both caught by
an oracle row rather than by a hand-derived test: (1) the first `adapters` recording was vacuous because
`LGraphAdapter.getNodes()` walks layers only and imported nodes are layerless (X4: recorder and replay layer the nodes
first; `layered-framework.json` re-recorded once, `transform` and `metadata` rows byte-identical); (2) the port-side
view proxy returned `undefined` for an out-of-range read and threw `UnsupportedOperationException` for an
out-of-range write where `ArrayList.SubList.get/set` throw `IndexOutOfBoundsException` (X7: bounds-checked; two T3
cases re-anchored to row `site/lnode/portSideView`).

**Known divergences, open by design** (conformance.md has the list): Java NPE sites throw `TypeError` (D10, AD-16b;
the replay compares those by class only, every other exception by class and message); the JDK 21 helpful-NPE text of
`insideSelfLoops/hierarchical-host-without-include-children` is not reproduced; the `ElkLayered` boundary throws
`UnsupportedOperationException` naming 7f.

## 7. Runbook {#runbook}

Run from the repository root. `$ELK_SOURCE_DIR` and `$ELK_ORACLE_DIR` default to the repo-relative paths of AD-15; the
oracle must be built (`tools/oracle/build.sh`), JDK 21 on `PATH`. Never edit `tools/vectors/vector-cache.sh` or
`tools/vectors/JavaVectors.java`, and never regenerate a landed ref to get a test green (AD-13).

### 7.1 Re-record the framework and site vectors

```bash
tools/vectors/layered-framework-vectors.sh test/golden/refs/java   # layered-framework.json (transform, adapters, metadata)
tools/vectors/layered-site-vectors.sh test/golden/refs/java        # layered-sites.json (22 scenario groups)
git status --short test/golden/refs/java    # must show nothing for a same-JDK re-record
ELK_VECTORS_CACHE=off tools/vectors/layered-site-vectors.sh <scratch dir>   # cold, byte-identical
```

Each recorder prints one `cache:` line and is byte-stable across two runs. Both pin the model files they read by
SHA-256 (`MODEL_TABLE`), so a changed corpus file fails the recording by name. A diff after a same-JDK re-record means
the oracle jars, the classpath or the recorder changed: that is an AD-13 stop, journaled before anything else moves.
`layered-framework.json` was re-recorded once during 7a (X4: the first `adapters` recording ran the sizing sequences on
layerless nodes, which `LGraphAdapter.getNodes()` ignores, so it held the import state; the recorder now moves every
graph's layerless nodes into one `Layer` first). Embedded ELK JSON in `layered-sites.json` maps Gson's bare
`Infinity`/`-Infinity`/`NaN` to the strings `"Infinity"`/`"-Infinity"`/`"NaN"` so the file is strict JSON; the
replay helper decodes them.

### 7.2 Regenerate the layered options

```bash
npm run melk:generate Layered
git status --short src test    # must show nothing unless the generator or Layered.melk changed
npm run melk:generate Core Labels Polyomino && git diff --exit-code src/core/options src/core/labels src/alg/common/compaction/options   # S4
npx vitest run test/melk
```

If generating changes any file other than the two layered classes, or the output needs a hand edit, stop and journal
it. The Java classes to compare with are under `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.alg.layered/src-gen/`.

### 7.3 Reading an `UnsupportedOperationException` that names a mission

`<Class.member> is ported in mission 7x` comes from a staged class ([section 4](#staged-classes)) or a factory arm:
the code path is correct and reaches a member that sub-mission 7x owns. It is not a bug to fix in 7a; it is the
boundary. The replays and unit tests of 7a never cross it (the provider rows of `layered-sites.json` assert the throw
and keep the oracle's layout output for 7f).

### 7.4 Failure modes

| Failure                               | Detection                                                                                      | Fix                                                                                                                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vacuous replay                        | a replay is green but replay-alone coverage of the class under test is near 0 %                | the scenario did not reach the code (X4: layerless nodes are invisible to the adapters). Fix the recorder, re-record (AD-13 stop), never the test                                                 |
| TDZ on an options class               | `ReferenceError` when a layered module is imported first; the fresh-process import smoke fails | a `*_DEFAULT` reads a non-leaf class: add the option to `NON_LEAF_DEFAULT_TYPES` in `tools/melk/config.ts` and regenerate (7.2); never hand-edit the generated file                               |
| Staged member reached by a replay row | a row throws `… is ported in mission 7x` where the oracle recorded a value                     | stop 7 of the mission: the staged inventory missed a member; the owning mission ports it, or the row is re-scoped by the user                                                                     |
| Identity-hash order                   | a replay mismatch at `ElkGraphImporter` `nodeAndPortMap` or `Tarjan`'s containers              | insertion order is journaled as the choice (AD-10); follow [collections 2.5](../translation-rules-collections.md#25-runbook-javahashmap-order-mismatch-in-a-ported-site) before touching the port |

## 8. Part b: cycles and layers (mission 7b) {#part-b}

Mission 7b (`layered-cycles-layers`, roadmap row 7b) ported the first two phases and the processors around them.
Decisions cited are `plans/layered-cycles-layers/decisions.md` (SC1–SC4, B1–B10, E1–E2a); task ids T1–T13 are in that
mission's `decision-journal.md`. The pipeline still does not run: `ElkLayered` and `GraphConfigurator` stay staged for
7f, and every phase here is proven by replaying what the oracle's pipeline recorded, not by running one.

### 8.1 Package map {#part-b-package-map}

| Java package   | TS directory   | Ported in 7b (task)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p1cycles`     | `p1cycles`     | all 11: `GreedyCycleBreaker`, `DepthFirstCycleBreaker`, `InteractiveCycleBreaker`, `ModelOrderCycleBreaker`, `GreedyModelOrderCycleBreaker`, `BFSNodeOrderCycleBreaker`, `DFSNodeOrderCycleBreaker`, `SCCModelOrderCycleBreaker` + `SCConnectivity` + `SCCNodeTypeCycleBreaker`, `GroupModelOrderCalculator` (T6); the `CycleBreakingStrategy` arms create them (T6)                                                                                                                                                                                                                                                      |
| `p2layers`     | `p2layers`     | all 9: `NetworkSimplexLayerer`, `LongestPathLayerer`, `LongestPathSourceLayerer`, `CoffmanGrahamLayerer`, `InteractiveLayerer`, `StretchWidthLayerer`, `MinWidthLayerer` (+ `MinWidthLayeringComputation`, M15), `BreadthFirstModelOrderLayerer`, `DepthFirstModelOrderLayerer` (T7); the `LayeringStrategy` arms create them (T7)                                                                                                                                                                                                                                                                                        |
| `intermediate` | `intermediate` | `IntermediateProcessorStrategy` (59 members, T2; 10 arms wired in T8, 49 throw naming 7c/7f/7g per B9); the five processors the phases declare — `EdgeAndLayerConstraintEdgeReverser`, `LayerConstraintPreprocessor`, `LayerConstraintPostprocessor`, `ReversedEdgeRestorer`, `InteractiveExternalPortPositioner` (T4) — and the five `GraphConfigurator` adds between P1 and P3 — `NodePromotion` (+ `NodePromotion{State,Precalculation,ModelOrder,Heuristic}` sections), `HighDegreeNodeLayeringProcessor` (+ `…HighDegreeNodeInformation`, M15), `Partition{Pre,Mid,Post}processor`, `BiLinkedHashMultiMap` (T5, SC1) |

Why the ten processors (SC1): a layering recorded by the oracle's `runLayoutTestUntil` is the result of every
processor the configuration ran before the stop, so the set a 7b replay needs is exactly what P1 and P2 declare plus
what `GraphConfigurator` inserts between them. Nothing else of `intermediate` is in 7b.

### 8.2 Rows and the prefix replay {#part-b-rows}

`test/golden/refs/java/layered-phases.json` (recorder `tools/vectors/LayeredPhaseVectors.java`, launcher
`tools/vectors/layered-phase-vectors.sh`) has three row groups (B1, B2):

- `models/*` (534): a vendored model, imported at one hierarchy level (`target`), run through the real Java pipeline
  (`ElkLayered.prepareLayoutTest`, then `runLayoutTestUntil` at a P1 strategy, a P2 strategy or a 7b processor);
  the row stores the ordered `prefix` of processors that ran. The TS replay mirrors `GraphConfigurator`'s
  normalisation (`test/helpers/layered-phase-replay-normalise.ts`, B4) and runs the prefix by name through the enum
  and the strategy factories. 7f re-replays every one of these rows through the real `ElkLayered` (SC4).
- `scenarios/*` (80) and `sites/*` (37): step rows run by the recorder's own interpreter (`importGraph`, `normalise`,
  `setProperty`, `layers`, `reverseEdge`, `runProcessor`, `runPhase`, `dump`) and its TS twin
  (`test/helpers/layered-phase-replay-ops.ts`); hand-built graphs of the Java tests and the T9 branch scenarios.
- `expected`: layers (node paths per layer), layerless and hidden nodes, every edge with its `reversed` flag, and the
  properties that changed since normalisation (C4-encoded); rows under ten nodes carry the full 7a dump.

Every row sets `SEPARATE_CONNECTED_COMPONENTS=false` (B3: `ComponentsProcessor` is 7h). The recorder refuses a row
whose prefix names a processor outside the 7b set (two accepted refusals: `SELF_LOOP_PREPROCESSOR`,
`LABEL_DUMMY_INSERTER`) and a `BFS_NODE_ORDER` row with more than ten source nodes (8.6).

### 8.3 Recursion rewrites (B8) {#part-b-recursion}

Nine input-depth recursions are explicit-stack loops that reproduce the Java visit, side-effect and accumulation
order, each proven against a verbatim recursive twin in its test file over the oracle rows plus a 5,000-node case run
under `--pool=forks --execArgv=--jitless`: `DepthFirstCycleBreaker.dfs`, `DFSNodeOrderCycleBreaker.dfs`,
`InteractiveCycleBreaker.findCycles`, `CoffmanGrahamLayerer.dfs`, `LongestPathLayerer.visit`,
`LongestPathSourceLayerer.visit`, `NetworkSimplexLayerer.connectedComponentsDFS`, `NodePromotion`'s promotion
cascade, `HighDegreeNodeLayeringProcessor.isTreeRoot`/`moveTree` (the brief's `degree` and
`LayerConstraintPreprocessor.hide` are not recursive). `BasicCycleBreakerTest`'s own `dfs` follows the same rule.

### 8.4 Two Java idioms the port had to reproduce {#part-b-idioms}

- **Class-initialisation laziness (E1).** Wiring the strategy-enum arms closes an import cycle the Java also has
  (enum → phase class → `LayeredOptions` → provider → transformer → importer → enum). Java initialises classes on
  first use; ESM evaluates modules in import order, so three kinds of module-level reads failed in the temporal dead
  zone and are now lazy: the generated option defaults for `CycleBreakingStrategy`/`LayeringStrategy` (melk
  `NON_LEAF_DEFAULT_TYPES`, 7.2), the six strategy comparisons of `ElkGraphImporterModelOrder` (read inside the
  function, as `ElkGraphImporter.java:484-489` does) and the thirteen phase classes' `*_PROCESSING_CONFIGURATION`
  (cached static getters). Tests enter the graph through a strategy enum, never through an abstract phase base class.
- **`Integer` box identity (E2a).** Four sites compare boxed `Integer`s by reference (`NodePromotion.java:541`,
  `CoffmanGrahamLayerer.java:244`, `SCCNodeTypeCycleBreaker.java:80,88`, `Tarjan.java:86`); each operand is a fresh
  `Integer.valueOf` box, so the comparison holds exactly for equal values inside the -128..127 cache.
  `JavaInteger.sameValueOfBox` encodes that Javadoc guarantee. It is load-bearing: value equality made the
  left-to-right model-order promotion loop forever on eight oracle rows, and `Tarjan` found components the Java never
  finds on graphs with 128 or more nodes (8.6).

### 8.5 Evidence {#part-b-evidence}

| Layer                              | What                                                                                                                                                                                                                                                                                                                                                            | Replay / test                                                                                                                                                                                                                                       |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase rows (T1, T11)               | `layered-phases.json`, 651 rows (`models` 534, `scenarios` 80, `sites` 37), 1,958,962 bytes, JDK 21.0.1, oracle `8aaa3c14`, byte-stable; every class also proven on its own rows with the class injected (T4–T7)                                                                                                                                                | `src/alg/layered/LayeredPhaseVectors.test.ts` replays all 651 by name (T8); `test/helpers/layered-phase-replay-pre-state.test.ts` checks the 81 step dumps' pre-states                                                                              |
| Ported JUnit invariants (T8)       | `BasicCycleBreakerTest`, `BasicLayerAssignmentTest`, `BasicModelOrderTest`, `EdgeAndLayerConstraintEdgeReverserTest`, `LayerConstraintProcessorTest`, `ReversedEdgeRestorerTest`, `NodePromotionTest`, `PartitionPostProcessorTest`, bodies verbatim                                                                                                            | over the replayed graphs of the Java tests' configurations (pipeline and scenario rows); the coordinate tests of SC2 are 7f                                                                                                                         |
| Breadth sweep (T10, B6)            | `tools/oracle/phase-sweep.sh`: 32,652 oracle cases over 550 ptolemy models (30,074 ok, 1,983 refused, 595 timeout), one canonical-dump SHA-256 each, gitignored                                                                                                                                                                                                 | `test/corpus/phase-sweep.test.ts`: 15,003 cases at stride 2 (all 30,074 with `PHASE_SWEEP_STRIDE=1`), 0 mismatches after the two divergences below were fixed                                                                                       |
| Anchored unit tests (T12a–c)       | one colocated case per S and J item of `plans/layered-cycles-layers/unreached.md`, `// oracle: <row id>; <Java file:line>`                                                                                                                                                                                                                                      | 40 row cases over 24 files (p1cycles 7, p2layers 16, intermediate 17) plus six Java-constant cases (`Integer.compare`, `NoSuchElementException`, enum ordinals); every S and J item of the map is anchored, the U list stays untested               |
| Hand-built JUnit suites (7c-tests) | the three greedy-switch graph creators as `test/helpers/{TestGraphCreator,InLayerEdgeTestGraphCreator,NorthSouthEdgeTestGraphCreator}.ts` (`MockRandom` overrides the `Random` shim's boolean and float draws) and fourteen suites colocated as `<JavaName>.test.ts`, Java literals as expectations, graph elements asserted by identity (`expectSameElements`) | 280 passed, 12 skipped (8 `@Ignore` methods × parameters), equal per suite to `tools/oracle/java-tests.sh` on the oracle (280 runs, 0 failures); no port defect; three U-nested arms newly reached (`plans/layered-crossing-min-tests/coverage.md`) |

**Coverage.** Replay-alone coverage of the 7b packages before the site rows (T9): 88.75 / 76.59 / 81.86 % (statements
/ branches / functions); 216 untaken branches, of which 51 are the enum's throwing arms, 43 need label dummies (7f) and
20 are dead by construction or unused in the Java (`unreached.md`). After the site rows and the anchored cases, every 7b class is at 100 % branches with the generic replay and its directory's tests except those whose remainder is Java-unreachable or 7f-bound: `SCCModelOrderCycleBreaker` 16.7 (the base `findNodes`/`findMaximum`, overridden by both subclasses), `DFSNodeOrderCycleBreaker` 95.0 and `DepthFirstCycleBreaker` 92.9 (the `dfs` entry guard), `SCCNodeTypeCycleBreaker` 92.3 and `SCConnectivity` 94.4 (singleton components never stored by `Tarjan`), `BreadthFirstModelOrderLayerer` 89.3 and `DepthFirstModelOrderLayerer` 92.2 (label dummies), `CoffmanGrahamLayerer` 94.6 (two dead comparator arms), `NetworkSimplexLayerer` 93.8 (instance reuse), `EdgeAndLayerConstraintEdgeReverser` 93.8, `HighDegreeNodeLayeringProcessor` 98.1, `LayerConstraintPreprocessor` 97.3, `LayerConstraintPostprocessor` 74.3 and `NodePromotionModelOrder` 75.0 (label dummies). Whole-suite coverage after batch 6: 99.18 / 97.11 / 98.99 / 99.19 (lines / branches / functions / statements).

**Divergences found and fixed at origin (all caught by oracle rows).** The replay helper applied a row's options to the
root instead of the imported level (22 non-root rows, T8); value equality at `NodePromotion.java:541` (eight rows never
terminated) and `Tarjan.java:86` (three sweep cases on models with more than 127 nodes): E2a above; the 7a
`Tarjan.test.ts` twin carried the same mistranslation and was re-anchored.

### 8.6 Runbook {#part-b-runbook}

```bash
tools/vectors/layered-phase-vectors.sh test/golden/refs/java     # layered-phases.json; byte-stable, cached by salted input hash
git status --short test/golden/refs/java                         # must show nothing for a same-JDK re-record
tools/oracle/phase-sweep.sh [--force]                            # test/corpus/.phase-sweep/results.jsonl (8–9 min, gitignored)
PHASE_SWEEP_STRIDE=1 npx vitest run test/corpus/phase-sweep.test.ts   # every ok case (≈8 min; stride 2 ≈4 min)
java -cp <classpath> tools/vectors/LayeredPhaseVectors.java --dump <case id> $ELK_MODELS_DIR <outDir>   # one full row for a mismatch
```

The recorder runs the JVM with `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2` so that identity-hashed `HashSet`s
iterate in insertion order (AD-10) — true only up to ten entries, hence the BFS source guard. Reading a refused row:
`ACCEPTED_REFUSALS` in the recorder names the two model/target/processor combinations whose prefix leaves the 7b set;
a new refusal is stop 5 of the mission brief, not a row to drop.

| Failure                                      | Detection                                                                         | Fix                                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TDZ after wiring a strategy or processor arm | `Cannot access 'X' before initialization` when a layered module is imported first | a module-level read of an enum or phase class: make it lazy (8.4) and probe `import()` of every enum and the metadata provider; never add an entry-order import to a test                            |
| A phase or processor never terminates        | a replay row or sweep case times out                                              | first check the Java: `StretchWidthLayerer` hangs on zero-height nodes and on self-loops, the SCC breakers stall past id 127 — faithful; a port-only hang is an `Integer ==` or `HashSet` order site |
| Replay mismatch on a non-root level          | model-order strategies throw or reverse nothing on `N*` targets                   | the options belong on the imported node, not the root (`LayeredPhaseVectors.java:1299`)                                                                                                              |

## 9. Part c: crossing minimization (mission 7c) {#part-c}

Mission 7c (`layered-crossing-min`, roadmap row 7c) ported the third phase and the processors a default pipeline runs
between P2 and P3. Decisions cited are `plans/layered-crossing-min/decisions.md` (C1–C13); task ids T1–T13 are in that
mission's `decision-journal.md`. The pipeline still does not run (`ElkLayered`, `GraphConfigurator` → 7f): every
class is proven by replaying what the oracle's pipeline recorded at the P3 stop, as in § 8.

### 9.1 Package map {#part-c-package-map}

| Java package                 | TS directory                 | Ported in 7c (task)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `p3order`                    | `p3order`                    | all 16: `LayerSweepCrossingMinimizer` (+ `…State`, `…Sweep`, `…Hierarchical`, `…Counting`, `…SweepHelpers` sections, M15 `…CrossMinType`), `GraphInfoHolder`, `LayerSweepTypeDecider` (+ M15 `…NodeInfo`), `SweepCopy`, `BarycenterHeuristic` (+ M15 `…BarycenterState`), `ModelOrderBarycenterHeuristic` (+ `…InsertionSort` section), `MedianHeuristic`, `ForsterConstraintResolver` (+ M15 `…ConstraintGroup`), `AbstractBarycenterPortDistributor`, `LayerTotalPortDistributor`, `NodeRelativePortDistributor`, `GreedyPortDistributor`, `ISweepPortDistributor`, `ICrossingMinimizationHeuristic`, `InteractiveCrossingMinimizer`, `NoCrossingMinimizer` (T6, T7); the four `CrossingMinimizationStrategy` arms create them (T7) |
| `p3order.counting`           | `p3order/counting`           | all 6: `CrossingsCounter` (+ `…State`, `…Convenience`, `…NorthSouth` sections), `HyperedgeCrossingsCounter` (+ M15 `…Hyperedge`, `…HyperedgeCorner`, `…HyperedgeCornerType`), `AllCrossingsCounter`, `BinaryIndexedTree`, `CrossMinUtil`, `IInitializable` (T5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `intermediate`               | `intermediate`               | the eight processors of C2 — `PortSideProcessor`, `PortListSorter`, `LongEdgeSplitter`, `InvertedPortProcessor` (T4a), `NorthSouthPortPreprocessor` (+ `…PortSorting`, `…Dummies` sections), `HierarchicalPortConstraintProcessor` (+ M15 `…NodeComparator`), `SemiInteractiveCrossMinProcessor`, `SortByInputModelProcessor` (T4b) — and their ten `IntermediateProcessorStrategy` arms incl. `ONE_SIDED_GREEDY_SWITCH`/`TWO_SIDED_GREEDY_SWITCH` (T8; tally now 7b 10 / 7c 10 / 7g 9 / 7f 30)                                                                                                                                                                                                                                       |
| `intermediate.greedyswitch`  | `intermediate/greedyswitch`  | all 5: `GreedySwitchHeuristic`, `SwitchDecider` (+ M15 `…CrossingCountSide`), `CrossingMatrixFiller`, `BetweenLayerEdgeTwoNodeCrossingsCounter` (+ M15 `…AdjacencyList`, `…AdjacencyListAdjacency`), `NorthSouthEdgeNeighbouringNodeCrossingsCounter` (T7)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `intermediate.preserveorder` | `intermediate/preserveorder` | all 3: `ModelOrderNodeComparator` (+ `…State`, `…Associations`, `…HelperDummies`, `…PreviousLayer` sections), `ModelOrderPortComparator` (+ `…State`, `…Associations`, `…Incoming`, `…Outgoing`, `…PortSideComparator` sections), `CMGroupModelOrderCalculator` (T5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Why the eight processors (C2): an order recorded by the oracle at the P3 stop is the result of every processor the
configuration ran after P2, so the set a 7c replay needs is what P3 declares (`PortListSorter`, `LongEdgeSplitter`),
what runs always (`PortSideProcessor`) and what the graph properties or options add (`InvertedPortProcessor`,
`NorthSouthPortPreprocessor`, `HierarchicalPortConstraintProcessor`, `SemiInteractiveCrossMinProcessor`,
`SortByInputModelProcessor`). The recorder refuses a prefix naming `LABEL_DUMMY_INSERTER`, `COMMENT_PREPROCESSOR`,
`DIRECTION_PREPROCESSOR` (7f), `SELF_LOOP_PREPROCESSOR` or `BREAKING_POINT_INSERTER` (7g); the accepted refusals are
listed in the recorder. Section files (`…State`, `…Sweep`, …) and M15 files hold the Java class's own members and
nested types split at Java method boundaries for the 500-line and complexity limits; nothing is reordered.

### 9.2 Rows and the order dump (C3) {#part-c-rows}

`test/golden/refs/java/layered-order.json` (recorder `tools/vectors/LayeredOrderVectors.java`, launcher
`tools/vectors/layered-order-vectors.sh`; core copied from the 7b recorder with the origin cited, B7) has the 7b row
shape with one more member, `ports: { <node path>: [<port path>] }`, the port list of every node after the stop (the
order the sweep writes back, `SweepCopy.java:93-141`):

- `models/*` (657): the nine ptolemy models at every hierarchy level and the 24 inputs vendored for this mission
  (`tests/layered/north_south_ports/*`, `tests/layered/preserve_order/*`, two ticket-528 models), run through the real
  Java pipeline to a P3 strategy (`LAYER_SWEEP` × greedy-switch type × thoroughness, `MEDIAN_LAYER_SWEEP`,
  `INTERACTIVE`, `NONE`), to a greedy-switch processor or to one of the eight processors; the `prefix` is recorded
  and replayed by name (`test/helpers/layered-order-replay-ops.ts`, 7b's prefix replay with P3 accepted).
- `scenarios/*` (89) and `sites/*` (62): step rows of the recorder's interpreter (the 7b ops; in-layer successor
  constraints as `{ref}` lists): the Java tests' hand-built graphs and the T9 branch scenarios. Rows under ten nodes
  carry the full 7a dump.
- Every hierarchy level is a flat `LGraph` (per-level `target`); the nested-graph paths of the sweep driver
  (`GraphInfoHolder` children, `sweepInHierarchicalNodes`, the hierarchical greedy switch, `LayerSweepTypeDecider` past
  the root) are U until 7h's nested rows. `edges` also lists baseline edges a processor detached (null ends): the
  same-side self-loop dummies of `NorthSouthPortPreprocessor.java:652-653` are the first such case.

### 9.3 The sweep driver and randomness (C4) {#part-c-sweep}

`LayerSweepCrossingMinimizer` keeps the Java structure: `initialize` builds one `GraphInfoHolder` per graph (child
holders are U), `LayerSweepTypeDecider` picks bottom-up or hierarchical sweeping, `compareDifferentRandomizedLayouts`
runs the thoroughness loop over `SweepCopy` snapshots and `countCurrentNumberOfCrossings` sums a graph's crossings
with its swept children (kept recursive: it recurses over child holders, bounded by hierarchy depth, C7). Everything
random draws from `InternalProperties.RANDOM` through the JVM-exact `Random` shim: `BarycenterHeuristic`'s per-node
jitter, the thoroughness loop (re-seeded from the graph's first `nextLong()`, so seed 1 gives a `LayerTotalPortDistributor`
and a backward first sweep, seed 2 a `NodeRelativePortDistributor`) and `ISweepPortDistributor.create`. `normalise`
seeds every row with 1 unless the row sets `randomSeed`; seed 0 is a stop. Under the recorder's `-XX:hashCode=2` the
identity-hash tie-breaks of `HyperedgeCrossingsCounter`'s hyperedge and corner comparators are constant, so the port
returns 0 there (AD-10, journaled with the Java lines).

### 9.4 Java idioms the port had to reproduce {#part-c-idioms}

- **Class-initialisation laziness (E1 as C5).** `CrossingMinimizationStrategy` joined melk `NON_LEAF_DEFAULT_TYPES`
  before any arm was wired (T2), every phase class's `*_PROCESSING_CONFIGURATION` is a cached static getter, and the
  entry-point fitness test (`test/architecture/layered-entry-points.fitness.test.ts`) imports each strategy enum and
  the metadata provider first in a fresh process. Wiring the four P3 arms and the ten processor arms needed no further
  lazy read.
- **Boxed and float comparisons (E2a as C6).** `ModelOrderBarycenterHeuristic.java:90-91` compares the boxed
  `CROSSING_MINIMIZATION_ID` by reference: `JavaInteger.sameValueOfBox` (the option is an `int` property, explicit
  values are fresh boxes). `ForsterConstraintResolver.java:259-262` compares `floatValue()`s: `Float32.fromDouble` on
  both sides, so a 1e-10 double difference ties as in Java. `PortListSorter.java`'s `index1 - index2` wraps through
  `Int32.sub`.
- **Unmodifiable list defaults (C13, found by T4b's rows).** `MapPropertyHolder.getProperty` stores a default only
  when it is `Cloneable`; an Xtend `#[…]` default (`considerModelOrder.groupModelOrder.cmEnforcedGroupOrders`) is an
  unmodifiable list, which a JS array is not. The melk emitter now freezes list-literal defaults and
  `ElkReflect.isCloneable` is false for frozen objects, so the TS `changed` list matches the oracle's.
- **Recursion (C7).** `BarycenterHeuristic.calculateBarycenter` is an explicit-stack loop proven against a verbatim
  twin on the rows and a 5,000-node chain under `--pool=forks --execArgv=--jitless`; the resolver, distributor and
  processor candidates are overloads, not recursion.
- **Guava views (C8, C9).** `CrossingsCounter.java:337,354` build a `TreeSet` and copy it: `Sets.newTreeSet(elements,
comparator)` over the same insertion sequence. `GreedyPortDistributor.java:80,123-128` sets ports through
  `Lists.reverse(node.getPortSideView(side))`: the reversed view writes through the 7a port-side proxy (proven by a
  case that reaches `getPorts()`).
- **Dead by construction, reproduced.** `FIRST_TRY_WITH_INITIAL_ORDER` and `SECOND_TRY_WITH_INITIAL_ORDER` share one
  property id (`LayerSweepCrossingMinimizer.java:257-259`), so the second block never runs; the force and non-force
  arms of the two barycenter heuristics are chosen by `GraphInfoHolder`; `fillInUnknownBarycenters` runs before the
  null-barycenter comparator arms.

### 9.5 Evidence {#part-c-evidence}

| Layer                        | What                                                                                                                                                                                                                                                                                                                         | Replay / test                                                                                                                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Order rows (T1, T11)         | `layered-order.json`, 808 rows (`models` 657, `scenarios` 89, `sites` 62), 3,761,948 bytes, JDK 21.0.1, oracle `8aaa3c14`, byte-stable; every class also proven on its own rows with the class injected (T4a–T7)                                                                                                             | `src/alg/layered/LayeredOrderVectors.test.ts` replays all 808 by name in about 4.5 s (T8); the eight processor tests and the P3 tests replay their rows through their own factories                                                                                                 |
| Ported JUnit invariants (T8) | `BasicCrossingMinimizationTest`, `ForsterConstraintResolverTest`, `ModelOrderBarycenterHeuristicTest`, `PortListSorterTest`, `LongEdgeSplitterTest`, `InvertedPortProcessorTest`, `PortSideProcessorTest`, `NorthSouthPortPreprocessorTest`, `SortByInputModelProcessorTest`, `BasicConsiderModelOrderTest`, bodies verbatim | over the replayed rows of the Java tests' configurations; `PortListSorterTest.testMonotonicalCoordinates` needs P4/P5 (7f); `SortByInputModelProcessorTest` runs on two label-free graphs authored in the test (the `preserve_order` models are refused, C2)                        |
| Breadth sweep (T10, B6)      | `tools/oracle/order-sweep.sh`: 6,728 oracle cases at the P3 stop over the 1,682 edge-bearing levels of the 550 ptolemy models, once per strategy (6,280 ok, 448 refused — all `SELF_LOOP_PREPROCESSOR` —, 0 throws, 0 timeouts), one canonical-dump SHA-256 each, gitignored                                                 | `test/corpus/order-sweep.test.ts`: 3,140 cases at stride 2 in 48 s (all 6,280 with `ORDER_SWEEP_STRIDE=1`, 89 s), 0 mismatches                                                                                                                                                      |
| Anchored unit tests (T12a–c) | one colocated case per S item of `plans/layered-crossing-min/unreached.md` (with its T11 corrections), `// oracle: <row id>; <Java file:line>`                                                                                                                                                                               | 88 row cases over 32 files (p3order and counting 29, greedy switch and preserve order 39, the eight processors 20) plus six structural cases (`Integer.compare` arms, the Java NPE sites as `TypeError`, side ordinals); every S row of the map is cited, the U list stays untested |

**Coverage.** Replay-alone coverage of the 7c classes before the site rows (T9): 81.91 / 73.94 / 85.08 % (statements
/ branches / functions); 388 untaken branches classified once each: 209 S (24 scenarios), 27 J, 152 U (89 need nested
graphs, 7h; 3 need label dummies, 7f; 60 dead by construction). After the 62 site rows: 85.09 % branches
(1,267/1,489), 88.47 % functions; of the 47 S arms no row reaches, 25 are dead by construction (Java line each), 2 are
`TypeError` sites and 20 have a named mechanism with the scans that failed to reach them (`unreached.md` § T11
corrections). After the anchored cases, per-directory branch coverage with the generic replay is p3order 96.85 %, greedy switch and preserve order 92.6 %, the eight processors 93.61 %; every class is at or above 90 % except eight whose remainder is nested-graph, label-dummy, dead or unreached: `MedianHeuristic` 73.1, `SwitchDecider` 77.6, `NorthSouthPortPreprocessorDummies` 80.8, `ModelOrderNodeComparatorHelperDummies` 83.3, `PortSideProcessor` 87.5, `ModelOrderPortComparatorIncoming` 88.2, `LongEdgeSplitter` 88.9, `SortByInputModelProcessor` 89.3 (`unreached.md` § T12 corrections). Whole-suite coverage after batch 8: 99.01 / 96.96 / 99.03 / 99.01 (lines / branches / functions / statements).

**Divergences found and fixed at origin (all caught by oracle rows).** The stored list default above (C13, 25
`SortByInputModelProcessor` rows). Two replay-helper gaps, not port defects: the order dump omitted detached baseline
edges (one site row), and `{class:"java.util.HashMap"}` dumps are compared as `Map` twins in `compareOrder`
(`JAVA_CLASS_TWINS`) after an agent had shaped a production `HashMap` to the test convention (rejected).

### 9.6 Runbook {#part-c-runbook}

```bash
tools/vectors/layered-order-vectors.sh test/golden/refs/java       # layered-order.json; byte-stable, cached by salted input hash
git status --short test/golden/refs/java                           # must show nothing for a same-JDK re-record
tools/oracle/order-sweep.sh [--force]                              # test/corpus/.order-sweep/results.jsonl (≈40 s JVM, gitignored)
ORDER_SWEEP_STRIDE=1 npx vitest run test/corpus/order-sweep.test.ts   # every ok case (≈90 s; stride 2 ≈50 s)
java -cp <classpath> tools/vectors/LayeredOrderVectors.java --dump <case id> $ELK_MODELS_DIR <outDir>   # one full row for a mismatch
bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p3order.BarycenterHeuristicTest …   # JUnit 4 on the oracle: one line per class, runs= failures= (≈0.5 s each)
```

The recorder is one JDK 21 single-file launcher of at most 3,000 lines (stop 13; the `sites` group is a compact
`id|root|nodes|edges|steps` table with macros) and runs with `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2` as the
7b one does.

| Failure                                    | Detection                                                                                        | Fix                                                                                                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changed g0` lists an option the row lacks | a replay diff naming a list-valued option on the root after a `getProperty` of it                | the melk default is cloneable on the TS side only: a list literal must come out of the emitter frozen (C13); never store the default by hand                                                                                                                               |
| `edges <path>: missing`                    | a processor set an edge's ends to null (same-side self loops)                                    | the 7c `orderDump` lists baseline edges not met; the 7b `phaseDump` alone does not                                                                                                                                                                                         |
| Full-dump mismatch on a `HashMap` property | `targetNode.modelOrder` under a hand-placed layering with `SORT_BY_INPUT_ORDER_OF_MODEL`         | `compareOrderFullDump` applies no class twins: record such rows without a hand-placed layering, or extend the twin map (follow-up in the roadmap)                                                                                                                          |
| Randomized sweep differs by seed           | a row's `layers` match only for another `randomSeed`                                             | the first sweep randomizes every barycenter and re-seeds from the graph's `Random`: scan seeds on the port before suspecting the sweep (`Median/forwardFirst` needed seed 4)                                                                                               |
| Greedy port distributor never runs         | `GreedyPortDistributor.ts` arms stay untaken under `p3:LAYER_SWEEP` + `greedySwitch.type`        | only the `TWO_SIDED_GREEDY_SWITCH` `CrossMinType` gets it (`ISweepPortDistributor.create`); run the greedy-switch processor after `p3:NONE`                                                                                                                                |
| `java-tests.sh` exits before any class     | `error: bundle <bsn> not in p2 cache …`, `test bundle classes missing`, or `oracle built from …` | the classpath needs the oracle jars, both test bundles' `target/classes`, the p2 bundles of its `THIRD_PARTY` list (log4j 1.2 and `org.eclipse.equinox.common` included) and junit 4.13.2 from `~/.m2`; rebuild with `tools/oracle/build.sh` or set `P2_BUNDLES`/`M2_REPO` |

## 10. Part d: node placement (mission 7d) {#part-d}

Mission 7d (`layered-node-placement`, roadmap row 7d) ported the fourth phase (`p4nodes`, `p4nodes.bk`) and the five
processors a P4 stop needs. This file is at its 500-line limit, so part d lives in the sibling
[alg-layered-placement.md](alg-layered-placement.md) (package map, geometry rows, recursion rewrites, idioms,
evidence, runbook).
