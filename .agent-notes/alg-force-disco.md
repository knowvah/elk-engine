<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — alg-force-disco (mission 8b, 2026-11)

## Observation: `ElkGraphElement.getProperty` stores a copy of a cloneable default on first read

- **Context**: T1 recorder dumps and T6 replay dumps; force `PADDING` came out as 12 instead of 50.
- **Finding**: reading `CoreOptions.PADDING` (default `ElkPadding`, cloneable) stores a copy on the element. A dump that read it
  mid-run changed what `ElkGraphImporter.applyLayout` later read for `ForceOptions.PADDING` (12 against 50). `ElkMargin` behaves
  the same.
- **Impact**: a dump or replay helper reads `getAllProperties()`, never `getProperty`, for such options; otherwise the observer
  changes the observed run.
- **Confidence**: High

## Observation: V8 `Math.log` differs from the JVM; V8 `Math.sin`/`Math.cos` equal `StrictMath` while HotSpot's intrinsics differ

- **Context**: FD3 planning probe and T5, T9 (oracle JVM 21.0.1, arm64).
- **Finding**: V8's `Math.log` differs from `Math.log` and `StrictMath.log` of the JVM by one ulp on 858 of 200,000 inputs (0.43
  %) and on 101 of the 20,014 `force.json` `log` rows (0.50 %); HotSpot's `Math.log` and `StrictMath.log` agree on all 20,014.
  For `sin`/`cos` the roles differ: V8 equals `StrictMath` on all 160 `sin` and 160 `cos` inputs of the disco runs, HotSpot's
  `Math.cos` differs from it on 9 and `Math.sin` on 5. `atan2` (171 inputs) agrees in all three.
- **Impact**: a bit-exact `log` (fdlibm) is needed where an iteration amplifies one ulp (Eades: 390 off at 1,000 iterations);
  `StrictMath` is not a stand-in for HotSpot's `sin` and `cos`. Nothing is verified on x86_64.
- **Confidence**: High on arm64; Low on x86_64

## Observation: `Array.from({ length: n })` does not throw for a negative `n`

- **Context**: T9, `throws/negativeAspect` raised `RangeError` in `ProfileFill.ts` instead of `NegativeArraySizeException "-4"`.
- **Finding**: `TwoBitGrid.newWords` used `Array.from({ length: height })`, which yields `[]`; Java's `new long[h][...]` throws with
  the size as the message. The JVM gives "-4" for `(-4, 9)`, "-2" for `(3, -64)`, "-4" for `(-4, -64)` and "-2" for `(0, -64)`.
- **Impact**: every port of a Java array allocation whose size is computed needs an explicit check, in the order the Java
  evaluates the dimensions.
- **Confidence**: High

## Observation: a property value without `toString` exports as JVM identity text

- **Context**: T11 goldens; `layoutOptions.debug.discoGraph` differed in all 20 disco refs.
- **Finding**: `DCGraph` has no `toString`, so the JSON exporter writes `Object.toString()`, `...DCGraph@1` under
  `-XX:hashCode=2`; the port writes `[object Object]`. A list value is a separate case: `ArrayList` exports as
  `AbstractCollection.toString` (`[p1, p2]`), which `JsonExporter` did not do before the fix.
- **Impact**: compare exported option values after neutralising identity text only where the ref matches the identity
  pattern; never add a `toString` the Java lacks.
- **Confidence**: High

## Observation: an exported option key depends on the registered providers, and the oracle silently drops a wrong option id

- **Context**: T11 sweep, golden `force--iterations-50`, `interactiveRectpacking_*` cases.
- **Finding**: the exporter names an option by the shortest unique suffix over the registered providers and drops options it
  does not know. The oracle registers rectpacking, so `iterations` is `force.iterations` there and `desiredPosition` is known; the
  port has no rectpacking provider. Without layered registered in `ts-layout-compare.ts`, force and stress showed 117 options-only
  mismatches and 5 `ts-only-throw` each on the 286-row sweep; with it 0 and 0. A wrong option id in an input is dropped by the
  oracle without an error.
- **Impact**: a golden or sweep difference in an option key is first a registration difference; check the provider set before the
  port.
- **Confidence**: High

## Observation: `ComponentsProcessor.dfs` lists a cycle-closing edge twice, which breaks a state rebuild by position

- **Context**: T6, six recombine rows showed `bends` of length 0 in the replay helper.
- **Finding**: `ComponentsProcessor.java:136-139` adds an edge that closes a cycle to `component.getEdges()` twice (once when the far
  end is visited, once when the near end resumes its incidence list), as one object. A rebuild that created one `FEdge` per list
  entry made two, and the bend points attached to one.
- **Impact**: rebuild edges and labels by name, one object listed twice; the oracle row `stops/edgeLabels/repulsivePower1` shows
  `e4` twice too.
- **Confidence**: High

## Observation: engine-run stops are observed with prototype wrappers and an `inForce` flag

- **Context**: T8, T10 replays through `RecursiveGraphLayoutEngine`.
- **Finding**: wrapping `importGraph`, `applyLayout`, `split`, `recombine`, `updateModel` and the models' `moreIterations` on
  prototypes (restored in `finally`) gives every stop without a production hook. Stress calls the force provider first, so an
  `inForce` flag keeps the force pass's importer, split and apply calls out of the stress stops.
- **Impact**: the replays of 8b need no production hook; the wrappers must be restored in `finally`.
- **Confidence**: High

## Observation: the `Random` state is fingerprinted by counting draws

- **Context**: T8, `randomPeek` (`nextLong()` of a serialised copy of the graph's `Random`) at the `split` stop.
- **Finding**: the `Random` shim has no copy or state accessor, so the replay wrapper counts `nextDouble` draws (any other draw
  throws, since force draws only `nextDouble`) and a same-seed generator replays them to compute the peek. It matched in every
  state.
- **Impact**: a bundle that draws other types needs another fingerprint.
- **Confidence**: High

## Observation: an ESM cycle through a base class `extends` makes the abstract class a non-entry module

- **Context**: T8 import smoke over `src/alg/force`.
- **Finding**: `AbstractForceModel` imports `ForceOptions`, which imports `ForceLayoutProvider`, which imports `EadesModel`; loading
  the base first fails with `Cannot access 'AbstractForceModel' before initialization` at `EadesModel.ts:15`. 35 of the 36
  non-test modules load alone. `NON_LEAF_DEFAULT_TYPES` does not help (no default names a model).
- **Impact**: the precedent (layered-cycles-layers E1 part 3, 7g T15) is that a test of such a base enters through another
  module; do not add an entry-order import in `src/`.
- **Confidence**: High

## Observation: recursion depth thresholds of the two component searches

- **Context**: T12 probe of `ComponentsProcessor.dfs` and `ElkGraphComponentsProcessor.dfs` on paths.
- **Finding**: the oracle (default `-Xss`) completes at 16,000 and throws `StackOverflowError` at 100,000. TS (`npx tsx`) completes
  at 4,000 and overflows at 16,000; under `--jitless` force completes at 3,000 and overflows at 4,000, disco overflows at 8,000.
- **Impact**: FD7's 2,000 is below every threshold; a conversion is issue #70.
- **Confidence**: Medium (one machine, Node 26.3.1)

## Observation: `tallyHex` counts only hex text under its own key lists

- **Context**: `tallyHex` in `test/helpers/force-replay-elk.ts:166`, which produced the raw-bit counts of the force and stress
  replays (259,243 and 135,229 hex doubles).
- **Finding**: it walks the keys of the expected value and counts a 16-hex string as a double only below a key in `HEX_KEYS` or
  `ELK_HEX_KEYS` (or a descendant of one); a hex string under any other key is not counted, and a field absent from `expected` is
  not read. A shape difference counts as one difference for the whole subtree.
- **Impact**: when a stop gains a recorded field, add its key to the list, or the count stays green without covering it.
- **Confidence**: High (read from the helper)

## Observation: parallel-stream exceptions surface as copies

- **Context**: T2 throw rows through `ElkGraphComponentsProcessor`'s parallel streams.
- **Finding**: a parallel stream rethrows a copy of the exception whose stack is the caller's, so the first-frame text is not the
  origin; the recorded rows hold the root cause. The port is sequential, in encounter order.
- **Impact**: record and compare throws by root cause class and message.
- **Confidence**: High

## Observation: stress `epsilon` 1e-8 runs for minutes

- **Context**: T1 recorder design.
- **Finding**: on a 5-node path, `elk.stress.epsilon` of 1e-8 ran for minutes; the recorded factor is 1e-5.
- **Impact**: keep stress epsilon at or above 1e-5 in recorders and goldens.
- **Confidence**: High

## Observation: issue #58's three cases need two more things besides `elk.stress`

- **Context**: T12 evidence run with temporary copies of `Issue665Test` and `Issue700Test`.
- **Finding**: with `elk.force` and `elk.stress` registered and `PIPELINE_SUITES_FULL=1` all three cases pass, but
  `refs/java/layered-label-metrics.json` lacks the label texts `insideOtherLayout`, `child1`, `child2`, `insideOtherDirection`
  (89.0, 29.0, 29.0 and 101.0 wide, each 11.77734375 high in a scratch recording) and the two models are not vendored.
- **Impact**: removing `STRESS_PENDING` is not enough; the ref gains four rows (an AD-13 ref change) and the models need vendoring.
- **Confidence**: High
