<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — layered-crossing-min, mission 7c (locked 2026-10-29)

The user approved C1–C12 during planning, as recommended. They amend, and never rewrite, AD-1…AD-16
(`plans/elk-engine-skeleton/decisions.md`), the standing rules, M/R/AC/P/NS/Q/U/D/E rows of earlier missions,
L1–L7/S1–S4/X1–X7 (`plans/layered-framework/decisions.md`) and SC1–SC4/B1–B10/E1–E2a
(`plans/layered-cycles-layers/decisions.md`). 7b's B-rows apply here wherever this file is silent (recording through
`ElkLayered.prepareLayoutTest`/`runLayoutTestUntil`, the B2 dump, B3 components flag, B4 prefix replay and refusal,
B5 inputs, B6 sweep, B7 coverage, B8 recursion, B9 enum arms, B10 landing).

| ID  | Decision |
| --- | -------- |
| C1  | **Test split.** This mission ports the code, records the oracle rows, ports the ten `LayoutTestRunner` JUnit tests as invariants over rows and anchors site rows (7b's shape). The hand-built suites — `TestGraphCreator` (1,217), `greedyswitch/{TestGraphCreator 1,388, InLayerEdgeTestGraphCreator 407, NorthSouthEdgeTestGraphCreator 902}` and the 16 suites built on them (p3order 6, counting 4, greedyswitch 6: ~9,000 lines) plus `ConcreteSortByInputModelTest` and `AllowNonFlowPortsToSwitchSidesTest` — go to the sibling brief **7c-tests**, planned and executed before 7d (roadmap row). Amends SC3 (`TestGraphCreator` → 7c-tests) |
| C2  | **Processor set.** 7c ports the eight processors a default pipeline runs between P2 and P3: `PortSideProcessor` (always), `PortListSorter` (P3 declares), `LongEdgeSplitter` (P3 declares), `InvertedPortProcessor` (`NON_FREE_PORTS`), `NorthSouthPortPreprocessor` (`NORTH_SOUTH_PORTS`), `HierarchicalPortConstraintProcessor` (`EXTERNAL_PORTS`), `SemiInteractiveCrossMinProcessor` (option), `SortByInputModelProcessor` (model order) — plus the two greedy-switch arms. The recorder **refuses** a prefix naming `LABEL_DUMMY_INSERTER`, `COMMENT_PREPROCESSOR`, `DIRECTION_PREPROCESSOR` (7f) or `SELF_LOOP_PREPROCESSOR`, `BREAKING_POINT_INSERTER` (7g); accepted refusals are listed in the recorder (B4). B9's table moves these ten members from 7f/7c-pending to 7c |
| C3  | **Recording.** New single-file recorder `tools/vectors/LayeredOrderVectors.java` + `layered-order-vectors.sh`, core copied from `LayeredPhaseVectors.java` with the origin cited (B7); new ref `test/golden/refs/java/layered-order.json` (the 7b ref is landed and immutable). Stops: the P3 phase class per `CrossingMinimizationStrategy` × greedy-switch type × thoroughness variants, `ONE_SIDED_GREEDY_SWITCH`/`TWO_SIDED_GREEDY_SWITCH`, and each of the eight processors. `expected` = B2 plus `ports: { [nodePath]: [portPath] }` (the order the sweep writes back); rows under ten nodes carry the full dump. Flat hierarchy levels only (per-level `target`); the nested-graph paths (`GraphInfoHolder` children, `sweepInHierarchicalNodes`, hierarchical greedy switch) are U until 7h. Cap: 5 MB; trimming rule journaled if needed |
| C4  | **Randomness.** `BarycenterHeuristic`, the thoroughness loop and `ISweepPortDistributor.create` draw from `InternalProperties.RANDOM` (seeded by `normalise`, seed 1); replayed through the JVM-exact `Random` shim. Seed 0 is a stop. INTERACTIVE and semi-interactive rows reuse the seeded-position configurators of the Java tests, as 7b's interactive rows did |
| C5  | **E1 recipe first.** T2, before any arm is wired: `CrossingMinimizationStrategy` joins melk `NON_LEAF_DEFAULT_TYPES` and `LayeredMetaDataProvider` is regenerated (other bundles byte-identical, S4); every new phase class writes its processor configuration as a cached static getter; a fitness test spawns a fresh Node process per entry (each strategy enum, the processor enum, the metadata provider, `LayeredOptions`) and fails on a `ReferenceError`; tests enter through the enum, never through an abstract phase base class; no module-level read of an enum constant in `graph/transform` |
| C6  | **Boxed comparisons (E2a).** Each port task greps its Java for `==`/`!=` between boxed `Integer`/`Double` (property reads, map values, `Integer` locals) and ports a site through `JavaInteger.sameValueOfBox` only when both operands are provably fresh `Integer.valueOf` boxes; value equality when a box is shared; each site journaled with its provenance; an unprovable site is stop 16 |
| C7  | **Recursion (B8, AC6).** Candidates from the planning scan, each task confirming true recursion vs overloads before rewriting: `BarycenterHeuristic.calculateBarycenter`, `ForsterConstraintResolver.initAtNodeLevel`/`processConstraints`, `AbstractBarycenterPortDistributor.calculatePortRanks`/`distributePorts`, `LayerSweepCrossingMinimizer.countCurrentNumberOfCrossings`, `PortSideProcessor.process`, `HierarchicalPortConstraintProcessor.processEasternAndWesternPortDummies`. True recursions become explicit-stack loops proven against a verbatim twin on the rows plus a 5,000-node case under `--pool=forks --execArgv=--jitless` |
| C8  | **No `TreeSet` shim (closes S2).** `CrossingsCounter.java:337,354` build, fill and copy a `TreeSet`; `Sets.newTreeSet(elements, comparator)` (comparator-equal duplicates dropped, first wins) is exact for that. A navigable shim waits for a consumer that navigates or mutates |
| C9  | **Write-through views.** `GreedyPortDistributor.java:80,123-128` sets elements through `Lists.reverse(node.getPortSideView(side))`; T6 proves the reversed view writes through the 7a port-side proxy with a unit case on the Java bounds, else stop 17 |
| C10 | **Hierarchy-aware brand.** `LayerSweepCrossingMinimizer` carries the 7a `IHierarchyAwareLayoutProcessor` brand; `src/alg/layered/IHierarchyAwareLayoutProcessor.test.ts`'s sentinel flips to asserting the brand in T7 (7a hand-off) |
| C11 | **Coverage and sites.** 7b's T9–T12 shape: replay-alone coverage map (`unreached.md`), one step row per S scenario, anchored cases `// oracle: <row id>; <Java file:line>`; U = label dummies (7f), nested graphs (7h), the enum's throwing arms (X), dead-by-construction with the Java line |
| C12 | **Branch and landing.** Mission `layered-crossing-min`, branch `feature/layered-crossing-min`, unsigned per-task commits, stop-14 regroup into at most 5 commits (README), backup branch; the user signs by rebase and merges with a merge commit |

## Baseline

Recorded at planning (Phase 8) on `main` at the PR 24 merge (631 files, 25,271 tests): `npm test` **63.3 s** (vitest
62.9 s) at 1-minute load 10.8, measured 2026-10-29 12:41 on the same tree save a two-line dead-code removal; the
pre-flight rerun at 17:10 took 85 s at load 43–58 under foreign processes and is not the baseline. Stop 11 compares a
later run at load near 11 (rerun timeout-only or load-inflated readings); the generic order replay alone has a 20 s
budget.

## Execution decisions (user, during the run; append-only)

| ID  | Date | Decision |
| --- | ---- | -------- |
| C13 | 2026-10-30 | **Unmodifiable list-literal defaults.** A melk `#[…]` default (Xtend → `Collections.unmodifiableList`, not `Cloneable`) is emitted as a frozen array and `ElkReflect.isCloneable` returns false for frozen objects, so `MapPropertyHolder.getProperty` stores it no more than the JVM does; `LayeredMetaDataProvider` regenerated, other bundles byte-identical. Approved as the orchestrator's recommendation at the T4b stop (files outside the 7c write-sets: `tools/melk`, `src/graph/util/ElkReflect.ts`) |
