<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — layered-pipeline (mission 7f, 2026-11-04)

## Observation: `LayeredFrameworkVectors` closes the `realworld` input tree

- **Context**: Batch 1 gates, after T1 vendored four ptolemy models.
- **Finding**: `LayeredFrameworkVectors.java:274` walks all of `test/golden/inputs/realworld`, and `verifyTable` requires an
  exact match with its pinned table, so any new file there stops the landed 7a recorder. The 7b–7f recorders use explicit
  lists.
- **Impact**: Vendor new models outside `realworld/`; 7f's are under `inputs/pipeline/`. Later missions need the same.
- **Confidence**: High

## Observation: four enum members create `LayerSweepCrossingMinimizer`, told apart only by `crossMinType`

- **Context**: Reviewing `planNames`.
- **Finding**: `LAYER_SWEEP`, `MEDIAN_LAYER_SWEEP`, `ONE_SIDED_GREEDY_SWITCH`, `TWO_SIDED_GREEDY_SWITCH` share the class;
  default plans run `TWO_SIDED_GREEDY_SWITCH`. Class plus position misnames them. `P5_EDGE_ROUTING/UNDEFINED` and
  `/ORTHOGONAL` also share a class; no landed row spells `/UNDEFINED`.
- **Impact**: Plan naming reads the private field; only the two `GraphTransformer` members go by position.
- **Confidence**: High

## Observation: `java-tests.sh` omits the S1 test bundles, though the oracle has them compiled

- **Context**: Stop 21's run-count limb.
- **Finding**: `TEST_BUNDLES` lists only the layered and alg test bundles, while `org.eclipse.elk.alg.common.test` and
  `org.eclipse.elk.core.test` have `target/classes` in the oracle tree. A scratch copy of the script with both added runs the
  S1 suites: 1, 2, 24, 4 runs, 0 failures.
- **Impact**: The S1 stop-18 runs use a scratch copy; the landed script is never edited.
- **Confidence**: High

## Observation: the plan dump cannot load inputs that use `elk.stress`

- **Context**: Per-input plan dump of the suites leaving for 7h.
- **Finding**: `665_includeChildrenDoesntStop.elkt` and `examples/hierarchy/hierarchicalLayoutMixing.elkt` abort with
  `Layout algorithm 'elk.stress' not found`; the recorder's classpath registers no such algorithm. Both set
  `hierarchyHandling: INCLUDE_CHILDREN` at the root.
- **Impact**: 7h must allocate those inputs from the files or extend the classpath.
- **Confidence**: High

## Observation: inside self loops add no `SELF_LOOP_*` member to a plan

- **Context**: T1 plan dump over tickets 548 and 562.
- **Finding**: With `insideSelfLoops.activate` and `yo`, the plan has no self-loop member; a plain self loop does. 484 of the
  550 ptolemy models have no refused member, and the whole-corpus dump takes about 5 s.
- **Impact**: A grep for self loops over-predicts 7g; the plan dump decides.
- **Confidence**: High

## Observation: the layered pool serves one provider, so one listener sees every level

- **Context**: T1 installing a `TestController` for `expected.plans`.
- **Finding**: `LayoutAlgorithmData.getInstancePool()` is a single-instance FIFO; `pool.fetch()`, `install`, `release` leave
  the controller on the instance `RecursiveGraphLayoutEngine` reuses. `LGraph` `ORIGIN` gives the level's `ElkNode`, also on
  component graphs.
- **Impact**: T11's runner can use the same installation.
- **Confidence**: High

## Observation: `Map.of` order breaks a recorder's byte-identity

- **Context**: T1 reproducibility runs.
- **Finding**: `Map.of` iteration order is nondeterministic between JVM runs; rows built from it differ.
- **Impact**: Build rows from `LinkedHashMap` or lists.
- **Confidence**: High

## Observation: `IntermediateProcessorStrategy` pairs the direction modes the opposite way to their names

- **Context**: T5 and T6 replaying `direction-UP` rows.
- **Finding**: `IntermediateProcessorStrategy.java:211-215` gives `DIRECTION_PREPROCESSOR` `TO_INPUT_DIRECTION` and
  `DIRECTION_POSTPROCESSOR` `TO_INTERNAL_LTR`. Only UP under reading direction, and ROTATION, depend on the mode, so LEFT and
  DOWN rows pass under either pairing and a UP graph under the wrong one matches the oracle's DOWN layers.
- **Impact**: Inject or wire as the Java does; UP rows are the only ones that discriminate.
- **Confidence**: High

## Observation: `src/java/util/LinkedList.ts` documents identity equality that is false for `KVector`

- **Context**: T7 porting `junctionPoints.remove(first)`.
- **Finding**: The header says Java `equals` is identity for ELK's elements, but `KVector.equals` compares values. A
  `KVectorChain.remove(vector)`, `contains` or `indexOf` port needs an `equals` scan. The two landed `createdJunctionPoints`
  containers are value-hashed `JavaHashSet`s and unaffected; the only Java call of this shape in scope is
  `HypernodesProcessor.java:178`. `src/java` is off limits here.
- **Impact**: Cleanup candidate: correct the header, or give `KVectorChain` value-equal members. Check `KVector` list operations in
  later ports.
- **Confidence**: High

## Observation: a hash of a `Set<PortSide>` is its size under `-XX:hashCode=2`, and that decides node order

- **Context**: T4 `ComponentGroup.components`; decision FX3.
- **Finding**: Enum identity hashes are the constant 1 under the flag, and a set's hash is their sum. Insertion order differs from
  the oracle in the `layerless` order of 3 `combine` rows. The landed `ArrayListMultimap` with a size-hash strategy matches on all 20.
- **Impact**: Enum-keyed sets as hash keys are not covered by AD-10's insertion-order default; such a site is stop 17.
- **Confidence**: High

## Observation: no row sets `directionCongruency`

- **Context**: T5 coverage.
- **Finding**: All six ROTATION arms of `GraphTransformer` rest on twin comparisons; the default is `READING_DIRECTION`.
- **Impact**: T13 must list them for a site row.
- **Confidence**: High

## Observation: `setProperty(prop, null)` removes the key

- **Context**: T7 `HYPERNODE` unboxing.
- **Finding**: `getProperty` then returns the default, so a property with a non-null default cannot unbox to null.
- **Impact**: The explicit unboxing check applies only to properties with a null default.
- **Confidence**: High

## Observation: a class test must select rows by `scenarios/<Class>/`, not by "the plan runs the processor"

- **Context**: T7 row selection.
- **Finding**: `scenarios/ComponentsProcessor/*` plans include `END_LABEL_SORTER` and component ops.
- **Impact**: Filter by id prefix or by the last prefix entry.
- **Confidence**: High

## Observation: staged arms fail at plan build, not at run time

- **Context**: T8 `site/provider/flat`.
- **Finding**: `AlgorithmAssembler.build` instantiates the whole plan inside `prepareGraphForLayout`, so any plan naming a staged arm
  throws before the first processor and before a cancelled monitor is consulted.
- **Impact**: A graph with an edge label cannot exercise any driver path until 7f2.
- **Confidence**: High

## Observation: a plan must be captured during the real run

- **Context**: T8 comparing `expected.plans`.
- **Finding**: `RecursiveGraphLayoutEngine` leaves a compound node's ports fixed after its child level, so the parent's plan holds
  `NON_FREE_PORTS` additions an untouched input lacks; 10 of 199 `full` rows differ otherwise.
- **Impact**: Use `plansFromRun`. `ComponentsProcessor.split` returns a copy even for one component, so
  `startLayoutTest().getGraphs()[0]` is not the imported graph.
- **Confidence**: High

## Observation: the source checkout is ahead of the pin

- **Context**: The `regeneration` skip in `module-boundaries.fitness.test.ts`.
- **Finding**: `../elk` HEAD is `b715fb1`, 22 commits past `tools/oracle/ELK_COMMIT`, with an empty diff over the layered, core,
  common and test bundles at this time.
- **Impact**: Re-check that diff in each mission, or read through `git show <pin>:<path>`.
- **Confidence**: High

## Observation: a recorder's prefix check does not prove a row replays through the driver

- **Context**: T9, T10.
- **Finding**: All recorders refuse on the prefix only, and the driver builds the whole plan first, so a row whose later plan holds a
  staged arm throws at plan build. 60 rows are pinned (`test/helpers/layered-pipeline-pinned-rows.ts`).
- **Impact**: 7f2 and 7g delete their entries, and the recorded expectations then apply with no re-recording.
- **Confidence**: High

## Observation: `normalise` and the real configurator are state-equal on the landed rows

- **Context**: Checking that `rebaseline` hides nothing.
- **Finding**: 0 changed properties in either order over 2,349 rows.
- **Impact**: The 7b–7e rows' recording assumption holds.
- **Confidence**: High

## Observation: the JUnit runner subset cannot size zero-sized labels

- **Context**: T11 leaving out `ensureSensibleLabelSize`, which uses AWT font metrics.
- **Finding**: Zero-sized labels stay zero-sized in the TS runner, while the Java framework measures them before layout. The
  recorder's `full` rows do not go through the framework.
- **Impact**: Check here first when a ported suite's Java literal fails on a graph with unsized labels.
- **Confidence**: Medium (the effect on a given suite is unmeasured)

## Observation: the Java test framework sizes labels before layout, in every runner suite

- **Context**: T12's `Issue405_2Test`, decision FX8.
- **Finding**: `TestConfiguration.apply` runs `ensureSensibleLabelSize` after the default configuration; port labels in the 405 tickets
  are created by that configuration, so sizing has to follow it. AWT SansSerif 10 plain: "P1" 12 x 11.77734375. Zero-sized labels
  made `haveOverlaps` vacuous and passed 141 of 142 cases silently.
- **Impact**: Later suites get sizes from `refs/java/layered-label-metrics.json`. A new text throws naming it: add it to
  `tools/vectors/layered-label-metrics-texts.txt` and re-record. A green suite can still be vacuous, so non-vacuity needs its own check.
- **Confidence**: High

## Observation: `@DefaultConfiguration` fields default to true except `edgeLabels`

- **Context**: Review of `PortLabelPlacementVariantsTest`.
- **Finding**: A TS object listing only some fields used to switch the others off.
- **Impact**: The runner fills the annotation defaults under a suite's explicit fields.
- **Confidence**: High

## Observation: `Line2D.intersectsLine` treats two zero-length segments as intersecting, even at distinct points

- **Context**: Review, black-box JVM comparison over a 4x4 integer grid.
- **Finding**: A segment with length agrees with an ordinary inclusive segment test.
- **Impact**: AWT shims need a black-box comparison with the JVM; the Javadoc alone does not cover this case.
- **Confidence**: High on integer inputs; non-integer inputs were not measured

## Observation: `tools/corpus/ts-layout-compare.ts` registers no layered algorithm

- **Context**: T14's cross-check.
- **Finding**: Run as written with `--algorithms layered`, every case is `ts-only-throw` with `UnsupportedConfigurationException`; a caller
  must `registerLayered()` and call the exported `execute()`.
- **Impact**: Cleanup candidate: the tool is outside this mission's write-sets. A `mismatch` there can also be only a different exception
  class or an option echo, so read the tally's detail before treating it as a layout difference.
- **Confidence**: High

## Observation: the unflagged JVM is deterministic on all layered cases of the corpus sweep

- **Context**: `tools/oracle/sweep.sh --filter layered`.
- **Finding**: 7,144 `ok`, 19 `throws`, 0 `nondeterministic` for `org.eclipse.elk.layered`; the 531 `nondeterministic` cases are random and
  spore retargets.
- **Impact**: Identity-hash order does not reach the final layered export on this corpus.
- **Confidence**: High

## Observation: `ComponentGroup` key order is not observable in final layouts on the corpus

- **Context**: Testing FX3 directly: insertion order instead of the size hash, stride 1.
- **Finding**: 6,646 of 6,646 sweep cases still match; only 3 `combine` rows' intermediate `layerless` order differs.
- **Impact**: A hash-order difference that shows only in an intermediate dump is not necessarily a layout difference, and it can be measured
  with a temporary edit and a sweep in about 3 minutes.
- **Confidence**: High

## Observation: hypernode, layer-constraint and cancellation arms need non-obvious graphs

- **Context**: T15 site rows.
- **Finding**: Hypernodes are forced to `FREE` ports at import (`ElkGraphImporter.java:961`), so their vertical-edge arms are dead; the left
  hypernode search starts at `Integer.MAX_VALUE`, so it fires only beyond 2^31, where float rounding in the router also removes the layer gap
  (the port replicates it bit-exactly); an external dummy gets FIRST/LAST only from a hidden `*_SEPARATE` neighbour; `doLayout` checks
  cancellation after the split only with several components. An edge between two external ports of one parent is not imported.
- **Impact**: Read the Java before designing a scenario; `vitest -t` matches the title only, so use `-t '<row id>$'`.
- **Confidence**: High

## Observation: post-layering dumps cannot pin port sides; mutation checks need discriminating flips

- **Context**: T16a, T16b.
- **Finding**: `dumpWithPropertyValues` carries port data only for layerless nodes, so after layering positions and bend points are the
  discriminators. A mutation can survive because the rows never read the state it changes (`advanceVertically` with one group; the
  `HypernodesProcessor` half-size bound at diffx near 2^31). A private method on the prototype can be counted with `vi.spyOn`. vitest's
  `--reporter=json` writes to `.vitest/json/output.json` under this config unless `--outputFile` is given.
- **Impact**: Choose the mutation by what the row's fields can see; close a surviving one with a structural twin on internal state.
- **Confidence**: High
