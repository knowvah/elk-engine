<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: inputs, label metrics, runner registration

Three independent tasks with disjoint write-sets. None of them changes a suite yet, so the suites stay green with the
hold-back in place until batch 2.

| Task | Writes | Owner |
| ---- | ------ | ----- |
| [T1](T1-label-metrics.md) | `tools/vectors/layered-label-metrics-texts.txt`, `test/golden/refs/java/layered-label-metrics.json` | orchestrator (JVM run) |
| [T2](T2-vendor-inputs.md) | two `.elkt` files under `test/golden/inputs/compound/`, `test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts` | orchestrator or one subagent |
| [T3](T3-runner-stress.md) | `test/helpers/layout-test-runner.ts`, `test/helpers/layout-test-runner.test.ts` | orchestrator or one subagent |

One commit per task. Gate after each: the task's tests, `npm run typecheck`, `npx prettier --check <changed files>`.

Status: [x] T1 · [x] T2 · [x] T3
