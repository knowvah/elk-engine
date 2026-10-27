<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3a — Replay test and the T2, T3, T5 sites

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T3a): replay nodespacing site vectors and re-anchor context sites`
`S` = `src/alg/common/nodespacing`.

## Context

Mission 6c (README). T2 recorded `test/golden/refs/java/nodespacing-sites.json`. This task writes the generic replay
(the oracle-anchored authority, D1) and re-anchors three of the five flagged tests. Pattern: `src/alg/common/NodeMicroLayoutVectors.test.ts`
and `test/helpers/node-micro-layout-replay.ts`. A mismatch is diagnosed, never fixed by editing the JSON or `src/`
(stops 4, 5, 7).

## Task

1. **`test/helpers/nodespacing-site-replay.ts`:** for a row, import `input` with `ElkGraphJson.forGraph(JSON.stringify(input)).toElk()`
   (or skip when `null`), adapt, build the `NodeContext`, apply `steps` (D7 vocabulary; `cell` addresses a
   `NodeContext` field), run the site's call sequence (one function per `site`, mirroring the T2 header), collect the
   site's `expected` shape, decode hex doubles with `longBitsToDouble`.
2. **`S/NodespacingSiteVectors.test.ts`:** `it.each` over rows; numbers within 1e-6, everything else exact; per-site
   counts asserted against `rowCounts`; the JSON loaded once.
3. **Re-anchor (D1, D4):**
   - `S/internal/NodeLabelLocation.test.ts:146-150`: restore `{OUTSIDE, V_TOP, H_LEFT, H_PRIORITY}` as its own case
     asserting the oracle's `OUT_L_T` (`NodeLabelLocation.java` OUT_L_T set); keep the `UNDEFINED` cases. Annotate
     with the row ids.
   - `S/internal/algorithm/NodeLabelAndSizeUtilities.test.ts:306-325`: the port order `[[10,20],[11,21]]` annotated
     with `applyStuff/…`; comment: NORTH is created first and `portContexts` iterates NORTH before EAST
     (`NodeContext.java:250-255`).
   - `S/NodeMarginCalculator.test.ts:116-129`: `[0,0,0,104]` annotated with `sidelessPortMargins/…`; comment cites
     `ElkGraphAdapters.java:303-311` (port edges are node edges) and `NodeMarginCalculator.java` processing the
     label twice.
4. If a literal disagrees with its row, do not change either: stop with the diagnosis artifact.

## Write-set

`S/NodespacingSiteVectors.test.ts`, `S/internal/NodeLabelLocation.test.ts`,
`S/internal/algorithm/NodeLabelAndSizeUtilities.test.ts`, `S/NodeMarginCalculator.test.ts`,
`test/helpers/nodespacing-site-replay.ts` (new).

## Read-set

- `test/golden/refs/java/nodespacing-sites.json` (header and a few rows; it is small), `tools/vectors/NodespacingSiteVectors.java`
  header comment.
- `src/alg/common/NodeMicroLayoutVectors.test.ts`, `test/helpers/node-micro-layout-replay.ts`,
  `test/helpers/{node-context-fixtures,node-margin-fixtures,cell-creator-fixtures,port-placement-fixtures}.ts`
  (read only).
- `decisions.md` D1, D4, D7.

## Interface contract

Input: T2's JSON (`batch-2/T2-site-recorder.md#interface-contract-output-consumed-by-t3a-t3b`). Output: the helper's
`replayRow(row)` is shared with nothing else; T3b asserts literals only.

## Acceptance criteria

- Given every row, when replayed, then numbers match within 1e-6 and all other values exactly; per-site counts equal
  `rowCounts`.
- Given the restored set `{OUTSIDE, V_TOP, H_LEFT, H_PRIORITY}`, when `fromNodeLabelPlacement` runs, then it returns
  `OUT_L_T`, and the unmatched set still returns `UNDEFINED`.
- Given the three re-anchored tests, when read, then each literal carries its row id and a comment naming the Java
  mechanism (`file:line`).

## Observability / Rollback

N/A — tests only. Reversible: revert the commit.
