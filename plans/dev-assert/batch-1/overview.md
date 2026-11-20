<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: helper, switch, suite setup; site inventory

Two orchestrator tasks, in order. At the end, `devAssert` exists and the suite runs with assertions on. The suite is
still green because no site calls the helper yet. `inventory.md` lists all 143 sites, each assigned to a batch-2 lane.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-helper-and-switch.md) | `AssertionError`, `DevAssert` (+tests), suite setup and guard, fitness entries, § 6.8 | orchestrator | `src/java/lang/{AssertionError,DevAssert}{,.test}.ts`, `test/setup/dev-assertions{,.test}.ts`, `vitest.config.ts`, `test/architecture/{module-globals,exception-hierarchy}.fitness.test.ts`, `docs/translation-rules.md` | — | [x] |
| [T2](T2-inventory.md) | Map the 143 Java sites to TS positions, current status and lane | orchestrator | `plans/dev-assert/inventory.md` | T1 | [x] |

Gate after the batch: `npx vitest run` green with assertions on, and `ELK_DEV_ASSERTIONS=off npx vitest run test/setup`
green. Record the full-suite runtime as the baseline for T7.
