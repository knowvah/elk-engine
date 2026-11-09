<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Anchored unit tests

Two tasks with disjoint write-sets, **in parallel**. Each colocated class test gains cases whose literals equal a row (S and J items of
`unreached.md` for its classes), with a mutation check in a scratch copy. 7f's T16a/T16b are the pattern. No `src/` non-test edit.

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T17a | Anchored tests, label classes ([brief](T17a-label-anchored-tests.md)) | typescript-pro | src/alg/layered/intermediate/{LabelDummyInserter,LabelDummyRemover,LabelDummySwitcher,LabelSideSelector,LabelManagementProcessor,EndLabelPreprocessor,EndLabelPostprocessor}*.test.ts | T16 | [x] |
| T17b | Anchored tests, comments, unzipper, debug utilities, visitor ([brief](T17b-other-anchored-tests.md)) | typescript-pro | src/alg/layered/intermediate/{Comment{Preprocessor,NodeMarginCalculator,Postprocessor}*.test.ts,unzipping/**/*.test.ts}, src/alg/layered/{DotDebugUtil,JsonDebugUtil,InteractiveLayeredGraphVisitor}*.test.ts | T16 | [x] |

`src/alg/layered/DebugUtil.test.ts` was T9's (G11) and stays. Mutation copies need copies of `test/helpers` and `test/corpus`, not symlinks
(`.agent-notes/layered-edge-routing.md`). After the batch the orchestrator runs coverage alone (stop 10: below 90/90/90/90 after T17
except shortfalls journaled as U). The batch is done when both tasks pass and the README gates are green.
