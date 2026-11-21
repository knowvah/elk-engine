<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: dev-assert-restore (issue #127, 2026-11-20)

## Observation: the #32 rows run through three replay families, not one helper

- **Context**: Looking for #127's "narrowest shared point" for the 170 tests of #112 row #32.
- **Finding**: The 12 files reach layout through labels (`layered-labels-replay-ops.ts` `runLabelsRow`,
  `layered-labels-replay-full.ts` `runLabelsFullRow`, `layered-routing-replay-ops.ts`), compound
  (`layered-compound-replay-run.ts` `runRow`, `layered-compound-replay-stops.ts`) and loops
  (`layered-loops-replay-rows.ts` `replayLoopsRow`) runners. The only common point is `loadInput`
  (`layered-phase-replay-rows.ts:128`), which builds the root but does not lay it out, so it cannot carry the wrap.
- **Impact**: The wrap goes into each family's runner; T2's `AssertionError` stacks locate them exactly.
- **Confidence**: Medium (read at planning, not run)

## Observation: assertions are off in `ts-layout-compare` workers

- **Context**: Choosing which "generic sweep" #127 means.
- **Finding**: `setAssertionsEnabled` is called only by `test/setup/dev-assertions.ts`, a vitest `setupFiles` entry.
  `tools/corpus/ts-layout-compare.ts` lays out in child workers outside vitest, so every `devAssert` there is off.
- **Impact**: Its parity runs are no evidence about asserts; `test/corpus/sweep.test.ts` is the generic sweep file.
- **Confidence**: High

## Observation: end labels are decided by the label's own placement

- **Context**: Defining the #32 predicate on the input graph.
- **Finding**: `ElkGraphImporterEdges.ts:118-121` marks a label an end label when its `EDGE_LABELS_PLACEMENT` is
  `HEAD` or `TAIL`; the property is the label's, so a row's applied options can change it.
- **Impact**: Evaluate the predicate on the prepared root, after options.
- **Confidence**: High
