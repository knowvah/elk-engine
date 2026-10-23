<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — GraphValidator, Box A

T11 needs the resolver (T9) and `AlgorithmFactory` (T1); T12 is the third link of the codegen chain (after T10).
Disjoint write-sets; both run in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T11 | `GraphValidator` + `GraphValidatorTest` (started early, see journal) | typescript-pro | src/core/validation/GraphValidator.ts (+ test) | T1, T6, T9 | [x] |
| T12 | `BoxLayoutProvider` part A; un-hold Box; Box tripwires | typescript-pro | src/core/util/BoxLayoutProvider.ts (+ test), tools/melk/config.ts, src/core/options/{BoxLayouterOptions,CoreOptions}.ts (generated), test/melk/**, src/graph/json/JsonMetaDataConverter.test.ts, test/helpers/mission5-stand-ins.ts | T10 | [x] |
Batch done when every task's acceptance criteria pass and the README gates are green.
