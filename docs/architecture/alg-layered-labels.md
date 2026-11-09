<!-- SPDX-License-Identifier: EPL-2.0 -->

# alg.layered, part g: labels, comments, unzipping and debug output (mission 7f2)

What mission 7f2 (`layered-labels`, the second brief of roadmap row 7f) ported of `org.eclipse.elk.alg.layered`: the
label family, the comment processors, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` and the debug
utilities. From here `LayeredLayoutProvider.layout` runs labelled and commented layouts, layer unzipping and a monitor
with logging enabled. This page covers the package map, how it is proven, the decisions that shaped the replay, the
evidence and a runbook. Decisions cited are `plans/layered-labels/decisions.md` (G1-G12 and the execution decisions G3a
and G11a); task ids T1-T19 are in that mission's `decision-journal.md`; F/FX-rows are 7f's
(`plans/layered-pipeline/decisions.md`), AD-n `plans/elk-engine-skeleton/decisions.md`. Parts a-c are
[alg-layered.md](alg-layered.md) §§ 1-9, part d [alg-layered-placement.md](alg-layered-placement.md), part e
[alg-layered-routing.md](alg-layered-routing.md), part f [alg-layered-pipeline.md](alg-layered-pipeline.md). Counts live
in [conformance.md](../conformance.md#alg-layered-labels). The mission's diagrams are
[data-flow](../../plans/layered-labels/diagrams/data-flow.md) and
[component-map](../../plans/layered-labels/diagrams/component-map.md); they are linked, not copied.

| Section                                                 | Answers                                                                 |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| [1. Package map](#part-g-package-map)                   | What 7f2 ported, where it lives, the 12 arms                            |
| [2. Rows and the bar](#part-g-rows)                     | The four row groups, the logged-graph comparison, the unpinned rows     |
| [3. Decisions that shape the replay](#part-g-decisions) | `END_LABELS` order, the two-run protocol, the manager, label metrics    |
| [4. The ported suites](#part-g-suites)                  | The Java suites against the baseline, runner counts                     |
| [5. Evidence](#part-g-evidence)                         | Rows, sweep, measurements, coverage, mutation checks, upstream branches |
| [6. Runbook and failures](#part-g-runbook)              | Re-recording, the sweep, the Java suites, what still throws             |

## 1. Package map {#part-g-package-map}

G1 scoped one brief of about 5,230 Java lines (15 classes). The `IntermediateProcessorStrategy` arms it wires are
listed in the second table.

| Java (`intermediate/` unless noted)                                          | TS                                                                                                                                                       | Task |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `LabelDummyInserter`, `LabelDummyRemover`                                    | `LabelDummyInserter.ts`, `LabelDummyRemover.ts` (+ `LabelDummyRemoverPlacement.ts`)                                                                      | T4a  |
| `LabelDummySwitcher` (+ nested `LabelDummyInfo`)                             | `LabelDummySwitcher.ts` (+ `…LabelDummyInfo`, `…SpaceEfficient`, `…Support`, `…Swapping`, `…Targets`); the 7f2 stage marker is gone                      | T4b  |
| `LabelSideSelector`, `LabelManagementProcessor`                              | `LabelSideSelector.ts`, `LabelManagementProcessor.ts`                                                                                                    | T5   |
| `EndLabelPreprocessor`, `EndLabelPostprocessor`                              | `EndLabelPreprocessor.ts` (+ `…Placement`), `EndLabelPostprocessor.ts`                                                                                   | T6   |
| `CommentPreprocessor`, `CommentNodeMarginCalculator`, `CommentPostprocessor` | `CommentPreprocessor.ts`, `CommentNodeMarginCalculator.ts`, `CommentPostprocessor.ts`                                                                    | T7   |
| `unzipping.AlternatingLayerUnzipper`                                         | `unzipping/AlternatingLayerUnzipper.ts` (+ `…Shift`)                                                                                                     | T8   |
| `DotDebugUtil`, `JsonDebugUtil`, `DebugUtil` (root)                          | `DotDebugUtil.ts`, `JsonDebugUtil.ts` (+ `…Edges`, `…Graph`, `…JavaString`, `…Properties`, `…Size`, `…Writer`), `DebugUtil.ts`; the stage marker is gone | T9   |
| `InteractiveLayeredGraphVisitor` (root)                                      | `InteractiveLayeredGraphVisitor.ts` (+ `…Chains`, `…Constants`, `…Layers`, `…Lists`, `…Positions`)                                                       | T10  |
| `IntermediateProcessorStrategy` (12 arms)                                    | `intermediate/IntermediateProcessorStrategy.ts`: the 12 arms constructed as `IntermediateProcessorStrategy.java:190-284`                                 | T11  |

**The 12 arms (G1, T11).** `COMMENT_PREPROCESSOR`, `COMMENT_NODE_MARGIN_CALCULATOR`, `COMMENT_POSTPROCESSOR`,
`LABEL_DUMMY_INSERTER`, `LABEL_DUMMY_SWITCHER`, `LABEL_DUMMY_REMOVER`, `LABEL_SIDE_SELECTOR`, `END_LABEL_PREPROCESSOR`,
`END_LABEL_POSTPROCESSOR`, `CENTER_LABEL_MANAGEMENT_PROCESSOR` (`LabelManagementProcessor(true)`),
`END_NODE_PORT_LABEL_MANAGEMENT_PROCESSOR` (`LabelManagementProcessor(false)`) and
`ALTERNATING_LAYER_UNZIPPER`. The enum
tally is 7b 10, 7c 10, 7d 5, 7e 6, 7f 6, 7f2 12, 7g 9, 7h 1: **49 arms ported, 10 pending (7g 9, 7h 1)**.

## 2. Rows and the bar (G2, G3) {#part-g-rows}

One recorder, `tools/vectors/LayeredLabelsVectors.java` (a JDK 21 single-file launcher, 3,653 lines, core copied from
7f's), writes one ref, `test/golden/refs/java/layered-labels.json` (14,315,720 bytes), with four groups, counts equal
to the header's `rowCounts` (`{"full": 399, "models": 640, "scenarios": 224, "sites": 42}`):

- **`full`** (399): a model is read, options applied and laid out with `RecursiveGraphLayoutEngine`, with the plan of
  every level. Families: `labels` 194, `label-options` 114, `comments` 6, `unzipping` 12, `interactive` 56, `issues` 14,
  `logged` 3.
- **`models`** (640): stops at each of the 12 arms through `ElkLayered`'s test API.
- **`scenarios`** (224): step rows on hand-built graphs; step ops `labelManager <kind>`, `interactive` and `logging`
  have TS twins in `test/helpers/layered-labels-replay-ops.ts`.
- **`sites`** (42): one row per scenario of `plans/layered-labels/unreached.md` (T16).

**Whole-plan refusal (G2).** A row whose plan holds a member outside the ported sets is not recorded unless it is in
the 7g or 7h categories, where it is an accepted refusal; no row needs pinning. The recorded accepted refusal is
`full/labels/ticket-213_componentsCompaction` (7g, `COMPACTION_CONNECTED_COMPONENTS`). 195 label-bearing models were
selected (73 run one of the 12 arms); seven models the oracle cannot load are excluded (T1).

**Logged graphs (G3, G3a).** `DotDebugUtil` and `JsonDebugUtil` print Java identity hashes and `Object.toString()`
values (`<class>@<hex>`), and the Java JSON is not valid JSON (`},,`). The port prints them through the landed
`identityHashCode` shim; `normalizeIdentityHashes` (`test/helpers/layered-labels-replay-logged.ts`) replaces every
identity-hash token on both sides; DOT is then compared exactly, JSON textually and line by line with each
`"properties": {` block an unordered multiset. The port iterates `getAllProperties()` as the landed `JavaHashMap`
yields it (T9), not in insertion order as G3's text says. A new type printed through `Object.toString` needs a row in
`JsonDebugUtilJavaString.ts`'s class table; it breaks under minification.

**Unpinning (G9, FX5).** T11 deleted the 59 entries of `test/helpers/layered-pipeline-pinned-rows.ts` naming 7f2 (57
`layered-pipeline.json` rows, 2 `layered-phases.json` rows); all 59 replay their recorded expectations. One entry stays,
`models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN` (7g). `site/provider/flat` and
`site/provider/cancelled` compare their recorded layout, and only `INCLUDE_CHILDREN` provider rows still expect a throw.
The assertion changes are G11's and G11a's, each journaled with old and new text.

## 3. Decisions that shape the replay {#part-g-decisions}

| Topic                             | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `END_LABELS` order (G4, T6)       | `HashMap<LPort, LabelCell>` (`EndLabelPreprocessor.java:110`) becomes an insertion-ordered `Map` (AD-10). A reversal twin rebuilds `END_LABELS` in reverse: all 66 postprocessor rows dump identically; FX2 rows equal the oracle in both orders                                                                                                                                                                                                        |
| `EndLabelSorter` groups (FX2, T1) | `createLabelGroups`' `HashMap<LEdge, LabelGroup>` order feeds a comparator with ties; under `-XX:hashCode=0/1/5` two imports of one input differ. The port keeps insertion order, matching the flagged oracle (no stop 17); upstream branches in § 5                                                                                                                                                                                                    |
| Interactive rows (G5, T10)        | Two-run protocol: lay out, apply the visitor, lay out again; 14 variants × 4 directions. `shiftOtherNodes`, the only true recursion, uses an explicit stack proven against a verbatim recursive twin. Variant `chain-both` makes the Java throw `IndexOutOfBoundsException` (`InteractiveLayeredGraphVisitor.java:650`), is not recorded, and is asserted as the Java's own throw                                                                       |
| Label manager (G6, T1, T2)        | A small deterministic manager defined by the recorder (`shrink-width`: returns `new KVector(targetWidth, label.getHeight())` when the label is wider than the target, else null), set on the root `ElkNode`, with a TS twin in `test/helpers`. It appears in `scenarios` only (no vendored model carries one); the twin prints the recorder's `Object.toString()` and `registerLabelManagementOptions` registers the option provider                    |
| Label metrics (G8, T3)            | `layered-label-metrics.json` grew append-only, from 1,380 to 2,258 entries (T3 and its push-forward appends for the suites' texts). Two digests pin the 7f table (texts and entries); the append-only test (`test/helpers/layout-test-labels.append-only.test.ts`) proves every earlier entry unchanged; a changed entry is stop 20. `ElkUtil.configureWithDefaultValues` creates identifier labels that need metrics, so a text scan alone misses them |
| Replay helper rules (T2)          | The labels dump lists detached ports and writes elements that left the graph as `{class}` (edges included); `.elkt` enum values no Java enum has stay `LayoutOptionProxy` and the recorder drops them after load; providers beyond `LayeredMetaDataProvider` must be registered. See `.agent-notes/layered-labels.md`                                                                                                                                   |
| Ops wrap, no registry (T2)        | 7f's `STEP_ARITY` is closed; `labelManager` is peeled off as the first step and installed before import, `interactive` and `logging` are terminal as in the recorder                                                                                                                                                                                                                                                                                    |

## 4. The ported suites (G1, G12) {#part-g-suites}

The 11 suites of [java-baseline.md](../../plans/layered-labels/java-baseline.md) run in TS with the Java's own
assertions: `AlternatingLayerUnzipperTest` 12, `CommentPostprocessorTest` 3, `EndLabelSorterTest` 4,
`LabelDummyRemoverTest` 550, `LabelSideSelectorTest` 551, `Issue445Test` 1, `Issue471Test` 1, `Issue541Test` 2,
`Issue905Test` 2, `PartitionTest` 5 and `Issue871Test` 3 oracle runs, all `failures=0`. At mission start the oracle runs
equal the baseline (stop 18). The mission-end run is equal to the start run, all 11 suites `failures=0`.

`LabelDummyRemoverTest` and `LabelSideSelectorTest` run over the 12 and 13 vendored ptolemy cases by default (F7, FX1);
corpus-wide (`PIPELINE_SUITES_FULL=1`) they run 549 and 550 cases with 132 failures, all
`SelfLoopPreProcessor is ported in mission 7g` (7g's category, no move). `NodeMarginCalculatorTest` gains the hooks for
`CommentNodeMarginCalculator` and `EndLabelPreprocessor` (36 cases over 12 models; they fire on 0 of 12 vendored models,
vacuous as in the Java, which has no `@FailIfNotExecuted` there); its `SelfLoopRouter` hook stays 7g.
`SortByInputModelProcessorTest` re-runs over the 15 `preserve_order` models (15 pass). Quirks kept:
`LabelSideSelectorTest`'s configurator queue is seeded with the root only (`:69-96`); `PartitionTest` filters with the
root's `isHierarchical()` (`:70-72`).

## 5. Evidence {#part-g-evidence}

| Layer                                   | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rows (T1, T12, T16)                     | `layered-labels.json`: `full` 399, `models` 640, `scenarios` 224, `sites` 42; `LayeredLabelsVectors.test.ts` replays 1,316 cases at AD-4 (alone 7.1 s); no port defect found by the replay                                                                                                                                                                                                                                                                                              |
| Breadth sweep (T15)                     | 221 models × {`default`, `RIGHT`, `LEFT`, `DOWN`, `UP`} = 1,105 cases: ok 935, refused 155 (`SELF_LOOP_PREPROCESSOR` 75, `HORIZONTAL_COMPACTOR` 25, `COMPACTION_CONNECTED_COMPONENTS` 5: 7g; `INCLUDE_CHILDREN` 50: 7h), throws 15 (three rectpacking models, same exception on both sides), timeout 0. TS at stride 1: 935 of 935 hashes match, 15 of 15 throws match. Oracle sweep about 9 s, TS replay about 5 s. Final run: exit 0 in 4 s, the same split; the TS comparison passes |
| FX3-style measurement                   | Reversing `END_LABELS` or `EndLabelSorter`'s groups in a scratch copy leaves all 935 sweep hashes unchanged: the sweep does not discriminate these orders; the evidence is T6's reversal twin and T12's FX2 rows                                                                                                                                                                                                                                                                        |
| Coverage map (T14)                      | Replay-alone over the 15 classes (34 files): 721 branches, 131 untaken; 250 functions, 13 uncovered. Partition of the 144 items: S 87, J 10, U 42 (7g 3, 7h 7, dead by construction 29 branches + 3 private constructors), X 5 (`plans/layered-labels/unreached.md`)                                                                                                                                                                                                                    |
| Site rows and anchored cases (T16, T17) | 42 site rows reach every arm of the 15 scenarios and 6 hand-off scenarios. T17a: 40 cases, mutation 11 of 16 killed (5 survivors equivalent on the one `SPACE_EFFICIENT_LAYER` row). T17b: 46 cases, mutation 18 of 21 killed (3 equivalent)                                                                                                                                                                                                                                            |
| Whole suite (batch 8)                   | Coverage 99.05 / 97.17 / 99.12 / 99.06 (lines / branches / functions / statements); `npm test` 63.7 s at load 32.6 against `main` 73.5 s right after (stop 11 clear)                                                                                                                                                                                                                                                                                                                    |
| Hand-offs (G1)                          | 7b's 45 items: 42 to S sites, 3 U dead; 7b `firstEdge` arms 1 of 3 closed; 7c's 3 sites 2 closed; `HyperedgeDummyMerger` 12 of 13 closed                                                                                                                                                                                                                                                                                                                                                |

**Upstream (G10, T18).** Two fix branches exist as worktrees of the local `../elk` checkout, each one commit authored
and signed off by Scott Seely, **local, unsigned, never pushed**: `fix/end-label-group-self-add` (deletes the no-op
`this.labels.addAll(labels)`, `EndLabelSorter.java:194`) and `fix/end-label-group-order` (`HashMap` to `LinkedHashMap`
for the group map, `:161`). An issue draft for `BF_MODEL_ORDER`/`DF_MODEL_ORDER` producing same-layer or backward edges
under the default cycle breaker (7b's `testEdgesPointTowardsNextLayers` question, reproduced by T13c) is journaled and
never filed. Pushing, PRs and filing are the user's (stop 22); the handover commands are in the journal's T18 rows.
Later candidates not branched: the visitor's `IndexOutOfBoundsException` at `:650`, `EndLabelPreprocessor`'s dead
`LabelSide.ABOVE` arms, `EdgeAndLayerConstraintEdgeReverser`'s dead label checks (`:297,338`).

**Upstream prose typo (carve-out).** `LabelManagementProcessor.java`'s comment "edge Unand tail labels" is corrected to
"edge head and tail labels" at the port site (T5); listed under "upstream typos" in
[conformance.md](../conformance.md#alg-layered-labels).

## 6. Runbook and failures {#part-g-runbook}

```bash
bash tools/vectors/layered-labels-vectors.sh test/golden/refs/java            # the ref; byte-stable, cached by salted input hash
bash tools/vectors/layered-label-metrics-vectors.sh test/golden/refs/java     # label metrics (append-only, G8)
bash tools/oracle/labels-sweep.sh [--force]                                   # test/corpus/.labels-sweep/ (gitignored)
LABELS_SWEEP_STRIDE=1 npx vitest run test/corpus/labels-sweep.test.ts         # every ok case (stride 1 is the default)
java ... LayeredLabelsVectors.java --dump <case id> <modelsDir> <outDir>      # one case's dump for a mismatch (see the header)
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <the suites of java-baseline.md>
```

| Failure                                        | Detection                                                                          | Fix                                                                                                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| A coordinate differs by more than 1e-6         | a row, sweep or anchored-case diff                                                 | a port defect: `--dump` the case and trace the first departure to its Java line; first check the four dump rules of § 3 |
| A hash-order difference                        | a mismatch the flagged oracle does not reproduce, or a hashed container            | never silent: measure it (§ 5) and take a decision (stop 17); `END_LABELS` and group order are the known sites          |
| A refusal outside 7g and 7h                    | the recorder or the sweep exits 1 naming the row                                   | a later mission's processor reached the plan; it belongs to that mission                                                |
| The entry-point dead zone                      | `ReferenceError … before initialization` in `layered-entry-points.fitness.test.ts` | the E1 recipe (cached static getters, lazy enum reads); never an entry-order import                                     |
| A cap exceeded                                 | the recorder's size or line check                                                  | 16 MiB per ref, 5,000 lines per launcher: a decision                                                                    |
| A label-metrics entry changes                  | the append-only test                                                               | stop 20; an unknown text throws naming it: append it under G8's proof                                                   |
| `layout` throws `… is ported in mission 7g/7h` | self loops, `MULTI_EDGE` wrapping, post compaction (7g); `INCLUDE_CHILDREN` (7h)   | expected until that mission                                                                                             |
| A sweep cache that ignores `LABELS_FILTER`     | stale `results.jsonl` after a filtered run                                         | `--force`; the cache salt does not cover `LABELS_FILTER`                                                                |

## What still throws

Self loops, wrapping (`MULTI_EDGE`) and compaction (post compaction, `compaction.connectedComponents`): 7g, 9 pending
arms plus the staged `ComponentsCompactor`. `INCLUDE_CHILDREN`: 7h, 1 pending arm (`HierarchicalNodeResizingProcessor`)
plus the compound stages. Each throws `UnsupportedOperationException` naming the class and mission, at plan build.
