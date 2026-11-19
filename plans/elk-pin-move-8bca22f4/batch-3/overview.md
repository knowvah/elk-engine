<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: port the Java diff with its JUnit classes

Three tasks with disjoint write-sets. They may run as parallel `typescript-pro` (sonnet) subagents; the orchestrator
commits each one. In every task, the upstream JUnit class is ported first and seen red, then the Java change goes in,
with `@see` kept and line references renumbered (D9; `src/`, `test/` and `tools/` here, `docs/` in T8). Shared docs
(`docs/conformance.md`, `docs/architecture/alg-packing.md`) belong to T8, so no two tasks write one file.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T4](T4-rectpacking.md) | `InteractiveNodeReordererTest`, `CompactionTest` delta; comparator (#1237) and `setParentRow` (#1239); retire #75 lists | typescript-pro | `src/alg/rectpacking/**`, `test/helpers/rectpacking-*.ts` | T3 | [x] |
| [T5](T5-spore.md) | `RandomSeedTest`, `ScanlineOverlapRemovalTest` delta; seeded `Random`, `shiftUntilUnique`, `updateGraph` (#1242, #1244) | typescript-pro | `src/alg/spore/**`, `test/helpers/spore-*.ts` | T3 | [x] |
| [T6](T6-layered-nested-model-order.md) | `NestedModelOrderConfigurationTest`; `ensureNoModelOrderStrategies` (#1241) | typescript-pro | `src/alg/layered/graph/transform/ElkGraphImporter*.ts`, `src/alg/layered/NestedModelOrderConfigurationTest.test.ts` | T1 | [x] |

Subagent prompts: pass the task file, `CLAUDE.md` ("The Java Is Sacred", the translation rules, AD-13), the queue rule
that tests are immutable, and the boundaries "no commit, no JVM, no `plans/` or `.agent-notes/` write, return findings".
