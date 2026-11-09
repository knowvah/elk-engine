<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Ports: labels, end labels, comments, unzipper, debug utilities, visitor

Eight ports with disjoint write-sets, **in parallel**. Each proves its class on its `scenarios`/`models` rows of
`layered-labels.json` with the class injected; `GraphConfigurator`, the driver and the enum arms stay as landed, so the 12 arms
still throw `UnsupportedOperationException` naming 7f2 until T11. A class test injects its class through the row's `Factories`
(`createProcessor`) or a wrapper around `IntermediateProcessorStrategy.valueOf(name).create()` that substitutes the class
(7f's batch-2 overview describes the pattern).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4a | `LabelDummyInserter`, `LabelDummyRemover` ([brief](T4a-label-dummies.md)) | typescript-pro | src/alg/layered/intermediate/{LabelDummyInserter,LabelDummyRemover}*.ts + tests | T1, T2, T3 | [x] |
| T4b | `LabelDummySwitcher` unstaged, `LabelDummySwitcherLabelDummyInfo` ([brief](T4b-label-dummy-switcher.md)) | typescript-pro | src/alg/layered/intermediate/LabelDummySwitcher*.ts + tests | T1, T2, T3 | [x] |
| T5  | `LabelSideSelector`, `LabelManagementProcessor` ([brief](T5-side-selector-and-label-management.md)) | typescript-pro | src/alg/layered/intermediate/{LabelSideSelector,LabelManagementProcessor}*.ts + tests | T1, T2, T3 | [x] |
| T6  | `EndLabelPreprocessor`, `EndLabelPostprocessor` ([brief](T6-end-labels.md)) | typescript-pro | src/alg/layered/intermediate/{EndLabelPreprocessor,EndLabelPostprocessor}*.ts + tests | T1, T2, T3 | [x] |
| T7  | `CommentPreprocessor`, `CommentNodeMarginCalculator`, `CommentPostprocessor` ([brief](T7-comments.md)) | typescript-pro | src/alg/layered/intermediate/Comment{Preprocessor,NodeMarginCalculator,Postprocessor}*.ts + tests | T1, T2 | [x] |
| T8  | `AlternatingLayerUnzipper` ([brief](T8-alternating-unzipper.md)) | typescript-pro | src/alg/layered/intermediate/unzipping/** | T1, T2 | [x] |
| T9  | `DotDebugUtil`, `JsonDebugUtil`, `DebugUtil` unstaged ([brief](T9-debug-utilities.md)) | typescript-pro | src/alg/layered/{DotDebugUtil,JsonDebugUtil,DebugUtil}*.ts + tests, src/alg/layered/p4nodes/LinearSegmentsNodePlacer.test.ts | T1, T2 | [x] |
| T10 | `InteractiveLayeredGraphVisitor` ([brief](T10-interactive-visitor.md)) | typescript-pro | src/alg/layered/InteractiveLayeredGraphVisitor*.ts + tests | T1, T2 | [x] |

Unstaging keeps the `// @staged 7f2` header marker in `LabelDummySwitcher.ts` and `DebugUtil.ts` until T11: the fitness test
(`staged-classes.fitness.test.ts:22`) requires marker and `staged-classes.json` row to agree, and the json is T11's (G11). T9 also changes the
`ConstraintsPostprocessor.test.ts` logging case that pins the `DebugUtil` throw (G11), so no test is red after this batch.

The batch is done when all eight tasks pass their acceptance criteria and the README gates are green.
Agents never run `npm run coverage` and never commit; the orchestrator commits per task.
