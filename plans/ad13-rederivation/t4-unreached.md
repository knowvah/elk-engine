<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 branches unreached by the 326-row replay (T1, D3)

Measured 2026-10-27 on `feature/ad13-rederivation` (tree = `main` at `51e7235` plus the brief): one run of
`src/alg/common/NodeMicroLayoutVectors.test.ts` with v8 coverage restricted to the three T4 files (load 3.2). Totals for
the three files: statements 334/355, branches 132/158, functions 46/49. The run itself passed; the coverage-threshold
error it printed only reflects the restricted include list.

`H` = `src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.ts`, `V` = `…/VerticalPortPlacementSizeCalculator.ts`,
`P` = `…/PortPlacementCalculator.ts`; Java `HJ`/`VJ`/`PJ` = the same names under
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common/nodespacing/internal/algorithm/`.
Test files are the colocated `.test.ts` files (`H.test`, `V.test`, `P.test`).

## Every uncovered branch

"T" means the branch's true arm was never taken; "F" means the implicit else (condition false) was never taken.

| TS file:line | Java line | Branch never taken | Covered by T4 test (file:line) | Row |
| --- | --- | --- | --- | --- |
| H:150 | HJ:173 | T: right surrounding margin > 0 (FIXED_RATIO) | `FIXED_RATIO > respects surrounding margins and port-port spacing at the ratios` (H.test:100) | 1 |
| H:154 | HJ:178 (`portLabelsInside`, HJ:122) | F: label placement without INSIDE | same test (H.test:100; default placement `[OUTSIDE]`) | 1 |
| H:154 | HJ:178 | T: INSIDE placement | `FIXED_RATIO > includes the right port margin at the end only for INSIDE labels` (H.test:112, `it.each` INSIDE) | 2 |
| H:222 | HJ:147 | T: left surrounding margin > 0 (FIXED_RATIO) | H.test:100 | 1 |
| H:274/276 | HJ:215-218 | F: ratios differ by more than `EQUALITY_TOLERANCE` | H.test:100 (ratios 0, 0.25, 0.75, 1); also `minSizeRequiredToRespectSpacing > divides when…` (H.test:193) | 1 (14 optional) |
| H:310 | HJ:254 | F: free side whose alignment is not DISTRIBUTED | H.test:296, H.test:286, H.test:330 (all `labelContext`, BEGIN) | 3, 4, 5 |
| H:405 | HJ:349 | F: no label width and a non-fixed placement | `… > equalizes the margins for uniform port spacing, then resets the outermost ones` (H.test:296; unlabelled ports, `[OUTSIDE]`) | 3 |
| H:418 | HJ:337 | F: label next to the port no wider than the port | `… > keeps a narrow label next to its port without a margin` (H.test:286) | 4 |
| H:438 | HJ:353 | T: fixed label sticking out to the left | `… > widens margins by fixed labels that stick out of the port` (H.test:330) | 5 |
| H:442 | HJ:357 | F: fixed label bounds ending inside the port | H.test:330 (second, unlabelled port: `getLabelsBounds` returns the empty rectangle, `ElkUtilLabels.ts:37-40`); also H.test:341 | 5 |
| V:142 | VJ:172 | T: bottom surrounding margin > 0 (FIXED_RATIO) | `FIXED_RATIO > respects surrounding margins and port-port spacing at the ratios` (V.test:101) | 6 |
| V:147 | VJ:177 (`portLabelsInside`, VJ:120) | F: label placement without INSIDE | V.test:101 | 6 |
| V:147 | VJ:177 | T: INSIDE placement | `FIXED_RATIO > includes the bottom port margin at the end only for INSIDE labels` (V.test:112, `it.each` INSIDE) | 7 |
| V:203 | VJ:146 | T: top surrounding margin > 0 (FIXED_RATIO) | V.test:101 | 6 |
| V:268 | VJ:226 | F: free side whose alignment is not DISTRIBUTED | V.test:296, V.test:342 (`labelContext`, BEGIN) | 8, 9 |
| V:380 | VJ:309 | F: label next to the port no taller than the port | `… > keeps a short label next to its port without a margin` (V.test:296) | 8 |
| V:423 | VJ:336 | T: fixed label sticking out at the top | `… > widens margins by fixed labels that stick out of the port` (V.test:342) | 9 |
| V:427 | VJ:340 | F: fixed label bounds ending inside the port | V.test:342 (second, unlabelled port); also V.test:353 | 9 |
| P:148 | PJ:218 | T: `PORT_BORDER_OFFSET` set on a NORTH/SOUTH port | `placeHorizontalPorts, free ports > applies the border offset to the y coordinate` (P.test:180) | 10 |
| P:149-151 | PJ:219-221 | both arms of the side test under a border offset | P.test:180 (one NORTH, one SOUTH port) | 10 |
| P:280 | PJ:132, PJ:308 | `=== JUSTIFIED` operand never evaluated (every alignment reached was DISTRIBUTED) | P.test:180, P.test:153 (BEGIN); P.test:108 (JUSTIFIED) | 10, 11, 13 |
| P:334 | PJ:167, PJ:343 | `case BEGIN` in the aligning switch | P.test:180, P.test:153 | 10, 11 |
| P:342 | PJ:175, PJ:351 | `case END` | `… > places nothing on empty sides and handles both sides with their own alignment` (P.test:153; SOUTH END) | 11 |
| P:356 | PJ:188, PJ:364 | `case JUSTIFIED` (multi-port, enough space) | `… > aligns three ports JUSTIFIED in a wide cell` (P.test:99, `it.each` JUSTIFIED) | 12 |
| P:382 | PJ:416-420 | F: old alignment not DISTRIBUTED when falling back to CENTER | `… > centers a single port with JUSTIFIED alignment` (P.test:108, `it.each` JUSTIFIED) | 13 |
| H:42, V:35, P:46 | HJ:41, VJ:39, PJ:52 | private no-instance constructors (function, not branch) | unreachable from any input: private, never invoked by the Java or the TS | — |

## Scenarios for T2 (minimal cover)

| Row | id (proposed) | Covering T4 test | Calls | Asserted values | Steps needed |
| --- | --- | --- | --- | --- | --- |
| 1 | `t4/h-fixed-ratio-surrounding` | H.test:100 | `calculateHorizontalPortPlacementSize` | NORTH size 24, left padding 0 | none |
| 2 | `t4/h-fixed-ratio-inside-end-margin` | H.test:112 (INSIDE) | same | NORTH size 44 | **sets `portMargin.left/right` = 1/5 on both NORTH contexts: outside D7** |
| 3 | `t4/h-uniform-unlabelled` | H.test:296 | same | margins `[[0,12],[0,12],[0,0]]`, size 50 | none |
| 4 | `t4/h-narrow-next-to-port` | H.test:286 | same | margins `[[0,0]]` | none |
| 5 | `t4/h-fixed-labels` | H.test:330 | same | margins `[[3,5],[0,0]]`, size 22 | none |
| 6 | `t4/v-fixed-ratio-surrounding` | V.test:101 | `calculateVerticalPortPlacementSize` | EAST size 24, top padding 0 | none |
| 7 | `t4/v-fixed-ratio-inside-end-margin` | V.test:112 (INSIDE) | same | EAST size 44 | **sets `portMargin.top/bottom` = 1/5 on both EAST contexts: outside D7** |
| 8 | `t4/v-short-next-to-port` | V.test:296 | same | margins `[[0,0]]` | none |
| 9 | `t4/v-fixed-labels` | V.test:342 | same | margins `[[3,5],[0,0]]`, size 22 | none |
| 10 | `t4/p-border-offset` | P.test:180 | horizontal size calc, then `placeHorizontalPorts` | NORTH ys `[-5]`, SOUTH ys `[3]` | `setCellRectangle` NORTH and SOUTH (0, 0, 100, 0) |
| 11 | `t4/p-begin-end` | P.test:153 | same | NORTH xs `[0,12]`, SOUTH xs `[86,98]`, SOUTH ys `[0,0]`, EAST empty | `setCellRectangle` NORTH and SOUTH |
| 12 | `t4/p-justified-wide` | P.test:99 (JUSTIFIED) | same | NORTH xs `[0,49,98]` | `setCellRectangle` NORTH |
| 13 | `t4/p-justified-single` | P.test:108 (JUSTIFIED) | same | NORTH xs `[49]` | `setCellRectangle` NORTH |
| 14 (optional) | `t4/min-size-tolerance` | H.test:181-196 | `minSizeRequiredToRespectSpacing` direct (`input: null`) | the seven asserted triples | none |

`sizeHorizontalCell(context, side, width)` with default paddings writes `x = 0`, `width`, and paddings that are
already 0 after the free-port size calculation (no surrounding margins in rows 10–13). So it equals
`setCellRectangle(cell, 0, 0, width, 0)` on a fresh `AtomicCell`.

**Count: 13 scenarios in the minimal cover, 14 with the optional tolerance row. That is above "about 10", so stop 8
applies.** Two of the 13 (rows 2 and 7) also need a `portMargin` mutation the D7 `steps` vocabulary lacks (stop 6 at
T2). No smaller cover exists: rows 2, 7 (INSIDE end margin), 3 (H:405 F), 4/8 (next-to-port F), 5/9 (fixed label
T), 10 (border offset), 12 (JUSTIFIED switch arm) and 13 (single-port fallback) each cover a branch no other T4 test
covers. Row 1/6 is the only test with non-zero surrounding margins that does not mutate `portMargin`, and row 11 is the
only test reaching `case END` besides P.test:99/131.

## Notes

- **Known candidate, `−Infinity` spacing** (`PortPlacementCalculator.java:110-209`): the cram arm that divides by
  `portCount − 1` (P:307) **is** reached by the replay, so it is not a row. The replay's free ports are all DISTRIBUTED
  (no landed row sets a port alignment), so the arm is reached through the single-port fallback to CENTER.
- **Known candidate, `minSizeRequiredToRespectSpacing`**: the replay reaches only the `fuzzyEquals` arm. Row 1 reaches
  the division arm. The tolerance boundary (`minSize(5, 0, 0.01) = 0`) is asserted only by a TS literal; row 14 would
  pin it to the oracle (Guava `DoubleMath.fuzzyEquals` semantics).
- **Shared TS helpers**: the Java free-placement code is duplicated for the horizontal and vertical axes
  (PJ:132/308, 167/343, 175/351, 188/364). The TS shares one helper, so each uncovered P arm stands for two Java sites
  that the replay reaches on neither axis.
