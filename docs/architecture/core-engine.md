<!-- SPDX-License-Identifier: EPL-2.0 -->

# Core engine and the simple providers (missions 5a and 5b)

What mission 5a (`core-engine`, roadmap row 5, first half) ported, how a layout runs, and how to regenerate and
check the evidence. Section 7 covers mission 5b (`core-remainder`, row 5b), which completed the `core` bundle. Decisions cited are `plans/core-engine/decisions.md` (M1-M17); task ids (T1-T20) are in
`plans/core-engine/decision-journal.md`. AD-n are `plans/elk-engine-skeleton/decisions.md`, C-n are
`plans/core-metadata/decisions.md`. Nothing here is exported from `src/index.ts` (AD-14). Corpus counts live in
[conformance.md](../conformance.md#core-layouts-fixed-box-random), not here.

| Section                                        | Answers                                                        |
| ---------------------------------------------- | -------------------------------------------------------------- |
| [1. What 5a ported](#what-5a-ported)           | Classes and where they live, by task                           |
| [2. Engine flow](#engine-flow)                 | What `layout(root, monitor)` does, per hierarchy level         |
| [3. Decisions](#decisions)                     | M1-M17, one line each                                          |
| [4. Codegen un-hold](#codegen-un-hold)         | How `PENDING_TYPES` was emptied and what broke on the way      |
| [5. Evidence](#evidence)                       | Golden sets, regeneration, ported tests, corpus comparison     |
| [6. Deferrals and upstream quirks](#deferrals) | What waits for 7a and 7h; behaviour kept verbatim from Java    |
| [7. Mission 5b](#mission-5b)                   | Processor pipeline, configurator, ElkMath, comments, JDK shims |

## 1. What 5a ported {#what-5a-ported}

| Area                   | TS files (under `src/core/`)                                                                                                                                                                                    | Task              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Exceptions, factory    | `util/AlgorithmFactory`, `UnsupportedConfigurationException`, `UnsupportedGraphException`, `validation/GraphValidationException`, `ITopdownLayoutProvider`, `testing/IWhiteBoxTestable`, `alg/ILayoutProcessor` | T1                |
| Test hooks             | `testing/TestController`                                                                                                                                                                                        | T7                |
| Progress monitors      | `util/BasicProgressMonitor`, `util/NullElkProgressMonitor`                                                                                                                                                      | T2                |
| `ElkUtil` (sections)   | `util/ElkUtil` composing `ElkUtil{Ports,Sizing,Junctions,Labels}` (T3) and `ElkUtil{Coordinates,Defaults,Visitors}` (T6)                                                                                        | T3, T6            |
| `ElkRectangle`         | `math/ElkRectangle` (pulled in from 5b)                                                                                                                                                                         | T3                |
| Fixed provider         | `util/FixedLayoutProvider`                                                                                                                                                                                      | T8                |
| Algorithm resolver     | `data/LayoutAlgorithmResolver`                                                                                                                                                                                  | T9                |
| Random provider        | `util/RandomLayoutProvider`                                                                                                                                                                                     | T10               |
| Validator              | `validation/GraphValidator`                                                                                                                                                                                     | T11               |
| Box provider           | `util/BoxLayoutProvider`, `BoxLayoutProviderGroup`, `BoxLayoutProviderGrouping`                                                                                                                                 | T12, T13          |
| Topdown size           | `options/TopdownSizeApproximator`, `options/TopdownSizeApproximatorUtil`                                                                                                                                        | T14               |
| Engine                 | `RecursiveGraphLayoutEngine`, `RecursiveGraphLayoutEngineTopdown`                                                                                                                                               | T16               |
| Generated option files | `options/{Fixed,Box,Random}LayouterOptions`, regenerated `options/CoreOptions`                                                                                                                                  | T8, T10, T12, T14 |

Other task outcomes:

- T4 vendored the golden inputs and produced the nine algorithm goldens (section 5).
- T5 changed `Property.test.ts` to start from `LayoutMetaDataService.getInstance()` as Java's `@BeforeClass` does (M8).
- T15 retired the graph.text stand-ins: the eleven `@deferred mission5` validate rows replay against the real
  registry, and `test/helpers/mission5-stand-ins.ts` is gone (M7, M9).
- T17 compared the nine goldens and ported `Issue457Test` and `Issue489Test` (M6).
- T18 ported the JSON and content-assist tests that waited for mission 5 (section 5).
- T19 produced the corpus comparison (section 5); T20 is this document.

`src/core/util/ElkUtil.ts` stays the only import point for callers; sections import sections only (M10, T6).
`BoxLayoutProvider` and the engine are split at Java method boundaries for the 500-line cap (M15, M17).

## 2. Engine flow {#engine-flow}

`RecursiveGraphLayoutEngine.layout` (T16) first normalises options, then resolves one algorithm per node, then
recurses; each level fetches a provider from the algorithm's `InstancePool`, runs it, and releases it. The Java
method `layoutRecursively` is split into `layoutContent`, `layoutIncludedChildren`, `layoutSeparateChildren`,
`layoutOwnContent` and a `layoutTopdown` delegate into `RecursiveGraphLayoutEngineTopdown.ts` (T16, M17).

```plantuml
@startuml
participant "Caller / test harness" as caller
participant RecursiveGraphLayoutEngine as engine
participant LayoutAlgorithmResolver as resolver
participant "LayoutAlgorithmData\n(InstancePool)" as data
participant "Fixed/Box/Random\nLayoutProvider" as provider
participant BasicProgressMonitor as monitor
caller -> engine : layout(root, monitor) (T16)
engine -> engine : ElkUtil.applyVisitors(root,\n  DeprecatedLayoutOptionReplacer)
engine -> resolver : ElkUtil.applyVisitors(root, resolver)\n(only if RESOLVED_ALGORITHM is unset) (T9)
resolver --> engine : RESOLVED_ALGORITHM on every node
engine -> engine : layoutRecursively(node, testController, monitor)
engine -> data : getInstancePool().fetch()
data --> engine : provider instance
engine -> provider : layout(node, monitor.subTask(work)) (T8, T10, T12-T13)
provider -> monitor : begin / done (T2)
provider --> engine : coordinates written to ElkGraph
engine -> data : getInstancePool().release(provider)
engine --> caller : laid-out ElkGraph
@enduml
```

Facts a harness must know (T16, journal):

- A pre-set `RESOLVED_ALGORITHM` on the root skips the resolver for the whole graph; unresolved descendants then
  throw "Resolved algorithm is not set". Resolve every level or none.
- The topdown size pre-computation fetches pool instances it never releases (`RecursiveGraphLayoutEngine.java:245`,
  `:253`); both kept.
- `BasicProgressMonitor.isCanceled()` is always `false`; cancellation tests need a subclass (T2, T16).
- `instanceof ITopdownLayoutProvider` becomes a structural `getPredictedGraphSize` check (T16).
- Null `Double` unboxing (`CHILD_AREA_WIDTH/HEIGHT`) throws `TypeError` where Java throws `NullPointerException` (T16).

Registry view: `CoreOptions.apply` ends with `new {Fixed,Box,Random}LayouterOptions().apply(registry)` exactly as
Java does, so a plain `LayoutMetaDataService.getInstance()` lists `fixed`, `box` and `random` (M7, T8, T10, T12). The
three have no category, so the service also creates the backup category `''` (T8, M13).

## 3. Decisions {#decisions}

| ID  | Decision                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Roadmap row 5 splits: 5a `core-engine` (this document) and 5b `core-remainder`                                                         |
| M2  | `elkjs-exclude` blocks are dropped (C8 precedent); logs stay in memory; `getDebugFolder()` is `null`; `debugFolderPath` returns `null` |
| M3  | `BasicProgressMonitor` timing uses `performance.now()`; `getExecutionTime()` returns seconds as Java computes them; no clock API       |
| M4  | Curated fixed/box/random goldens (nine) in `test/golden/algorithms.json`, inputs vendored to `test/golden/inputs/`                     |
| M5  | A local, uncommitted comparison of 898 retarget cases per algorithm; counts go to `docs/conformance.md`                                |
| M6  | `testEmptyAlgorithmId` waits for 7a; Issue 457/489 ported with a vitest harness; spacing/alg/spline tests go to 5b                     |
| M7  | Registry growth: replay vectors first; regenerate only by script when traced to registry state; else AD-13 STOP                        |
| M8  | `Property.test.ts` mirrors become `LayoutMetaDataService.getInstance()` (as Java `@BeforeClass`)                                       |
| M9  | Tripwire tests built to fail at mission 5 are flipped by the task that registers each algorithm                                        |
| M10 | `ElkUtil` is split into section modules (C3-amendment precedent)                                                                       |
| M11 | `math/ElkRectangle` moves from 5b into 5a with the two `PortAdapter` overloads of `ElkUtil`                                            |
| M12 | Algorithm `*Options` classes expose option constants as cached static getters (breaks the `CoreOptions` ESM cycle)                     |
| M13 | Stub-registry tests in `src/core/data` become registry-independent                                                                     |
| M14 | Stub algorithm ids must not share a suffix with a core algorithm (`fixed`, `box`, `random`)                                            |
| M15 | `BoxLayoutProvider` splits into provider, `BoxLayoutProviderGroup.ts` and `BoxLayoutProviderGrouping.ts`                               |
| M16 | Generated `*_DEP_*` constants become cached private static getters in every option file                                                |
| M17 | The engine's topdown section moves to `RecursiveGraphLayoutEngineTopdown.ts`; tests split likewise                                     |

The M9 edits: each task that registered an algorithm edited the tripwires for that type only (T8 fixed, T10
random, T12 box, T14 the topdown dependency); the journal rows list every edited assertion.

## 4. Codegen un-hold {#codegen-un-hold}

`PENDING_TYPES` in `tools/melk/config.ts` is now `[]` (T14); nothing is held back. The procedure that was followed,
once per type, in the task that ported the type (M9):

1. Port the class; remove its entry from `PENDING_TYPES`.
2. `npm run melk:generate`; a new `*LayouterOptions.ts` appears and the comment in `CoreOptions.apply` becomes the call.
3. Run `npx vitest run test/melk src/core/data src/graph/json`; edit only the M9 tripwires, for that type.
4. Replay the vectors (M7): no row differed in T8, T10, T12 or T14, so nothing was regenerated.
5. Confirm `npm run melk:generate` is idempotent.

Two ESM cycles surfaced and were closed in the emitter: M12 (T8, entering through `CoreOptions` read an algorithm
class constant in its TDZ) and M16 (T14, entering through `TopdownSizeApproximator` evaluated a `*_DEP_*` constant
eagerly). Details, with the retired scaffolding, are in [melk-codegen.md](melk-codegen.md#lazy-constants).

## 5. Evidence {#evidence}

**Golden sets (M4, T4).** Two sets exist and are separate: the default set (`test/corpus/manifest.json` to
`test/golden/refs/elk`, frozen at 3-5 entries by `corpus.test.ts`) and the algorithms set
(`test/golden/algorithms.json` to `test/golden/refs/elk-algorithms`, with its own `_meta.json`). The algorithms set
holds nine goldens, three each for `fixed`, `box` and `random` (`random` uses the variant `random-seed-1` in
`test/corpus/variants.json`). Inputs are vendored under `test/golden/inputs/` with a sha check against the pinned
corpus. Both sets are byte-stable across regeneration (T4).

Regenerate by script only, never by hand (AD-5, AD-13); journal the regeneration with the patch ids from `_meta.json`:

```bash
tools/oracle/regen-goldens.sh                    # default set
tools/oracle/regen-goldens.sh --set algorithms   # fixed, box, random
git diff --exit-code test/golden/refs/           # empty when nothing meant to change
```

**Layout check (T17).** `test/golden/layout-goldens.test.ts` imports each vendored input, applies the overlay
(`test/helpers/graph-overlay.ts`, the port of `GraphOverlay.java`), lays it out with the engine and compares with
`compareLayout` (structure exact, numbers within 1e-6, AD-4). All nine equal the oracle on the first run, with no
engine or provider change (T17).

```plantuml
@startuml
participant "layout-goldens.test.ts\n/ ts-layout-compare.ts" as test
participant "ElkGraphJson\n(importer/exporter)" as json
participant "applyOverlay\n(test helper)" as overlay
participant RecursiveGraphLayoutEngine as engine
participant compareLayout as cmp
test -> json : import vendored input JSON (T17)
json --> test : ElkNode root
test -> overlay : variant, retarget algorithm
test -> engine : layout(root, new BasicProgressMonitor())
test -> json : export (oracle export flags)
test -> cmp : TS JSON vs oracle ref
cmp --> test : diffs (structure exact, numbers <= 1e-6)
@enduml
```

**Ported JUnit tests.**

| Java test                                                                                       | TS file                                                | Task   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------ |
| `RecursiveGraphLayoutEngineTest` (3 of 4 cases)                                                 | `src/core/RecursiveGraphLayoutEngine.test.ts`          | T16    |
| `GraphValidatorTest`                                                                            | `src/core/validation/GraphValidator.test.ts`           | T11    |
| `ElkUtilTest` cases for the ported sections                                                     | `src/core/util/ElkUtil*.test.ts`                       | T3, T6 |
| `Issue457Test`, `Issue489Test` (small, large)                                                   | `src/core/issues/Issue{457,489}Test.test.ts`           | T17    |
| `SectionsTest.preserveSectionIdsTest`, `TransferLayoutTest.transferLayoutEdgeSectionExistsTest` | `src/graph/json/{Sections,TransferLayout}Test.test.ts` | T18    |
| `LayoutDataContentAssistTest.testAlgorithmSpecificKnown/Unknown` (closes C10)                   | `src/core/data/LayoutDataContentAssist.test.ts`        | T18    |

**Corpus comparison (M5, T19).** `tools/corpus/ts-layout-compare.ts` lays out the 898 retarget inputs per algorithm
and compares them with a local oracle sweep. The sweep outputs are not committed (AD-5). The runbook, the counts and
the known divergences are in the conformance section
[Core layouts (fixed, box, random)](../conformance.md#core-layouts-fixed-box-random); see the conformance section for
counts. A mismatch with a named mechanism goes to the known-divergences list; an unnamed one is a stop (M5).

## 6. Deferrals and upstream quirks {#deferrals}

**Deferred, with owner.**

- `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId` (default resolves to layered): mission 7a, unchanged (M6; T16
  header).
- Mission 5b landed what this section once listed for it (the four `ElkMathTest` rectangle cases, `LayoutConfigurator`,
  the spacing, assembler and spline tests); see section 7.
- Mission 7h: `EdgeCoordsTest`, `exportLayoutOptions`, `importIndividualSpacingsTest` (T18).
- Showcase entries for the algorithm goldens are later docs work (M4).

**Dropped `elkjs-exclude` blocks (M2).** `BasicProgressMonitor` (22 markers), `ElkUtil` (4: the `debugFolderPath`
body, `toSafePathName`), `NullElkProgressMonitor` (2). Code inside the markers is dropped with a one-line comment
naming the Java lines; `toSafePathName` is not ported (T2, T6).

**Java behaviour kept verbatim (do not fix).**

- `TestController.removeLayoutExecutionListener` calls `listeners.add` (`TestController.java:180-182`, T7).
- `NullElkProgressMonitor.begin` returns `false` (`:37-39`, T2).
- `ElkUtil.determineJunctionPoints` re-checks the main edge inside the other-edge loop (`ElkUtil.java:537-541`, T3).
- `RandomLayoutProvider` treats every edge as a self-edge: target read from `getSources().get(0)` (`:167`), port parent
  x added twice (`:159-160`, `:175-176`), y offset uses `padding.getLeft()` (`:113`); the border branches `:198-237`
  are unreachable (T10).
- `FixedLayoutProvider.applyBendPoints` keeps the latent `remove()` bug (T8, M4); `RandomLayoutProvider` calls
  `remove()` without `next()` (`:189-191`) and throws `IllegalStateException` for edges with more than one
  section (T10).
- `BoxLayoutProvider` with one child: `areaStdDev` is `0/0`, NaN max row width, never wraps (T12); the default aspect
  ratio is the float `1.3` (T12).
- Oracle outputs bare `NaN` for most hierarchical fixed layouts of the ptolemy models (57 of 60 probed, T4); the
  comparison reads them (T19, see the conformance section).

## 7. Mission 5b: the rest of `core` {#mission-5b}

Mission 5b (`core-remainder`, roadmap row 5b) ported the remaining `org.eclipse.elk.core` classes, so the bundle is
complete except `core.util.persistence` (AD-11). Decisions cited are R1-R7 and P1-P9 in
`plans/core-remainder/decisions.md`; task ids (T1-T21) are in `plans/core-remainder/decision-journal.md`. Nothing is
exported from `src/index.ts` (AD-14).

| Area                | TS files                                                                                                                                             | Task         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Small util classes  | `util/{WrappedException,DefaultFactory,Triple,Quadruple,AbstractRandomListAccessor}`                                                                 | T1           |
| Processor pipeline  | `alg/{LayoutProcessorConfiguration,EnumBasedFactoryComparator,AlgorithmAssembler,ILayoutPhase,ILayoutPhaseFactory,ILayoutProcessorFactory}`          | T4, T6       |
| Configuration       | `LayoutConfigurator`, `util/ElkSpacings` (+ `ElkSpacingsAbstractSpacingsBuilder`, `ElkSpacingsElkCoreSpacingsBuilder`)                               | T5, T7       |
| `ElkMath` sections  | `math/ElkMath` facade over `ElkMath{Combinatorics,Aggregates,Geometry,Bezier}`; `BezierSpline`, `BezierSplineBezierCurve`, `CubicSplineInterpolator` | T3, T10, T11 |
| Adapters, selection | `util/adapters/ElkGraphAdapters` (+ nested adapter files), `util/selection/*`, `emf/common/util/{AbstractTreeIterator,TreeIterator}`                 | T17, T18     |
| Comments            | `comments/*`                                                                                                                                         | T13-T16, T19 |
| Property delegator  | `util/PropertyConstantsDelegator`                                                                                                                    | T20          |
| JDK shims           | `java/awt/geom/Rectangle2D`, `java/util/regex/{Pattern,WordBoundary}`, `java/lang/JavaCharacter`, `JavaString.equalsIgnoreCase`                      | T8, T9       |

### 7.1 Processor pipeline {#processor-pipeline}

This is the on-call note for missions 6 and 7: every algorithm bundle builds its pipeline with `AlgorithmAssembler`.

```plantuml
@startuml
participant "Algorithm bundle\n(e.g. LayeredLayoutProvider)" as alg
participant AlgorithmAssembler as asm
participant LayoutProcessorConfiguration as cfg
participant EnumBasedFactoryComparator as cmp
alg -> asm : create(PhaseEnum) (T6)
alg -> asm : setPhase(phase, factory)
alg -> asm : addProcessorConfiguration(cfg) (T4)
asm -> cfg : processorsBefore(p) / processorsAfter(p)
cfg --> asm : Set of factories (insertion order)
asm -> cmp : sort a copy of each slot (stable)
cmp --> asm : ordinal order
asm --> alg : build(graph) = ordered list of ILayoutProcessor
@enduml
```

Order rule, per slot:

- A slot is `processorsBefore(phase)` (index `phase.ordinal()`) or `processorsAfter(phase)` (index `ordinal() + 1`).
- `AlgorithmAssembler.retrieveProcessors` sorts a copy of the slot with the processor comparator, a stable sort like
  Java's `Stream.sorted`. The default comparator is `EnumBasedFactoryComparator`, which compares the enum
  constants' ordinals (the elkjs-exclude block `:40-47` is dropped, P3).
- The slot `Set` holds identity-hashed factories (`Sets.newHashSet`, AD-10), so Java's own iteration order is
  unspecified. The port keeps `Set` insertion order. That order is observable only between factories the comparator
  calls equal; if a bundle has such a pair, journal it (stop 11 of the mission).
- `create` takes the enum class side `{ values(): readonly P[] }` (P7), `configuredPhases` is the landed `EnumSet`,
  and `AlgorithmAssembler.cache` is a lookup-only `Map` keyed by factory identity.
- `LayoutProcessorConfiguration.clear()` is public here (package-private in Java); its JUnit case `testClear` is
  `@Ignore` in Java and `it.skip` here.

### 7.2 `LayoutConfigurator` and `ElkSpacings` {#configurator-spacings}

- `LayoutConfigurator` (T5) stores options per element (`elementOptionMap`, I28) and per class (`classOptionMap`, I29).
  Java `Class` keys are the `*Impl` constructors (`ElkNodeImpl`, `ElkPortImpl`, `ElkEdgeImpl`, `ElkLabelImpl`,
  `ElkShapeImpl`, `ElkConnectableShapeImpl`, `ElkGraphElementImpl`), because the ElkGraph interfaces have no runtime
  identity (AD-11). Overloads of `configure` and `getProperties` are told apart by `typeof === 'function'`.
- The `.elkt` harness (`test/helpers/elkt-layout-harness.ts`, T12) now builds a `LayoutConfigurator`, sets the
  algorithm through `configure(ElkNodeImpl)` and applies it with `ElkUtil.applyVisitors`, as Java's `TestAlgorithm`
  does. Both golden sets regenerate byte-identical.
- `ElkSpacings` (T7) is a facade class with statics and two builder files (M15 naming). `factorMap` is a
  `JavaHashMap` with the `PROPERTY` id strategy (V2). `BASE_SPACING_OPTION` and `DEPENDENT_SPACING_OPTIONS` are
  cached static getters (ESM cycle with `CoreOptions`, M12/M16). The `ELK_OPTION_TARGET_FILTER` quirk is in
  [conformance.md](../conformance.md#core-remainder-quirks): mission 7a's `LayeredSpacings` must not rely on it.

### 7.3 `ElkMath` sections {#elkmath-sections}

`math/ElkMath.ts` is a facade (namespace object plus named exports; `boundi` unchanged) over four section files
(P1): `ElkMathCombinatorics` (factorials, binomials), `ElkMathAggregates` (`max`, `min`, `average`, `bound`),
`ElkMathGeometry` (intersections, `contains`, `intersects`, distances) and `ElkMathBezier` (the Bezier helpers behind
`distanceFromBezierSegment`). Section files never import the facade. Every `*l` function takes and returns `bigint`
through `Int64` (R4); `maxl()` and `minl()` start from `Integer.MIN_VALUE`/`MAX_VALUE` as Java does. The full
`ElkMathTest` is ported, including its 4 rectangle cases. `BezierSpline` and `CubicSplineInterpolator` are ported with
their JUnit tests; the closed-spline coefficient swap (`even` selects `INTERP_COEF_ODD`) is kept.

### 7.4 Comments pipeline {#comments-pipeline}

`comments/*` has no Java tests, so the evidence is unit tests written from the Java and the oracle scenarios of
`comments.json` (R6).

- Interfaces with `default` methods (`IDataProvider`, `IBoundsProvider`, `IMatcher`, `IFilter`,
  `IExplicitAttachmentProvider`) are abstract classes with the Java names (R5). `IDecider` stays an interface.
- `CommentAttacher.attach` runs the filters, collects candidates through the matchers and decides through
  `AggregatedMatchDecider`. `ElkGraphDataProvider` and `ElkGraphBoundsProvider` adapt an ElkGraph.
  `NodeReferenceMatcher` builds `Pattern`s that find node names in comment text.
- Matcher results are keyed by matcher class: two matchers of one class overwrite each other. The recorded
  scenarios found that with explicit attachments and keep-heuristics off, `edgeify` drops every heuristic
  attachment.
- Replay: `test/helpers/comment-scenario-config.ts` builds an attacher from a scenario config; all 18 scenarios of
  `comments.json` replay equal as sorted `[commentId, targetId]` sets, and all 5,044 `regex.json` pattern strings and
  flags match.

### 7.5 JDK shims {#jdk-shims}

All are written from the Javadoc only and proven by new JVM vectors from `tools/vectors/CoreJdkVectors.java` (pure
JDK 21, no classpath), which now writes five files under `test/golden/refs/java/` (R7):

| File                  | Proves                                                                                      | Shim                                                     |
| --------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `awt.json`            | 2,842 rows over 21 rectangles (NaN, infinities, `-0`, negative sizes)                       | `java/awt/geom/Rectangle2D`                              |
| `regex.json`          | 5,044 rows: `\h`/`\v` members, quoting, non-ASCII case pairs                                | `java/util/regex/Pattern`                                |
| `character.json`      | all 65,536 units as ranges for the three predicates; BMP case maps; `equalsIgnoreCase` rows | `java/lang/JavaCharacter`, `JavaString.equalsIgnoreCase` |
| `regex-boundary.json` | JVM `\b` probes (BMP and supplementary), supplementary case maps                            | `java/util/regex/WordBoundary`, `JavaCharacter`          |
| `stream-sum.json`     | 1,035 rows for `Collectors.summingDouble`/`averagingDouble`                                 | `CommentAttacher` / `AggregatedMatchDecider` sum         |

`Pattern` supports exactly the grammar the comments code needs: `Pattern.quote` (`\Q...\E`, with `\E\\E\Q` escaping),
`\b`, and the class `[\h\v]*`, with the flags `CASE_INSENSITIVE` and `DOTALL`. Anything else throws
`UnsupportedOperationException`. ASCII letters become `[xX]` classes (JS `i` is never used) and `\b` is not JS `\b`.

Two user amendments to R2 during execution (journal rows of T9 and T16):

- JVM `\b` goes beyond its Javadoc: a combining mark after a word character counts as word, and `equalsIgnoreCase`
  is per code point, so BMP tables are not enough. `\b` is therefore implemented from the recorded table of
  `regex-boundary.json` (MARK 212 ranges, BASE 401, SUPPLEMENTARY_MARK 920 code points) and the supplementary case
  maps come from the same file; V8 tables are never used.
- The Javadoc leaves the `summingDouble`/`averagingDouble` scheme unspecified, so `stream-sum.json` pins it:
  compensated summation with a final `sum - c`, and a simple-sum fallback when the compensated result is NaN but the
  simple sum is infinite. The implementation was kept only because it reproduces every row.

### 7.6 Runbook: re-recording and JDK upgrades {#runbook-5b}

Re-record the pure-JDK vectors (writes `awt`, `regex`, `character`, `regex-boundary`, `stream-sum`):

```bash
java tools/vectors/CoreJdkVectors.java test/golden/refs/java
git status --short test/golden/refs/java    # must show nothing for a same-JDK re-record
```

Re-record the comment scenarios (needs the built oracle, Maven and the P2 bundles):

```bash
tools/vectors/comment-vectors.sh test/golden/refs/java
ELK_VECTORS_CACHE=off tools/vectors/comment-vectors.sh test/golden/refs/java   # cold, touches no cache
```

Both recorders must be byte-stable across two runs (stop 8). Adding a file under `tools/vectors/` changes the inputs
digest of `vector-cache.sh`, so the next `elkt`, `elkj` and `elkr` recorder runs are cold once.

When a JDK upgrade changes `character.json` (or `regex-boundary.json`):

1. Do not edit the shim, and do not loosen a test. The JDK's Unicode tables moved (JDK 21 is Unicode 15.0).
2. Confirm which ranges differ with `git diff` of the re-record against the committed file.
3. Journal it in the active `decision-journal.md` and add the differing code points to the known-divergences list in
   [conformance.md](../conformance.md), per AD-4 and AD-13.
4. Regenerate the committed vector only as a journaled decision with the user, never to get a test green.
