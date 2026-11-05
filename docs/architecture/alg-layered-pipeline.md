<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.layered, part f: the running pipeline (mission 7f)

What mission 7f (`layered-pipeline`, the first brief of roadmap row 7f) ported of `org.eclipse.elk.alg.layered`: the
driver (`ElkLayered`, `GraphConfigurator`), the connected-components package, the direction transformer, the
hierarchical-port router and three small processors. From here `LayeredLayoutProvider.layout` runs a whole layered
layout, except where a later mission's processor is planned (the table in § 7). This page covers how that is proven, the
Java idioms the port reproduces, the evidence and a runbook. Decisions cited are `plans/layered-pipeline/decisions.md`
(F1–F16 and the execution decisions FX1–FX8 the user took during the run); task ids T1–T17 are in that mission's
`decision-journal.md`; R-rows are 7e's, N-rows 7d's, C-rows 7c's, B/E-rows 7b's, L/S/X-rows 7a's, AD-n
`plans/elk-engine-skeleton/decisions.md`. Parts a–c are [alg-layered.md](alg-layered.md) §§ 1–9, part d
[alg-layered-placement.md](alg-layered-placement.md), part e [alg-layered-routing.md](alg-layered-routing.md). Counts live
in [conformance.md](../conformance.md#alg-layered-pipeline).

| Section                                        | Answers                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| [1. Package map](#part-f-package-map)          | What 7f ported, where it lives, the split of row 7f                           |
| [2. Rows and the bar](#part-f-rows)            | The `full`, `models`, `scenarios` and `sites` rows, the F4 check, pinned rows |
| [3. Re-replaying the landed rows](#part-f-sc4) | Every 7b–7e `models` row through the real driver                              |
| [4. The JUnit runner subset](#part-f-runner)   | `defineLayoutTest`, label metrics, the suite allocation                       |
| [5. Java idioms reproduced](#part-f-idioms)    | Mode pairing, explicit stacks, `float`, hashed containers                     |
| [6. Evidence](#part-f-evidence)                | Rows, suites, sweep, cross-check, anchored cases, coverage                    |
| [7. Runbook and failures](#part-f-runbook)     | Re-recording, the sweep, the Java suites, what still throws                   |

## 1. Package map {#part-f-package-map}

| Java                                                                         | TS                                                                                                                                                                                                                                                                                                              | Task |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `ElkLayered`                                                                 | `ElkLayered.ts` (+ `ElkLayeredHierarchy.ts`, `ElkLayeredResize.ts` sections; the M15 `ElkLayeredTestExecutionState.ts` landed in 7a)                                                                                                                                                                            | T8   |
| `GraphConfigurator`                                                          | `GraphConfigurator.ts` (three cached static configuration getters, F10)                                                                                                                                                                                                                                         | T8   |
| `components.*` except `ComponentsCompactor`                                  | `components/`: `AbstractGraphPlacer`, `SimpleRowGraphPlacer`, `ComponentGroup`, `ComponentGroupGraphPlacer`, `ModelOrderComponentGroup`, `ComponentGroupModelOrderGraphPlacer`, `ModelOrderRowGraphPlacer`, `ComponentsProcessor`; lookup tables in `ComponentGroupSides.ts` and two `…ConstraintRows.ts` files | T4   |
| `intermediate.GraphTransformer`                                              | `intermediate/GraphTransformer.ts` + `…Mode`, `…MirrorX`, `…MirrorY`, `…Transpose`, `…Support`                                                                                                                                                                                                                  | T5   |
| `intermediate.HierarchicalPortOrthogonalEdgeRouter`                          | `intermediate/HierarchicalPortOrthogonalEdgeRouter.ts` + `…Restore`, `…Coordinates`, `…Routing`, `…Removal`, `…Fix`                                                                                                                                                                                             | T6   |
| `intermediate.{EndLabelSorter,HypernodesProcessor,ConstraintsPostprocessor}` | `intermediate/…` (+ M15 `EndLabelSorterLabelGroup.ts`)                                                                                                                                                                                                                                                          | T7   |
| stages (L1)                                                                  | `components/ComponentsCompactor.ts` (7g), `compound/CompoundGraph{Pre,Post}processor.ts` (7h)                                                                                                                                                                                                                   | T2   |

**The split of row 7f (F1).** Row 7f became two briefs: this one, and 7f2 `layered-labels` (the label family,
comments, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`, the debug utilities). `components` moved here
from 7h because `doLayout` calls `split` and `combine` on every layout; `HierarchicalNodeResizingProcessor` moved to 7h
because only `INCLUDE_CHILDREN` plans it. The processor enum's tally is 7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12, 7g 9,
7h 1; 37 arms are wired.

## 2. Rows and the bar (F3, F4) {#part-f-rows}

One recorder, `tools/vectors/LayeredPipelineVectors.java` (a JDK 21 single-file launcher, 3,651 lines, core copied from
7e's), writes one ref, `test/golden/refs/java/layered-pipeline.json` (9,182,521 bytes), with four groups:

- **`full`** (199): read a model, apply options, lay it out with `RecursiveGraphLayoutEngine`, export as `CaseRunner`
  does, plus the ordered plan of every hierarchy level. TS replays through the same engine and compares with
  `compareLayout` at AD-4 and the plans exactly. Plans are captured during the real run (`plansFromRun`): a laid-out
  child level fixes its compound node's ports, so the parent's plan gains `NON_FREE_PORTS` additions an untouched input
  lacks.
- **`models`** (905) and **`scenarios`** (93): 7e's stop rows through `ElkLayered.prepareLayoutTest` and
  `runLayoutTestStep`, with plan equality against the row's `prefix`. Component rows use the step ops `componentsSplit`
  and `componentsCombine`.
- **`sites`** (42, T15): one step row per scenario of `plans/layered-pipeline/unreached.md`, with the ops `layout` and
  `layoutCancelled` for whole provider layouts.

**The F4 hash check.** The four manifest goldens (`refs/elk/ptolemy-*`) were recorded without `-XX:hashCode=2`; the
flagged recorder reproduces them byte for byte, so the flagged rows are trustworthy against them.

**Pinned rows (FX6, FX7).** All recorders refuse a row by its prefix, but `AlgorithmAssembler.build` instantiates the
whole plan before the first step, so a row whose later plan holds a staged arm throws at plan build. 58 `models` rows
of this ref and 2 landed `layered-phases.json` rows are listed in `test/helpers/layered-pipeline-pinned-rows.ts` and
asserted to throw their stage's message; 7f2 and 7g delete their entries and the recorded expectations then apply,
with no re-recording. The `sites` rows refuse on the whole plan and need no pin.

## 3. Re-replaying the landed rows (F5, SC4) {#part-f-sc4}

`LayeredPipelineReplay.test.ts` runs every `models/*` row of the 7b–7e refs (2,351 rows) through `new ElkLayered()`
with that mission's own dump and comparator, after checking that the plan's first entries equal the row's prefix.
2,349 replay and 2 are pinned (FX6). No `GraphConfigurator` defect appeared over the option combinations those rows
carry. The 7b–7e rows had been replayed through `normalise`, a mirror of `configureGraphProperties`; over all 2,349
rows the state after `normalise` and after the real `prepareLayoutTest` differ in 0 properties, in both orders, so the
earlier recordings' assumption holds.

## 4. The JUnit runner subset (F7, F8, FX8) {#part-f-runner}

`test/helpers/layout-test-runner.ts` (`defineLayoutTest`, `layout`) reproduces the semantics of the Java test framework
that the in-scope suites use: graph sources with `FileNameFilter`/`FileExtensionFilter`, `@Algorithm`, `@Configurator`
and `@ConfiguratorProvider`, `@DefaultConfiguration` (with the annotation's own defaults), blackbox `@Test`,
`@TestAfterProcessor`/`@TestBeforeProcessor` through the landed `TestController`, `@FailIfNotExecuted`,
`@OnlyOnRootNode`. Layout runs through the real provider and engine.

**Label metrics (FX8).** `TestConfiguration.java:93` sizes every unsized label with AWT font metrics before layout,
and suites depend on it (`Issue405_2Test`; overlap checks on empty rectangles pass vacuously). The JVM's sizes for
1,380 label texts are recorded in `test/golden/refs/java/layered-label-metrics.json` by
`tools/vectors/layered-label-metrics-vectors.sh`; `test/helpers/layout-test-labels.ts` applies them where the Java
does, and an unknown text throws naming it. Measured: zero-sized labels pass 141 of 142 runner cases, recorded sizes 142.

**Allocation.** `plans/layered-pipeline/suite-allocation.md` assigns the 54 baseline suites and the four S1 suites by
plan dump: 7f 28, 7f2 11, 7g 10, 7h 9. Under FX1 a suite with any later-mission input moves whole; the corpus-wide
suites (`InLayerConstraintProcessorTest`, `LongEdgeJoinerTest`, `NodeMarginCalculatorTest`) run over the 12 vendored
ptolemy models, or the whole corpus with `PIPELINE_SUITES_FULL=1` and `ELK_MODELS_DIR`.

## 5. Java idioms the port reproduces {#part-f-idioms}

| Idiom                                        | Where                                                                                   | How                                                                                                                                                                                  |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Direction modes paired against their names   | `IntermediateProcessorStrategy.java:211-215`                                            | `DIRECTION_PREPROCESSOR` is `TO_INPUT_DIRECTION`, `DIRECTION_POSTPROCESSOR` `TO_INTERNAL_LTR`; only UP under reading direction and ROTATION depend on it                             |
| A recursion over connected ports             | `ComponentsProcessor.dfs`                                                               | explicit stack of lazy iterators keeping visit order; verbatim twin on every row and at depth 200; 5,000 nodes under `--jitless` (F11)                                               |
| `(float) Math.sqrt`, `float compWork`        | `SimpleRowGraphPlacer.java:77`, `ComponentGroupGraphPlacer.java:376`, `ElkLayered.java` | `Float32` (F11)                                                                                                                                                                      |
| Identity-hashed `Set<PortSide>` keys         | `ComponentGroup.components`                                                             | hashed by set size, the constant enum hash under `-XX:hashCode=2` (FX3); insertion order fails 3 rows in intermediate `layerless` order but no final layout of the 6,646 sweep cases |
| Iterated identity-hashed `HashMap<LEdge, …>` | `EndLabelSorter.java:176`                                                               | insertion order (FX2); 7f2 records a parallel-edge scenario                                                                                                                          |
| `KVectorChain.remove(vector)` by `equals`    | `HypernodesProcessor.java:178`                                                          | a local `removeEqual`; the landed `LinkedList` compares by identity                                                                                                                  |
| Plans built eagerly                          | `AlgorithmAssembler.build`                                                              | a staged arm throws at plan build, before any processor or cancellation check                                                                                                        |

## 6. Evidence {#part-f-evidence}

| Layer                       | What                                                                                                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline rows (T1, T9, T15) | `layered-pipeline.json`: `full` 199, `models` 905 (847 replayed, 58 pinned), `scenarios` 93, `sites` 42; 4 goldens equal at AD-4; no port fix was needed to match                                                                                               |
| SC4 re-replay (T10)         | 2,351 landed `models` rows: 2,349 replayed with plan equality, 2 pinned                                                                                                                                                                                         |
| Ported suites (T11, T12)    | 28 suites allocated here, every Java literal kept; reviewed against the Java by an independent pass (one runner defect fixed, `ConcreteSortByInputModelTest`'s table checked mechanically against its 32 methods); oracle `failures=0` at mission start and end |
| Breadth sweep (T14)         | 7,246 oracle cases; 6,646 `ok` hash-match exactly at stride 1; 600 refused, all self loops (7g)                                                                                                                                                                 |
| Cross-check (T14)           | unflagged JVM vs TS: 4,902 `ok`, 21 mismatches none of which is a layout (19 exception-class, 2 option echoes), 0 `nondeterministic`                                                                                                                            |
| Anchored tests (T16a, T16b) | 58 cases citing `// oracle: <row id>`; 26 mutation flips killed (4 first-round survivors closed with structural twins or replaced)                                                                                                                              |
| Coverage (T13)              | over the 7f classes, 169 of 563 branches and 46 of 230 functions untaken by the replays alone, partitioned S 73, J 44, U 92, X 6; 7 S items proved unreachable and moved to U                                                                                   |

## 7. Runbook and failures {#part-f-runbook}

```bash
bash tools/vectors/layered-pipeline-vectors.sh test/golden/refs/java          # the ref; byte-stable, cached by salted input hash
bash tools/vectors/layered-label-metrics-vectors.sh test/golden/refs/java     # the runner's label metrics (JDK only)
bash tools/oracle/pipeline-sweep.sh [--force]                                 # test/corpus/.pipeline-sweep/results.jsonl (gitignored)
PIPELINE_SWEEP_STRIDE=1 npx vitest run test/corpus/pipeline-sweep.test.ts     # every ok case (about 3 min; stride 2 about 75 s)
java ... LayeredPipelineVectors.java --dump <case id> <modelsDir> <outDir>    # one case's dump for a mismatch (see the header)
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <the 7f suites of suite-allocation.md>
```

The S1 suites are not in `java-tests.sh`'s bundle list; a scratch copy with `org.eclipse.elk.alg.common.test` and
`org.eclipse.elk.core.test` added runs them (1, 2, 24 and 4 runs, `failures=0`).

| Failure                                            | Detection                                                                                                                   | Fix                                                                                                                              |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| A coordinate differs by more than 1e-6             | a row, sweep or anchored-case diff                                                                                          | a port defect: `--dump` the case and trace the first departure to its Java line; a cause outside the mission's classes is a stop |
| A hash-order difference                            | a mismatch that the flagged sweep does not reproduce, or one tied to a hashed container                                     | never a silent remedy: measure it (FX3 shows how) and take a decision                                                            |
| A refusal outside the categories                   | the recorder exits 1 naming the row                                                                                         | a later mission's processor reached the plan: it belongs to that mission                                                         |
| `ReferenceError … before initialization`           | the entry-point fitness test                                                                                                | the E1 recipe (cached static getters, lazy enum reads); never an entry-order import                                              |
| A cap exceeded                                     | the recorder's size or line check                                                                                           | 16 MiB per ref, 5,000 lines per launcher: a decision                                                                             |
| `layout` throws `… is ported in mission 7f2/7g/7h` | edge labels, comment boxes, `layerUnzipping`, logging (7f2); self loops, wrapping, compaction (7g); `INCLUDE_CHILDREN` (7h) | expected until that mission                                                                                                      |
