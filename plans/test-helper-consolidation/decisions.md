<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: test-helper-consolidation (issue #46)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply; AD-13 governs every decision here.
D1-D8 were auto-confirmed at planning (unattended run, 2026-11-19); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Move identical code only, never substitute a broader helper

A per-file `Factories` object or `CALLERS` table moves to `test/helpers/` only when its body is identical (after
whitespace) to the exported one **and** every identifier in it resolves to the same import or the same constant value.
The one semantic merge allowed is the pair `dbdd1cd5`/`7e5cf017` of
[inventory-planning.md](inventory-planning.md): the same three-way dispatch written as a `switch` and as a ternary,
equal by reading. An `expect` or `throw` inside a moved body moves with it, unchanged (an assertion relocated, not
removed). Objects that occur once, spread a file-local object (`{ ...factories, … }`), close over a test-local value
(`row`, a twin checker, a stub placer) or inject a class directly stay where they are; [inventory.md](inventory.md)
names each with that reason.

`CALLERS` exception: one table per class (`SplinesMath`, `Rectangle`, `NubSpline`, `NubsSelfLoop`), the union of the
current per-file tables. `LayeredRoutingVectors.test.ts` spreads the four; a `.sites.test.ts` file uses its class's table.
That is a superset there, so T7 lists the `calls` keys each `.sites` file's rows name and shows they are a subset of the
old table, and for `Rectangle.union` that every row passes an `LNode` (where the two bodies do the same call).

## D2. One order site-row replay helper

`test/helpers/layered-order-site-replay.ts` exports `replayOrderSite(id): OrderExpected` and the dispatch object
(`P1` → `CycleBreakingStrategy`, `P2` → `LayeringStrategy`, else `CrossingMinimizationStrategy`, processors through
`IntermediateProcessorStrategy`). The rows of `test/golden/refs/java/layered-order.json` load lazily, once per worker;
lookup is by exact id. For any id that exists this equals both variants. The missing-row error message unifies (no
test asserts either message; T1 re-checks with a grep). The 23 files of variants A and B import it.

## D3. `AssertionFailure` moves into `junit-delta.ts`

`test/helpers/junit-delta.ts` gains `export class AssertionFailure extends Error` (moved verbatim from
`edge-route-orthogonal.ts`), and its `assertEqualsWithin` throws it. `edge-route-orthogonal.ts` drops its private copy,
imports `assertEqualsWithin` and re-exports `AssertionFailure`, so `edge-route-orthogonal.test.ts` stays byte-identical
(its `toThrow(AssertionFailure)` at `:57` keeps passing). The 21 `junit-delta` callers see a subclass of `Error` with the
same message; T2 greps that no test pins `name === 'Error'` or the class of that error.

## D4. The three harness suites run through `defineLayoutTest`

`Issue457Test`, `Issue489Test` (core) and `Issue475Test` (alg.common) become `defineLayoutTest` specs that mirror their
Java annotations: `algorithm`, `graphs: [{ path }]`, `configurators`, `defaultConfiguration: true` (the Java's
`@DefaultConfiguration`, which `layoutElkt` never applied), `afterLayout`. Assertion bodies stay as they are.
`test/helpers/elkt-layout-harness.ts` and its test are deleted; each of the test's three cases is mapped to a
`layout-test-runner.test.ts` case that asserts the same behaviour, or ported into it when none does. Case counts: 457
1 → 1, 489 2 → 2, 475 2 → 2; titles take the runner's `name [graph configuration]` form. `Issue475Test`'s port-added
check that each child's `NODE_SIZE_FIXED_GRAPH_SIZE` equals what the configurator set stays: the configurator records
the value in a suite-local variable the check reads, which relies on the runner realising each experiment inside its
first check (T3 step 2). Should a suite fail once
`@DefaultConfiguration` applies, that is a discrepancy (stop 5): the suite stays on the harness, the harness stays, and
a `follow-up` issue carries the diagnosis.

## D5. `ElkLayered.test.ts` drops its 199-row `it.each`

Proof that `LayeredPipelineVectors.test.ts`'s `full rows` group runs the same rows with the same assertion:
`isFullRow` is `row.group === 'full'` (`layered-pipeline-replay-rows.ts:135`), so both select the same 199 rows; both
call `compareFullRow(runFullRow(row), row)`; `toEqual([])` holds iff `formatDiffs(diffs) === ''`, because `formatDiff`
always prints the kind and the path (`test/golden/compare-json.ts:164-174`); both `beforeAll` blocks call
`registerLayered()` and `registerPipelineEnums()`. The `finds the 199 full rows` case (a literal pin the vectors file
does not have) stays. Expected delta: −199 cases in that file, none elsewhere.

## D6. `fromPattern` → `test/helpers/polyomino-fixtures.ts`

The two bodies (`ProfileFill.test.ts:7`, `structures/Polyomino.test.ts:8`) are identical; move it verbatim, export it,
import it in both.

## D7. Case-count evidence from vitest's JSON reporter

Before the first edit and after the last, run the full suite with `--reporter=json` (sweep dirs off, as the gates) and
compare per file: test count, titles, status. The journal records the totals and every per-file difference. The only
permitted differences: `ElkLayered.test.ts` −199 (D5); `elkt-layout-harness.test.ts` −3 with the D4 mapping;
`layout-test-runner.test.ts` +N for cases D4 ports; retitled cases in the three D4 suites (same count). Anything else is
stop 4.

## D8. One commit on the queue branch

Per-task commits during execution, then tag `test-helper-consolidation/pre-squash`, `git reset --soft <base>`, one
commit `test: consolidate duplicated test helpers` with footer `Refs: #46`, no attribution lines (queue rule).

## Auto-confirmed (unattended)

- **D1.** Rejected: (a) one five-phase factory for all 176 objects: it changes what a narrower object does for a phase
  outside its set (several dispatch "anything else" to one enum, and strategy names such as `INTERACTIVE` exist in
  four enums) and would drop the `expect`/`throw` guards some carry (AD-13). (b) A `phaseFactories({...})` builder:
  every call site still differs, so it adds an API without removing duplication. Evidence: the grouping in
  [inventory-planning.md](inventory-planning.md) (25 groups cover 120 objects; 56 singletons).
- **D2.** Rejected: leave the 23 blocks (the issue names them; roadmap 2026-11-02 asks for the move). The two variants
  differ only in load timing and the missing-row message.
- **D3.** Rejected: let `edge-route-orthogonal` throw a plain `Error` (breaks its test's `:57` assertion, AD-13); use
  `src/java/lang/AssertionError` (renames the error and breaks the same assertion); keep both helpers (the issue asks to
  consolidate).
- **D4.** Rejected: keep the harness (the Java suites use `LayoutTestRunner`, and the harness skips
  `@DefaultConfiguration`; keeping it hides a fidelity gap); extend the harness with defaults (two runners stay).
  Evidence: `@RunWith(LayoutTestRunner.class)`, `@DefaultConfiguration` at `Issue457Test.java:40-42`,
  `Issue489Test.java:39-41`, `Issue475Test.java:39-41`; the module-boundary fitness skips `*.test.ts`
  (`module-boundaries.fitness.test.ts:150`), so a core test may import the runner. `tools/oracle/java-tests.sh` covers
  only the layered and alg test bundles, so there is no JVM run of these three classes to compare with.
- **D5.** Rejected: delete both the loop and the 199 pin; move the pin into the vectors file (that edits a frozen file
  for no gain). Evidence: the four facts cited in D5, read at planning.
- **D6, D7, D8.** One option each in practice; D7 follows the issue's "show case counts before and after".
