<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: the TS text-measurer seam

**Agent:** `typescript-pro`, sonnet, with [agent-rules.md](../agent-rules.md). **Decisions:** TX3, TX4, TX5, TX6(a).
**Writes:** `test/helpers/layout-test-text-measurer.ts`, `test/helpers/layout-test-text-measurer.test.ts`,
`test/helpers/layout-test-labels.ts`, `test/helpers/layout-test-runner.ts` (a few lines only; it has 445 of 500),
`test/golden/label-sizing.test.ts`.

## Context

The Java framework now measures label text through `TextMeasurer` (patch 0003). The TS port of that framework lives in
`test/helpers/` (FX8). Today `layout-test-labels.ts` hard-wires the FX8 snapshot table. This task makes the measurement
injectable, the TS twin of the patch, keeping the snapshot as the default, so that no current test changes. It then shows,
against T2's ref, that the TS path sizes every label of every vendored label-bearing model exactly as the oracle does, and
lays the model out as the oracle does.

## Read-set

- `test/helpers/layout-test-labels.ts` (all 62 lines); `test/helpers/layout-test-labels.test.ts:1-40`
- `test/helpers/layout-test-runner.ts:260-275,410-425` (the sizing call, the `env` parameter pattern)
- `test/golden/refs/java/label-sizing.json` (T2's contract: [T2](../batch-2/T2-label-sizing-recorder.md#program-contract))
- `src/core/math/KVector.ts` (constructor and fields); `src/graph/text/ElkGraphText.ts` (loading `.elkt`)
- `test/helpers/graph-json-oracle.ts` (`exportLikeOracle`), `test/golden/compare-json.ts` (`compareLayout`, `formatDiffs`,
  `DEFAULT_TOLERANCE`)
- `test/helpers/layout-test-sources.ts:1-40` (how `.elkt` is loaded and `registerLayered` is called);
  `tools/corpus/ts-layout-pipeline.ts` (registering the other algorithms, if a vendored model needs one)

## Interface (TX5)

```ts
/** @see org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TextMeasurer.java (patch 0003) */
export interface TextMeasurer { measure(text: string): KVector }   // x = width, y = height
export const TEXT_MEASURER_ENV = 'ELK_TEST_TEXT_MEASURER';
export const AWT_SNAPSHOT_TEXT_MEASURER: TextMeasurer;   // LABEL_SIZES lookup; unknown text throws today's message
export const FIXED_ADVANCE_TEXT_MEASURER: TextMeasurer;  // new KVector(text.length * 6, 12)
export function textMeasurerFrom(env: Readonly<Record<string, string | undefined>>): TextMeasurer;
// unset or 'awt' gives AWT_SNAPSHOT_TEXT_MEASURER, 'fixed' gives FIXED_ADVANCE_TEXT_MEASURER,
// anything else throws Error(`Unknown text measurer: ${value}`)
```

`layout-test-labels.ts` keeps exporting `LABEL_SIZES` and `ensureSensibleLabelSize`, and the latter gains
`measurer: TextMeasurer = AWT_SNAPSHOT_TEXT_MEASURER`. `computeLabelSize` keeps the guard and the order (height, then
width). The runner passes `textMeasurerFrom(env)` from the `env` it already receives. Name the Java classes in `@see`
comments as the patched oracle has them (`$ELK_ORACLE_DIR/test/org.eclipse.elk.alg.test/...`). They do not exist in
`../elk`, so say "patch 0003" in the comment.

## Tests

1. `layout-test-text-measurer.test.ts`: every `texts` row of the ref equals `FIXED_ADVANCE_TEXT_MEASURER.measure`.
   `textMeasurerFrom` is tested on unset, `awt`, `fixed` and an unknown value; the error message is asserted. The snapshot
   measurer returns `LABEL_SIZES` values and throws on an unknown text (assert the exact message).
2. `test/golden/label-sizing.test.ts`: for each ref model, load the `.elkt` through the TS loader, apply
   `ensureSensibleLabelSize(graph, FIXED_ADVANCE_TEXT_MEASURER)`, derive the same keys (the format in T2's program header),
   and compare every `[w, h]` and `preset` exactly with the ref. Then lay out and compare `exportLikeOracle` with the ref's
   `layout` through `compareLayout` at `DEFAULT_TOLERANCE`. A `throws` row expects the same Java class name on the TS side.
   The set of keys must be equal both ways, so that no label is skipped on either side.
3. Existing tests stay unchanged: `layout-test-labels*.test.ts`, `layout-test-runner.test.ts`,
   `SortByInputModelProcessorTest.test.ts`.

A failing row in step 2 is a divergence: follow stop 6. Diagnose, and never touch the ref.

## Acceptance criteria

- Given the env variable unset, when the runner sizes a label, then it uses the FX8 snapshot, and every existing runner test
  passes unchanged.
- Given `ELK_TEST_TEXT_MEASURER=fixed`, when `buildLayoutTests` builds a suite, then the label sizes are `[length × 6, 12]`.
- Given `ELK_TEST_TEXT_MEASURER=bogus`, when the runner builds a suite, then it throws `Unknown text measurer: bogus`.
- Given every model in `label-sizing.json`, when TS sizes and lays it out in fixed mode, then the key sets are equal, every
  size and `preset` is equal, and the layout matches at 1e-6.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible (revert the five files).
