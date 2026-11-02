<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Java runner, base creator

Two independent tasks; disjoint write-sets, run in parallel. T2's creator is the input of every later batch.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | Java baseline runner ([brief](T1-java-tests-runner.md)) | main session | tools/oracle/java-tests.sh | — | [x] |
| T2 | `TestGraphCreator` + `MockRandom`, identity assertion ([brief](T2-test-graph-creator.md)) | typescript-pro | test/helpers/TestGraphCreator.ts (+ .test.ts), test/helpers/junit-asserts.ts (+ .test.ts) | — | [x] |

Gate after the batch: the README quality gates, plus `bash tools/oracle/java-tests.sh` over all fourteen suites
reproducing the [baseline](../decisions.md#baseline).
