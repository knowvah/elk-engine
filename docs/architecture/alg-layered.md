<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.layered, part a: the framework (mission 7a)

What mission 7a (`layered-framework`, roadmap row 7a) ported of `org.eclipse.elk.alg.layered`, how the LGraph model
and the ElkGraph ↔ LGraph transform are laid out, how a **staged class** (a forward reference a later sub-mission
completes) is marked, listed and replaced, how layered registers its metadata, the evidence, and a runbook. Decisions
cited are `plans/layered-framework/decisions.md` (L1–L7, S1–S4, X1–X6); task ids (T1–T12) are in that mission's
`decision-journal.md`; AD-n are `plans/elk-engine-skeleton/decisions.md`, M-n `plans/core-engine/decisions.md`, P-n
`plans/alg-common/decisions.md`. Nothing here is exported from `src/index.ts` (AD-14), and no layout runs yet: the
algorithm classes land in 7b–7h. Counts of oracle rows live in [conformance.md](../conformance.md#alg-layered-framework).

| Section                                   | Answers                                                              |
| ----------------------------------------- | -------------------------------------------------------------------- |
| [1. Package map](#package-map)            | What 7a ported, where it lives, what is staged                       |
| [2. LGraph model](#lgraph-model)          | The 13 graph classes and the Java idioms they keep                   |
| [3. Transform](#transform)                | Importer and transferrer sections, hash sites, quirks kept           |
| [4. Staged classes (L1)](#staged-classes) | Marker, registry, fitness test, how a mission replaces a staged file |
| [5. Options and registration](#options)   | Generated `LayeredOptions`, `Spacings`, L5 registration              |
| [6. Evidence](#evidence)                  | The three replays, the site rows, coverage                           |
| [7. Runbook](#runbook)                    | Re-recording, regenerating, reading a staged throw                   |

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
