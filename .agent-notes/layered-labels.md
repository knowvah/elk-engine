<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-labels (mission 7f2, 2026-11-06)

## Observation: the debug utilities print identity hashes, and the Java debug JSON is not valid JSON

- **Context**: T1 recording `logged` rows; decision G3a.
- **Finding**: `DotDebugUtil` uses `node.hashCode()` as DOT ids, `JsonDebugUtil` writes `"n"`/`"e"`/`"p"` + `hashCode()` ids and
  `Object.toString()` property values (`java.util.Random@1`, `Spacings@1`, `LabelCell@1` inside a `HashMap` toString); under
  `-XX:hashCode=2` every hash is 1, so all DOT nodes are `1`. The JSON writer emits `},,` in places.
- **Impact**: logged strings are compared through `normalizeIdentityHashes` and a textual, line-based JSON comparator
  (`test/helpers/layered-labels-replay-logged.ts`); never `JSON.parse` a debug string.
- **Confidence**: High

## Observation: `EndLabelSorter`'s map order is nondeterministic on the unflagged JVM

- **Context**: T1, FX2 scenario `gFx2` (three parallel edges `a.p0 → b.p0` with head and tail labels).
- **Finding**: under `-XX:hashCode=0/1/5` two in-process imports of the same input place `h0` at y 40 or 54; the
  `HashMap<LEdge, LabelGroup>` `values()` order feeds a comparator with ties. Under the oracle flag it is insertion order.
- **Impact**: the port's insertion order matches the flagged oracle; upstream fix branch candidate (G10, T18).
- **Confidence**: High

## Observation: 7f's step interpreter has no extension point

- **Context**: T2 adding `labelManager`, `interactive`, `logging`.
- **Finding**: `STEP_ARITY` is a closed record and `runLayoutStep` builds its own non-logging monitor; new ops wrap
  `runPipelineSteps` and patch `ElkGraphTransformer.prototype.importGraph` for the call to install a manager before import.
- **Impact**: later missions adding ops follow `layered-labels-replay-ops.ts`.
- **Confidence**: High

## Observation: `BasicProgressMonitor.getLoggedGraphs()` returns null when logging is off

- **Context**: T2 capture of logged graphs.
- **Finding**: as the Java, through `null as never`, despite the declared array type.
- **Impact**: null-check every call.
- **Confidence**: High

## Observation: 7e's `placementDump` omits edge labels; the labels recorder dumps every label

- **Context**: T2 `labelsDump`.
- **Finding**: `geometry.labels` and the new `geometry.labelSizes` cover every `LLabel`, edge labels included, on the 12 arm stops.
- **Impact**: compare label stops with `compareLabels`, not `comparePlacement`.
- **Confidence**: High

## Observation: the scratch-worktree baseline needs absolute `ELK_*` dirs and a `node_modules` symlink

- **Context**: stop-11 baseline on `main`.
- **Finding**: `git worktree add --detach <scratch>/wt-main main`, `ln -s <repo>/node_modules`, absolute `ELK_SOURCE_DIR`,
  `ELK_ORACLE_DIR`, `ELK_MODELS_DIR`: 74.3 s, one more skipped file than in the repo checkout.
- **Impact**: reuse for the stop-14 regroup checks.
- **Confidence**: High

## Observation: the labels recorder's dump rules the TS helpers must mirror

- **Context**: four helper fixes during T7, T8, T5, T11 and T12 (journal, T2 `fix` rows).
- **Finding**: (1) `geometry.ports` appends baseline ports not met after the listed nodes' ports (detached comment-box ports);
  (2) an element that left the graph is `{class}` and listed nowhere, edges included (`LONG_EDGE_JOINER`'s dropped edges in a
  spline `edgeChain`); (3) `.elkt` enum values the Java lacks stay `LayoutOptionProxy` and the recorder drops them after load;
  (4) providers beyond `LayeredMetaDataProvider` (`LabelManagementOptions`) must be registered or `JsonExporter` omits the
  option; opaque test objects need the recorder's `Object.toString()`.
- **Impact**: a new recorder or replay family checks these four first when only naming or export members differ.
- **Confidence**: High

## Observation: shared replay support inside `src/` must be a `.test.ts`

- **Context**: T4a, `module-boundaries.fitness.test.ts`.
- **Finding**: only the `*.test.ts` suffix is exempt from the import-direction rule; a non-test file under `src/` that imports
  `test/helpers` fails the fitness test.
- **Impact**: put shared support in `test/helpers` or a `.test.ts` file.
- **Confidence**: High

## Observation: timed gates under heavy foreign load: time `main` right after the branch

- **Context**: batches 3 and 4, 1-minute load 45–90 (WebStorm, other repositories' workers), a load < 15 never came.
- **Finding**: branch 114.8 s / `main` 100.9 s, and 99.1 s / 97.9 s, back to back in the scratch worktree.
- **Impact**: the back-to-back difference is the comparable stop-11 reading when the machine never settles.
- **Confidence**: High

## Observation: the `staged-classes` marker sits on line 2 and must agree with the registry row

- **Context**: T11, removing the 7f2 stage of `DebugUtil.ts` and `LabelDummySwitcher.ts` (G11, journal T11 rows).
- **Finding**: `// @staged 7f2` follows the SPDX line (line 2, not line 1 as G11's text says), and the fitness test requires the
  marker in the file and the row in `test/architecture/staged-classes.json` to agree, so both go in the same task.
- **Impact**: an earlier task (T4b, T9) that replaces a staged class must keep marker and row until the wiring task, or
  the architecture suite fails between commits.
- **Confidence**: High

## Observation: `toEqual` on enum constants is vacuous

- **Context**: T17a anchored cases (journal T17a row).
- **Finding**: enum constants have no own fields, so `expect(a).toEqual(b)` passes for two different constants.
- **Impact**: compare enum values with `toBe` or `String()`; an assertion written with `toEqual` proves nothing.
- **Confidence**: High

## Observation: `BF_MODEL_ORDER` and `DF_MODEL_ORDER` assume edges oriented by model order

- **Context**: T13c, 7b's `testEdgesPointTowardsNextLayers` question; T18 issue draft.
- **Finding**: under the default `GREEDY` cycle breaker both layerers leave same-layer or backward edges on 12 vendored
  ptolemy models (BF 12, DF 11); with `cycleBreaking.strategy = MODEL_ORDER` there are 0. Mechanism:
  `BreadthFirstModelOrderLayerer.java:96-115` opens a new layer only when an incoming edge's source is already in the
  current layer. 33 of the 54 `layered-phases.json` BF/DF rows violate it (7b's note said 23; the difference is
  unresolved). 30 of 96 scratch runs also threw `Index N out of bounds` in `BinaryIndexedTree` via
  `CrossingsCounter.countInLayerCrossingsOnPorts`, not checked against the oracle.
- **Impact**: do not add an edge-direction invariant after these layerers; the issue draft is in the journal (T18) and
  is not filed.
- **Confidence**: High for the mechanism and the 12-model count; Medium for the 33-vs-23 difference

## Observation: `ElkUtil.configureWithDefaultValues` creates identifier labels that need metrics

- **Context**: T3 push-forward appends (journal T3 rows).
- **Finding**: `@DefaultConfiguration` suites create labels from node identifiers before sizing, so their texts (16 for
  the comment and partition suites, 821 for the runner suites' identifiers) exist only after the default configuration
  and are missed by a scan of the model files.
- **Impact**: when a new suite throws "unknown label text", append the text under G8's append-only proof rather than
  scanning models again.
- **Confidence**: High

## Observation: the labels sweep stamp covers inputs, not environment variables

- **Context**: reading `tools/oracle/labels-sweep.sh` `compute_stamp` while preparing the runbook.
- **Finding**: the stamp hashes the oracle build, the recorder source, the models commit and every input file; no
  diagnosis-aid environment variable (`LABELS_FILTER` among them) enters it. Whether a filtered run writes a partial
  `results.jsonl` that a later unfiltered run reuses was not tested.
- **Impact**: after any run with a diagnosis aid set, run `bash tools/oracle/labels-sweep.sh --force`.
- **Confidence**: Medium

## Observation: the JDK 21 single-file source launcher masks short-stack exceptions

- **Context**: T15 and T16 recording sweep and site rows with `java <Program>.java`.
- **Finding**: an exception thrown from the program with few stack frames surfaces as `IllegalArgumentException: 0 > -1` at
  the launcher's `Main.execute`, hiding the real error (e.g. the oracle's `ArrayList.add(-1, …)` in an interactive site).
- **Impact**: catch and print in the recorder (or run with a discovery flag) before diagnosing a recorder failure.
- **Confidence**: High
