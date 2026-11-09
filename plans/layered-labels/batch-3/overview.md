<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Wiring, pre-approved assertions, unpinning

One task, **serial** after batch 2: T11 wires the 12 arms, applies G11's pre-approved assertion changes (and only those),
deletes the 59 pins of G9 and extends the entry-point fitness test. It is the first time the pipeline runs labels,
comments, unzipping and logging through `LayeredLayoutProvider.layout`, so this is where the temporal dead zone (F10, stop 15)
and every plan-build interaction show up. Until T11 lands, the arms throw and each class was proven with injection only.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T11 | Wire the 12 arms, G11 assertions, FX5 flip, unpin 59 rows, entry points ([brief](T11-wiring.md)) | typescript-pro | src/alg/layered/intermediate/{IntermediateProcessorStrategyCreate.ts,IntermediateProcessorStrategy.test.ts}, src/alg/layered/{ElkLayered.test.ts,LayeredLayoutProvider.test.ts,LayeredSiteVectors.test.ts,LayeredPipelineVectors.test.ts,LayeredPipelineReplay.test.ts}, test/helpers/{layered-site-replay.ts,layered-pipeline-pinned-rows.ts}, test/architecture/{staged-classes.json,layered-entry-points.fitness.test.ts}, line 1 of src/alg/layered/{DebugUtil.ts,intermediate/LabelDummySwitcher.ts}, plans/layered-labels/decision-journal.md | T4a, T4b, T5, T6, T7, T8, T9, T10 | [x] |

T11 runs alone (no parallel agent), so write-sets cannot collide. The batch is done when the acceptance criteria pass and the
README gates are green, including `npx vitest run test/architecture` in a fresh process. The agent never runs
`npm run coverage` and never commits; the orchestrator commits and journals G11's old and new assertions.
