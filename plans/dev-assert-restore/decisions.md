<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: dev-assert-restore (issue #127)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`), the queue rules, and the dev-assert conventions
(`plans/dev-assert/decisions.md` D1, D5, D7) apply. AD-13 governs every decision here; #127's approval covers
assertions-off wrapping and the #119 swap and nothing else. D1-D9 were auto-confirmed at planning (unattended run,
2026-11-20); evidence and rejected options are under [Auto-confirmed](#auto-confirmed-unattended).

## D1. `withAssertions` moves to `test/helpers/with-assertions.ts`

One export, `withAssertions<T>(enabled: boolean, body: () => T): T`, moved verbatim from `src/java/lang/DevAssert.test.ts`
(`:7-16`, with its doc comment): it sets the switch, runs `body`, and restores the previous state in a `finally`.
`DevAssert.test.ts` imports it; its bodies and titles stay byte-identical (the title "is restored by the helper of this
file" keeps its wording: a retitle is not in the approval; journal it as a known stale phrase). The module-globals
fitness test is not touched: the helper only calls `setAssertionsEnabled`.

## D2. The #32 predicate: `hasUnsizedEndLabel(root: ElkNode): boolean`

New `test/helpers/unsized-end-labels.ts`, with its own `unsized-end-labels.test.ts`. True when some `ElkLabel` of an
`ElkEdge` anywhere in the graph (the root's contained edges and every descendant node's, recursively) has
`CoreOptions.EDGE_LABELS_PLACEMENT` `HEAD` or `TAIL` (what `ElkGraphImporterEdges.ts:118-121` treats as an end label)
and fails `width > 0 && height > 0` (the negation of the Java assert's shape, so `NaN` counts as unsized). It reads the
graph only. It is evaluated on the root the runner is about to lay out, after the row's options are applied (a row's
options can set the placement). The same file exports `withEndLabelRule<T>(root, body)`:
`hasUnsizedEndLabel(root) ? withAssertions(false, body) : body()`. Nothing else.

## D3. Where the #32 rows are wrapped

At the narrowest shared runner of each replay family, never around a whole file, suite or `describe`. T2's census
locates them from the `AssertionError` stacks: the innermost `test/helpers/` frame of each firing test that owns the
prepared root. Expected families (planning read): labels (`layered-labels-replay-ops.ts` `runLabelsRow`,
`layered-labels-replay-full.ts` `runLabelsFullRow`, `layered-routing-replay-ops.ts` `runRoutingPrefix`), compound
(`layered-compound-replay-run.ts` `runRow`, `layered-compound-replay-stops.ts`), loops
(`layered-loops-replay-rows.ts` `replayLoopsRow`). The census is the authority, not this list. A runner wraps only the
step that lays out (not loading or comparing), through `withEndLabelRule`.

**The count.** With a temporary counter (never committed) in `withEndLabelRule`, run the 12 files of #112 and count
distinct tests that run at least one step with the predicate true. Journal the predicate (D2's text) and the count;
#127 expects 170. Every test the census lists for #32 must be among them (else stop 4). A count above 170 is
diagnosed (which tests, why the assert does not fire for them: for example a sized label sharing the cell) and
journaled; the predicate is not narrowed beyond #127's wording to hit the number (stop 5).

## D4. Where the #113 steps are wrapped

In the site's test file, around the call that violates the assert and no wider:

- **#9:** the `LayoutAlgorithmData.Builder()…create()` calls without `providerFactory` in `LayoutAlgorithmData.test.ts`
  (6), `LayoutCategoryData.test.ts` (1), `TestController.test.ts` (1), and the module-level construction in
  `PropertyConstantsDelegator.test.ts` (at load). The test that pins the later `TypeError` wraps only the `create()`;
  the fetch that throws `TypeError` stays outside the wrap if it reaches no assert, inside otherwise (census decides).
- **#12, #23, #40, #116, #123:** the named test's call into the site (#113 table).
- **#13:** in `LayeredFrameworkAdapterVectors.test.ts`, rows whose id is in a named constant set of the nine ids
  (`adapters/sweep-002, -014, -018, -026, -032, -036, -064, -065, -069`).
- **#21, #22:** in `LGraphUtilExternalPorts.test.ts` and `LayeredSiteVectors.test.ts`, rows whose id is in a named set
  of the four `site/lgraphutil/externalPorts/{free-undefined-netflow-positive,-zero,-negative,fixed-side-undefined}`
  ids, plus the unit test "sets no layer or in-layer constraint for a side that is not WEST/EAST/NORTH/SOUTH".

The census (T2) is the authority for the exact tests; this list is the planning read.

## D5. Site restoration follows dev-assert D5

Each omission comment is replaced by the `devAssert` line at the Java statement's position, Java line cite kept.

- **#9** `devAssert(() => factory != null)` (Java `!= null`; covers a `null` or `undefined` passed through a cast).
- **#12, #116** `devAssert(() => false);` first in the existing default arm; what follows stays.
- **#13** `devAssert(() => secondRatio >= firstRatio);` before the fuzzy-equals failsafe.
- **#21** `devAssert(() => layoutDirection !== Direction.UNDEFINED);`; **#22** `devAssert(() => false, () =>
  finalExternalPortSide)` in the default arm (message `UNDEFINED`, as the JVM's `AssertionError: UNDEFINED`).
- **#23** `devAssert(() => this.layer === null);` (check the TS field's null convention; `undefined` never occurs if
  the field defaults to `null`).
- **#32** `devAssert(() => labelCellRect.height > 0 && labelCellRect.width > 0);`.
- **#40** the TS `moveTree` is iterative: at each popped `(node, depth)`, `devAssert(() => layers.length - depth > 0)`
  (the size of Java's `layers.subList(depth, size)`), before the existing `IndexOutOfBoundsException` throw, which stays.
- **#123** port Java's `double lastValue = Short.MIN_VALUE` (−32768) with the loop: assert
  `group.getBarycenter() != null && group.getBarycenter() >= lastValue`, then `lastValue = group.getBarycenter()`, in
  Java's order (D5.3: a local the Java declares only for an assert is ported with it). Keep the TS barycenter type
  (float or double) as the surrounding code reads it.

A site whose `devAssert` would change narrowing, a non-null assertion, or behaviour with assertions off is stop 6.

## D6. One new test per site, with assertions on

In the site's test file (#32: `EndLabelPreprocessor.test.ts`; #9: `InstancePool.test.ts`; #13:
`HorizontalPortPlacementSizeCalculator.test.ts`; #21/#22: `LGraphUtilExternalPorts.test.ts`; the others in the file
D4 names). Each wraps its step in `withAssertions(true, …)` and asserts the thrown error is an `AssertionError`
(`src/java/lang/AssertionError.ts`) and its message (`''` without a detail; `UNDEFINED` at #22). Inputs: #13 a direct
call with a recorded `(firstRatio, secondRatio)` pair (`(0.125, 0)`, from #113); #21/#22 one of the named JVM rows'
inputs (or a direct `createExternalPortDummy` call on them); #32 a JVM row of an unsized end-label model
(`labelStacking_down_up` or a census row); the others the same input as the wrapped step, by the Java source. These
are added tests, not edits. Titles cite the Java line, e.g. `"throws AssertionError under -ea (EndLabelPreprocessor.java:377)"`.

## D7. #119

Delete `Issue447Test.test.ts`'s private `assertEqualsWithin` (`:38-45`) and import it from `test/helpers/junit-delta.ts`;
the two calls stay as they are; drop the `expect` import only if nothing else in the file uses it.

## D8. The inventory stays append-only

`plans/dev-assert/inventory.md` keeps every line; T7 appends `## Superseded by #127 (<date>)`: a table of the ten rows
with their new TS `devAssert` line and status `restored` (or the stop-4 status of a site that went back), and the
corrected status totals. The journal records the same in one row.

## D9. Sweeps at stride 1 with assertions on (T6)

The ten `test/corpus/` files that run layered: `labels-sweep`, `label-sizing-sweep`, `loops-sweep`, `phase-sweep`,
`pipeline-sweep`, `compound-sweep`, `order-sweep`, `placement-sweep`, `routing-sweep` (each with its `*_SWEEP_STRIDE=1`
where it has one, sweep dir present) and `sweep.test.ts` (the "generic sweep"). A case that fires #32 and meets D2 is
wrapped in its sweep helper (`test/helpers/*-sweep.ts`) through `withEndLabelRule`, each case id journaled. Any other
firing is stop 4. `tools/corpus/ts-layout-compare.ts` runs its workers without the vitest setup file, so assertions are
off there; it is no evidence for this mission and is not run (journal the fact).

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected, and why | Evidence |
| -------- | ------ | ----------------- | -------- |
| D1 | `test/helpers/with-assertions.ts` | Export from `src/java/lang/DevAssert.ts`: a test-only API in `src/` (YAGNI, AD-14). A second copy: the issue says move | #127 item 1; `DevAssert.test.ts:7-16` |
| D2 | Input-graph predicate on the prepared root | An explicit list of 170 test ids: brittle and not what #127 asks. A predicate on the `LabelCell` geometry: needs a hook in `src/`. Evaluating on the raw model before options: misses placements a row sets | #112 #32 evidence (unsized labels give `(0,0)`, `(0,4)`, `(4,0)`); `ElkGraphImporterEdges.ts:118-126` |
| D3 | Runner-level wrap located by stack census | Per-file or per-suite wraps: #127 forbids. Editing each of 170 tests: wide and not the "narrowest shared point" | #127 item 2 |
| D4 | Named id sets for #13, #21, #22 rows | A predicate for unsorted `FIXED_RATIO` ports: #127 says "the named rows"; wrapping every `adapters/sweep-*` row: wider than the nine that fire | #113 table |
| D5 | dev-assert D5 at each site | Leaving `lastValue` out of #123: drops the assert's operand | dev-assert D5.3 names `lastValue` |
| D6 | Direct inputs where #127 allows | A JVM run per site: #127 allows the Java source for #9, #12, #23, #40, #116, #123 | #127 item 4 |
| D8 | Append a superseding section | Editing the inventory rows: plans are archaeology | CLAUDE.md; #127 item 6 |
| D9 | `sweep.test.ts` as the generic sweep | `ts-layout-compare.ts`: assertions are off in its workers | `test/setup/dev-assertions.ts` is a vitest `setupFiles` entry only |

No change is Irreversible: test-side switch, library behaviour with assertions off unchanged; revert the one commit.
