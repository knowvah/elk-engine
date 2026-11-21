<!-- SPDX-License-Identifier: EPL-2.0 -->

# Census: what fires with the ten sites restored (T2, 2026-11-20)

Full suite at the T2 tree (ten sites live, no wraps), assertions on, sweeps off (README gate env),
`npx vitest run --reporter=json`: 1,188 files, 49,430 tests. The four `InstancePool` test files (#9) passed in that run
because their wraps were being written while it ran; they were rerun alone at their committed state, and the figures
here are the merged ones: **208 tests failed and one file failed in `beforeAll`** (`PropertyConstantsDelegator.test.ts`,
its 8 tests skipped), 20 files in all; 49,121 passed, 93 + 8 skipped. The tables count that file as one row, hence 209.

Site = the first `src/` frame under `DevAssert.ts`; a failure without such a frame is a consequence of one (stated per
table). The #32 runner frames come from a rerun of the 12 files with `NODE_OPTIONS=--stack-trace-limit=300` (the default
ten frames cut the helper frames off).

## Totals against the ruled sets

| # | Java | Fired (direct) | Consequences | Ruled set (#112 / #113) | Equal |
| - | ---- | -------------- | ------------ | ----------------------- | ----- |
| 32 | `EndLabelPreprocessor.java:377` | 170 | 6 | 170 tests in 12 files, + 6 that follow in `LayeredCompoundTwins` | yes |
| 9 | `InstancePool.java:59` | 7 | 2 | 6 + 1 + 1 tests, + `PropertyConstantsDelegator.test.ts` at load | yes |
| 12 | `NodeContext.java:277` | 1 | 0 | 1 test | yes |
| 13 | `HorizontalPortPlacementSizeCalculator.java:212` | 9 | 0 | 9 `adapters/sweep-*` rows | yes |
| 21 | `LGraphUtil.java:821` | 3 | 3 | 3 rows × 2 replays | yes |
| 22 | `LGraphUtil.java:907` | 2 | 1 | 1 row × 2 replays + 1 test | yes |
| 23 | `LNode.java:165` | 1 | 0 | 1 test | yes |
| 40 | `HighDegreeNodeLayeringProcessor.java:255` | 0 | 1 | 1 test | yes |
| 116 | `EdgeLabelSideSelection.java:58` | 1 | 0 | 1 test | yes |
| 123 | `ForsterConstraintResolver.java:239` | 2 | 0 | 2 tests | yes |

Sum: 170 + 6 + 7 + 2 + 1 + 9 + 3 + 3 + 2 + 1 + 1 + 1 + 1 + 2 = 209. No other assert fired, and no test outside the lists
of #112 (row #32) and #113 failed.

## Outside the ruled set

None. Every failing test is in #112's list for #32 or in #113's table (stop 4 does not fire in the unit suite; the
sweeps are T6).

## #32 `EndLabelPreprocessor.java:377` (`EndLabelPreprocessorPlacement.ts`, `removeLabelOverlaps`)

Three runner frames hold the prepared root and lay it out; T3 wraps these and nothing else:

| Runner frame | Tests |
| ------------ | ----- |
| `runRoutingPrefix` (`layered-routing-replay-ops.ts`) | 115 |
| `runRow` (`layered-compound-replay-run.ts`) | 36 |
| `runPlainFullRow` (`layered-labels-replay-full.ts`) | 19 |

`runRoutingPrefix` is reached directly and through `runLoopsPrefix`; `runRow` through `runToStop` and `replayFull`
(`layered-compound-replay-stops.ts`); `runPlainFullRow` through `runLabelsFullRow` and, for the loops replay,
`replayFull` (`layered-loops-replay-rows.ts`). `runLoggedFullRow` and `runInteractiveFullRow` did not fire.

Per file (equal to #112's table):

| File | Fired | Runner frame(s) |
| ---- | ----- | --------------- |
| `src/alg/layered/LayeredLabelsVectors.test.ts` | 54 | `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 36; `runPlainFullRow` (`layered-labels-replay-full.ts`) 18 |
| `src/alg/layered/intermediate/EndLabelPreprocessor.test.ts` | 44 | `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 44 |
| `src/alg/layered/LayeredCompoundVectors.test.ts` | 21 | `runRow` (`layered-compound-replay-run.ts`) 21 |
| `src/alg/layered/intermediate/EndLabelPreprocessorSides.test.ts` | 13 | `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 13 |
| `src/alg/layered/intermediate/HierarchicalNodeResizingProcessor.test.ts` | 12 | `runRow` (`layered-compound-replay-run.ts`) 12 |
| `src/alg/layered/intermediate/LabelSideSelector.test.ts` | 8 | `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 8 |
| `src/alg/layered/intermediate/LabelDummySwitcher.test.ts` | 7 | `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 7 |
| `src/alg/layered/intermediate/LabelDummyRemover.test.ts` | 6 | `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 6 |
| `test/helpers/layered-loops-replay-rows.test.ts` | 2 | `runPlainFullRow` (`layered-labels-replay-full.ts`) 1; `runRoutingPrefix` (`layered-routing-replay-ops.ts`) 1 |
| `src/alg/layered/LayeredCompoundTwins.test.ts` | 1 | `runRow` (`layered-compound-replay-run.ts`) 1 |
| `src/alg/layered/compound/CompoundGraphPostprocessorSections.rows.test.ts` | 1 | `runRow` (`layered-compound-replay-run.ts`) 1 |
| `src/alg/layered/compound/CompoundGraphPreprocessorSections.test.ts` | 1 | `runRow` (`layered-compound-replay-run.ts`) 1 |

Consequences (no `src/` frame): six `LayeredCompoundTwins.test.ts` tests ("H3 twins: the compound processors pre/post
… replays the rows that reach it with the iteration reversed") fail with `TypeError: Cannot read properties of
undefined (reading 'stats')` because the baseline test of the file threw first; #112 lists them as "6 that follow".

<details><summary>The 170 tests</summary>

| File | Test | Runner |
| ---- | ---- | ------ |
| `LayeredCompoundTwins.test.ts` | H3 twins: the compound processors replays every row in the Java order with the probes (the baseline of the twins) | `runRow` |
| `LayeredCompoundVectors.test.ts` | full rows full/include-children/edge_label_placement-hierarchy01/DOWN-ORTHOGONAL | `runRow` |
| `LayeredCompoundVectors.test.ts` | full rows full/include-children/edge_label_placement-hierarchy01/DOWN-POLYLINE | `runRow` |
| `LayeredCompoundVectors.test.ts` | full rows full/include-children/edge_label_placement-hierarchy01/DOWN-SPLINES | `runRow` |
| `LayeredCompoundVectors.test.ts` | full rows full/include-children/edge_label_placement-hierarchy01/UP-ORTHOGONAL | `runRow` |
| `LayeredCompoundVectors.test.ts` | full rows full/include-children/edge_label_placement-hierarchy01/UP-POLYLINE | `runRow` |
| `LayeredCompoundVectors.test.ts` | full rows full/include-children/edge_label_placement-hierarchy01/UP-SPLINES | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/0-n0-CompoundGraphPreprocessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/1-n0-LayerSweepCrossingMinimizer/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/10-n0/N3-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/11-n0/N2-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/12-n0/N1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/13-n0-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/14-n0-CompoundGraphPostprocessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/2-n0/N1/N1_1/N1_1_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/3-n0/N1/N1_3-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/4-n0/N1/N1_2-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/5-n0/N1/N1_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/6-n0/N2/N2_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/7-n0/N3/N3_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/8-n0/N4/N4_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredCompoundVectors.test.ts` | models rows models/edge_label_placement-hierarchy01/9-n0/N4-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-edge_labels/inline-DOWN | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-edge_labels/inline-UP | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-endLabelsWithPorts/inline-DOWN | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-endLabelsWithPorts/inline-UP | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-labelStacking_right_up/inline-DOWN | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-labelStacking_right_up/inline-UP | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-smartLabelSideSelection_right_01/inline-DOWN | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/edge_label_placement-smartLabelSideSelection_right_01/inline-UP | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/labels-edge_label_side_selection-smart_01/placement-HEAD | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/label-options/labels-edge_label_side_selection-smart_01/placement-TAIL | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-labelStacking_down_down/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-labelStacking_down_up/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-labelStacking_up_down/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-labelStacking_up_up/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-northSouthPorts_down_down_01/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-northSouthPorts_down_down_02/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-northSouthPorts_right_down_01/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | full rows full/labels/edge_label_placement-northSouthPorts_right_down_02/default | `runPlainFullRow` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_down/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_down/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_down/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_down/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_down/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_up/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_up/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_up/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_up/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_down_up/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_down/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_down/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_down/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_down/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_down/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_up/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_up/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_up/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_up/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-labelStacking_up_up/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_down_down_02/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `LayeredLabelsVectors.test.ts` | models rows models/edge_label_placement-northSouthPorts_right_down_02/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `CompoundGraphPostprocessorSections.rows.test.ts` | CompoundGraphPostprocessorSections (models rows stopping after the postprocessor) matches the oracle for models/edge_label_placement-hierarchy01/14-n0-CompoundGraphPostprocessor/DOWN | `runRow` |
| `CompoundGraphPreprocessorSections.test.ts` | CompoundGraphPreprocessor sections: the recorded preprocessor stops models/edge_label_placement-hierarchy01/0-n0-CompoundGraphPreprocessor/DOWN | `runRow` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-labelStacking_down_down/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-labelStacking_down_up/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-labelStacking_up_down/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-labelStacking_up_up/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPostprocessor (oracle rows, forward and reversed label cell order) replays models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_POSTPROCESSOR/default in both orders | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_02/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_POSTPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_PREPROCESSOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessor.test.ts` | EndLabelPreprocessor (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_02/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_PREPROCESSOR/default gives the recorded cells under BELOW and the Java alignments of the non-ABOVE arms | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_PREPROCESSOR/default replays the recorded row with LABEL_SIDE unset (the BELOW arms) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_down_down_01/root/END_LABEL_PREPROCESSOR/default takes the ABOVE arms: the Java alignments, the cell on the above side of the anchor (java:285,305,325,345) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_PREPROCESSOR/default gives the recorded cells under BELOW and the Java alignments of the non-ABOVE arms | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_PREPROCESSOR/default replays the recorded row with LABEL_SIDE unset (the BELOW arms) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_down_down_02/root/END_LABEL_PREPROCESSOR/default takes the ABOVE arms: the Java alignments, the cell on the above side of the anchor (java:285,305,325,345) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_PREPROCESSOR/default gives the recorded cells under BELOW and the Java alignments of the non-ABOVE arms | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_PREPROCESSOR/default replays the recorded row with LABEL_SIDE unset (the BELOW arms) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_right_down_01/root/END_LABEL_PREPROCESSOR/default takes the ABOVE arms: the Java alignments, the cell on the above side of the anchor (java:285,305,325,345) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_PREPROCESSOR/default gives the recorded cells under BELOW and the Java alignments of the non-ABOVE arms | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_PREPROCESSOR/default replays the recorded row with LABEL_SIDE unset (the BELOW arms) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) models/edge_label_placement-northSouthPorts_right_down_02/root/END_LABEL_PREPROCESSOR/default takes the ABOVE arms: the Java alignments, the cell on the above side of the anchor (java:285,305,325,345) | `runRoutingPrefix` |
| `EndLabelPreprocessorSides.test.ts` | EndLabelPreprocessor per port side (T17a) places end labels on all four port sides across the rows | `runRoutingPrefix` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/10-n0/N3-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/11-n0/N2-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/12-n0/N1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/13-n0-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/2-n0/N1/N1_1/N1_1_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/3-n0/N1/N1_3-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/4-n0/N1/N1_2-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/5-n0/N1/N1_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/6-n0/N2/N2_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/7-n0/N3/N3_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/8-n0/N4/N4_1-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `HierarchicalNodeResizingProcessor.test.ts` | HierarchicalNodeResizingProcessor (T1 models stops after the resizer) reproduces the tree of models/edge_label_placement-hierarchy01/9-n0/N4-HierarchicalNodeResizingProcessor/DOWN | `runRow` |
| `LabelDummyRemover.test.ts` | LabelDummyRemover (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LabelDummyRemover.test.ts` | LabelDummyRemover (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LabelDummyRemover.test.ts` | LabelDummyRemover (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LabelDummyRemover.test.ts` | LabelDummyRemover (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LabelDummyRemover.test.ts` | LabelDummyRemover (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LabelDummyRemover.test.ts` | LabelDummyRemover (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_DUMMY_REMOVER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_DUMMY_SWITCHER/default | `runRoutingPrefix` |
| `LabelDummySwitcher.test.ts` | LabelDummySwitcher (the rows are not vacuous) the state with the processor idle differs from the recorded state after it | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-labelStacking_down_down/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-labelStacking_down_up/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-labelStacking_up_down/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-labelStacking_up_up/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_01/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-northSouthPorts_down_down_02/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_01/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `LabelSideSelector.test.ts` | LabelSideSelector (oracle rows) replays models/edge_label_placement-northSouthPorts_right_down_02/root/LABEL_SIDE_SELECTOR/default | `runRoutingPrefix` |
| `layered-loops-replay-rows.test.ts` | replay of the landed layered-labels.json through the new helpers replays every full row with no mismatch | `runPlainFullRow` |
| `layered-loops-replay-rows.test.ts` | replay of the landed layered-labels.json through the new helpers replays every models row with no mismatch | `runRoutingPrefix` |

</details>

## #9 `InstancePool.java:59`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/core/data/LayoutAlgorithmData.test.ts` | LayoutAlgorithmData answers knowsOption and getDefaultValue alike for a property and its id | `LayoutAlgorithmData.test.ts:40` |
| `src/core/data/LayoutAlgorithmData.test.ts` | LayoutAlgorithmData defaults to no features, null values and an empty id | `LayoutAlgorithmData.test.ts:73` |
| `src/core/data/LayoutAlgorithmData.test.ts` | LayoutAlgorithmData follows the id-based Java object contract | `LayoutAlgorithmData.test.ts:40` |
| `src/core/data/LayoutAlgorithmData.test.ts` | LayoutAlgorithmData lists known option ids in Java HashMap order | `LayoutAlgorithmData.test.ts:40` |
| `src/core/data/LayoutAlgorithmData.test.ts` | LayoutAlgorithmData orders single-character ids by their hash buckets, not insertion order | `LayoutAlgorithmData.test.ts:40` |
| `src/core/data/LayoutCategoryData.test.ts` | LayoutCategoryData collects layouters and follows the id-based Java object contract | `LayoutCategoryData.test.ts:31` |
| `src/core/testing/TestController.test.ts` | TestController targets only algorithm data with the same id | `TestController.test.ts:52` |
| `src/core/data/LayoutAlgorithmData.test.ts` | LayoutAlgorithmData fails with a TypeError on first fetch when no provider factory was configured (D10: NPE) | `LayoutAlgorithmData.test.ts:133` (consequence) |
| `src/core/util/PropertyConstantsDelegator.test.ts` | (the file, in `beforeAll`) | `PropertyConstantsDelegator.test.ts:21` (consequence) |

Every direct failure is a `LayoutAlgorithmData.Builder()…create()` without `providerFactory` (`LayoutAlgorithmData.ts:159`). Consequences: the `TypeError` test got the `AssertionError` from the `create()` inside its `expect` callback (the `fetch()` reaches no assert), and `PropertyConstantsDelegator.test.ts` failed as a file because its `beforeAll` builds such a data object.

## #12 `NodeContext.java:277`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/common/nodespacing/internal/NodeContext.test.ts` | NodeContext comparators returns 0 for two ports without a side (the Java default arm, assert false at :277) | `NodeContext.test.ts:261` |

The `comparePortContexts` call inside the `expect`; `contextsFor` does not reach the arm.

## #13 `HorizontalPortPlacementSizeCalculator.java:212`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-002 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-014 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-018 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-026 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-032 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-036 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-064 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-065 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |
| `src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts` | layered-framework.json adapters rows adapters/sweep-069 | `replay(row)`, `LayeredFrameworkAdapterVectors.test.ts:267` |

All nine through `replay(row)` (`NodeDimensionCalculation` straight after import); reached from the horizontal and, through `VerticalPortPlacementSizeCalculator.ts:231`, the vertical calculator. No other `adapters` row fires.

## #21 `LGraphUtil.java:821` and #22 `LGraphUtil.java:907`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/layered/graph/LGraphUtilExternalPorts.test.ts` | createExternalPortDummy and getExternalPortPosition (oracle rows) site/lgraphutil/externalPorts/free-undefined-netflow-negative | `LGraphUtilExternalPorts.test.ts:346` |
| `src/alg/layered/graph/LGraphUtilExternalPorts.test.ts` | createExternalPortDummy and getExternalPortPosition (oracle rows) site/lgraphutil/externalPorts/free-undefined-netflow-positive | `LGraphUtilExternalPorts.test.ts:346` |
| `src/alg/layered/graph/LGraphUtilExternalPorts.test.ts` | createExternalPortDummy and getExternalPortPosition (oracle rows) site/lgraphutil/externalPorts/free-undefined-netflow-zero | `LGraphUtilExternalPorts.test.ts:346` |
| `src/alg/layered/LayeredSiteVectors.test.ts` | layered-sites.json replay site/lgraphutil/externalPorts/free-undefined-netflow-negative | `layered-site-replay.ts:170` (consequence) |
| `src/alg/layered/LayeredSiteVectors.test.ts` | layered-sites.json replay site/lgraphutil/externalPorts/free-undefined-netflow-positive | `layered-site-replay.ts:170` (consequence) |
| `src/alg/layered/LayeredSiteVectors.test.ts` | layered-sites.json replay site/lgraphutil/externalPorts/free-undefined-netflow-zero | `layered-site-replay.ts:170` (consequence) |
| `src/alg/layered/graph/LGraphUtilExternalPorts.test.ts` | createExternalPortDummy and getExternalPortPosition (oracle rows) site/lgraphutil/externalPorts/fixed-side-undefined | `LGraphUtilExternalPorts.test.ts:346` |
| `src/alg/layered/graph/LGraphUtilExternalPorts.test.ts` | createExternalPortDummy: side-specific properties sets no layer or in-layer constraint for a side that is not WEST/EAST/NORTH/SOUTH | `LGraphUtilExternalPorts.test.ts:112` |
| `src/alg/layered/LayeredSiteVectors.test.ts` | layered-sites.json replay site/lgraphutil/externalPorts/fixed-side-undefined | `layered-site-replay.ts:170` (consequence) |

In `LayeredSiteVectors.test.ts` the `AssertionError` is thrown inside `replayRow` (`layered-site-replay.ts`), whose later `state` step then reports "unknown name dummy": a consequence, four rows.

## #23 `LNode.java:165`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/layered/graph/LNode.test.ts` | LNode defaults falls back to the layer graph while no graph is set | `LNode.test.ts:58` |

The `node.setGraph(other)` line.

## #40 `HighDegreeNodeLayeringProcessor.java:255`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/layered/intermediate/HighDegreeNodeLayeringProcessor.test.ts` | HighDegreeNodeLayeringProcessor (deep trees, B8) throws as Java does when a tree is deeper than the layers it is moved into | `HighDegreeNodeLayeringProcessor.test.ts:291` (consequence) |

The `moveTree` call inside the `expect(...).toThrow(/out of bounds/)` callback threw the `AssertionError` (message `''`) instead.

## #116 `EdgeLabelSideSelection.java:58`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/layered/options/EdgeLabelSideSelection.test.ts` | EdgeLabelSideSelection.transpose default arm returns null for a receiver that is no constant | `EdgeLabelSideSelection.test.ts:103` |

The `Reflect.apply(transpose, {}, [])` inside the `expect`.

## #123 `ForsterConstraintResolver.java:239`

| File | Test | Frame of the violating call |
| ---- | ---- | --------------------------- |
| `src/alg/layered/p3order/ForsterConstraintResolver.test.ts` | ForsterConstraintResolver: processConstraints compares barycenters as floats: a double difference below the float precision is a tie | `ForsterConstraintResolver.test.ts:128` |
| `src/alg/layered/p3order/ForsterConstraintResolver.test.ts` | ForsterConstraintResolver: processConstraints leaves an unconstrained layer and its barycenters alone | `ForsterConstraintResolver.test.ts:78` |

Both `processConstraints(nodes)` calls. The second test (`1 + 1e-10`, then `1`) fires too: the assert compares doubles (`>= lastValue`), the tie is a `float` one.

