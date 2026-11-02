<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — layered-crossing-min-tests (mission 7c-tests)

Approved by the user on 2026-11-02 (all recommendations). Earlier decision sets still apply: 7c's C1–C13
(`plans/layered-crossing-min/decisions.md`, C1 amended by T8 below), 7b's SC/B/E rows, 7a's L/S/X rows, AD-1…AD-16.

| ID | Decision |
| -- | -------- |
| T1 | **Expected values are the Java tests' own literals**, ported verbatim. AD-13 accepts Java source as an expectation source; the baseline run below proves every literal holds on the pinned oracle. No new vectors, goldens or refs; no recorder. |
| T2 | **Java baseline runner.** `tools/oracle/java-tests.sh <fully qualified class…>` runs JUnit 4 against the oracle build: the jars in `$ELK_ORACLE_DIR/oracle-build.json`, the oracle's layered and alg test bundle classes, and from the p2 cache Guava, Gson, EMF, Xtext/Xtend, Guice, ANTLR, `org.eclipse.equinox.common`, `org.eclipse.core.runtime`, `org.eclipse.osgi`, `org.eclipse.xtext.common.types`, `org.objectweb.asm`, `org.apache.log4j` 1.2.25, `org.hamcrest` 3.0, plus `junit` 4.13.2 from `~/.m2`. It prints per-suite counts, exits non-zero on a failure or a missing bundle (naming it), runs at mission start and end, and is cited by the conformance doc. Missions 7d–7h reuse it. |
| T3 | **Creator shape.** One TS class per Java class in `test/helpers/` under its Java name: `TestGraphCreator.ts` (with `MockRandom`), `InLayerEdgeTestGraphCreator.ts` and `NorthSouthEdgeTestGraphCreator.ts`, the latter two extending the first as in Java. Java method names kept; Java `protected` members are public (suites call the creator rather than subclass it). Each test builds a fresh creator in `beforeEach` (JUnit instantiates the test class per method). No section split: the complexity gate scans `src/` only. |
| T4 | **`MockRandom`** is a TS subclass of the `Random` shim (`src/java/util/Random.ts`) overriding `nextBoolean`, `nextFloat`, `nextDouble`; Java's `current += changeBy` (`float` += `double`) is `current = Math.fround(current + changeBy)`; `nextDouble` returns the float. The unseeded `super()` is harmless (every draw is overridden). |
| T5 | **Identity assertions.** Hamcrest `is(list)` and `assertEquals` on graph elements are Java `equals`, which is identity for `LNode`, `LPort`, `LEdge`, `Layer`. Helper `expectSameElements<T>(actual: Iterable<T>, expected: readonly T[])` in `test/helpers/junit-asserts.ts` checks the length and `toBe` per index. Never `toEqual` on graph elements (deep equality passes distinct look-alikes and recurses through cycles). Numbers and booleans use `toBe`. |
| T6 | **JUnit mechanics.** `@Parameters` → `describe.each` over the same list, named with the Java `name` pattern; `@Before` → `beforeEach`; the 8 `@Ignore` methods (none carries `@Test`, so JUnit never collects them) → `it.skip` with the Java reason, as `LayoutProcessorConfigurationTest.test.ts` does. |
| T7 | **A literal that fails in TS is a port defect, never a test edit.** Suite agents return a diagnosis artifact (mechanism, origin `file:line`, causal chain, ruled out). The orchestrator fixes it at the origin, only in 7c production files (`p3order/**`, `intermediate/greedyswitch/**`, `intermediate/preserveorder/**`, the eight 7c processors), then re-runs the 813-row order replay and the stride-2 order sweep (both must match). Origin elsewhere, or a test passable only by changing its literal, is a stop. |
| T8 | **Scope (amends 7c C1).** The root `org.eclipse.elk.alg.layered.TestGraphCreator` (1,217 lines) is referenced by no Java file: unported. `ConcreteSortByInputModelTest` (32) and `AllowNonFlowPortsToSwitchSidesTest` (6) call `LayeredLayoutProvider.layout` and assert coordinates and edge intersections: they move to 7f. The fourteen unit-level suites below are ported. |
| T9 | **Coverage record.** T9 measures coverage of the 7c classes with the ported suites plus the order replay and writes [coverage.md](coverage.md): which of 7c's unreached arms (`plans/layered-crossing-min/unreached.md`, the nested-graph 7h set in particular) the suites now reach. 7c's map is not edited. |

Mission `layered-crossing-min-tests`, branch `feature/layered-crossing-min-tests`.

## Baseline

Measured 2026-11-02 against the oracle at `b19c4ed1` (pinned `8aaa3c14` + patches), JDK 21, JUnit 4.13.2; identical
with and without `-XX:+UnlockExperimentalVMOptions -XX:hashCode=2`.

| Suite (Java package under `org.eclipse.elk.alg.layered`) | Tests | Params | Runs | `@Ignore` methods |
| -------------------------------------------------------- | ----: | -----: | ---: | ----------------: |
| `p3order.AbstractBarycenterPortDistributorTest` | 6 | 1 | 6 | 1 |
| `p3order.BarycenterHeuristicTest` | 7 | 1 | 7 | 0 |
| `p3order.GreedyPortDistributorTest` | 11 | 1 | 11 | 0 |
| `p3order.LayerSweepCrossingMinimizerTest` | 37 | 2 | 74 | 4 |
| `p3order.LayerSweepHierarchicalTwoSidedGreedySwitchTest` | 6 | 1 | 6 | 0 |
| `p3order.LayerSweepTypeDeciderTest` | 3 | 1 | 3 | 0 |
| `p3order.counting.AllCrossingsCounterTest` | 14 | 1 | 14 | 0 |
| `p3order.counting.CrossingsCounterTest` | 13 | 1 | 13 | 1 (`benchmark`, `// @Test`) |
| `p3order.counting.NorthSouthEdgeAllCrossingsCounterTest` | 20 | 1 | 20 | 0 |
| `intermediate.greedyswitch.BetweenLayerEdgeTwoNodeCrossingsCounterTest` | 15 | 1 | 15 | 1 |
| `intermediate.greedyswitch.GreedySwitchProcessorTest` | 13 | 2 | 26 | 0 |
| `intermediate.greedyswitch.InLayerEdgeTwoNodeCrossingCounterTest` | 21 | 1 | 21 | 1 |
| `intermediate.greedyswitch.NorthSouthEdgeNeighbouringNodeCrossingsCounterTest` | 26 | 1 | 26 | 0 |
| `intermediate.greedyswitch.SwitchDeciderTest` | 19 | 2 | 38 | 0 |
| **Total** | **211** | | **280** | **8** |

The deferred full-layout suites also pass on the oracle (`ConcreteSortByInputModelTest` 32,
`AllowNonFlowPortsToSwitchSidesTest` 6); 7f ports them.

**Suite baseline (pre-flight, 2026-11-03 on `main` at `734f7eb`).** `npm run typecheck` and `npm run complexity`
clean; `npm test` 699 files, 27,086 passed, 73 skipped, 74.4 s at a 1-minute load of 8–31 (foreign processes). Stop 9
compares against **55.9 s at load 5.7** (7c's batch-8 gate, same tree); time `npm test` only below load 6. The 73rd
skip is `test/architecture/module-boundaries.fitness.test.ts` ("regenerated deps equal the committed file"), which
skips while `$ELK_SOURCE_DIR`'s `HEAD` (`b715fb10`, upstream master after a fork sync on 2026-10-31) differs from
the pinned `8aaa3c14`; the layered plugin and both test bundles are identical between the two commits, so the Java
this mission reads is unaffected. With `$ELK_SOURCE_DIR` back at the pin, the count is 27,087 / 72.

**Count rule (stop 7).** Per suite, TS passing cases (`it`, multiplied by `describe.each` parameters) equal the Java
runs above, and TS skips equal the suite's `@Ignore` methods times its parameters: 12 skips in all
(`LayerSweepCrossingMinimizerTest` 8, four suites 1 each).
