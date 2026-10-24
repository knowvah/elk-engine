<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Layout goldens + issues; JSON deferrals

Both need the engine (T16). Disjoint write-sets; both run in parallel. T17 is the mission's exit check (AD-4).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T17 | Layout-golden test, `.elkt` layout harness, Issue 457/489 | typescript-pro | test/golden/layout-goldens.test.ts, test/helpers/elkt-layout-harness.ts (+ test), src/core/issues/{Issue457Test,Issue489Test}.test.ts | T4, T13, T16 | [x] |
| T18 | JSON and content-assist deferrals; remove `MISSION5_PROVIDERS` | typescript-pro | src/graph/json/{SectionsTest,TransferLayoutTest,JsonMetaDataConverter}.test.ts, src/core/data/LayoutDataContentAssist.test.ts | T16 | [x] |
Batch done when every task's acceptance criteria pass and the README gates are green.
