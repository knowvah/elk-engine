<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: the TS seam

This batch needs T2's ref. It is one task, because the seam module, the runner wiring and the comparison test must stay
consistent. They form one interface and its call sites.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T3](T3-ts-seam.md) | `layout-test-text-measurer.ts`, the `ensureSensibleLabelSize` parameter, the runner wiring, the vendored-model comparison | typescript-pro (sonnet) | `test/helpers/layout-test-text-measurer.ts` (+ `.test.ts`), `test/helpers/layout-test-labels.ts`, `test/helpers/layout-test-runner.ts`, `test/golden/label-sizing.test.ts` | T2 | [x] |

Gate after the batch: the orchestrator runs the batch gates of [README.md](../README.md#quality-gates).
`git diff <base> -- test/helpers/layout-test-labels.test.ts test/helpers/layout-test-labels.append-only.test.ts` must be
empty, and so must `git diff <base> -- src/`, unless a stop-6 fix with its artifact is journaled.
