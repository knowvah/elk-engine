<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — ElkUtil part 2, TestController, Fixed

T6 finishes `ElkUtil` (needs T3's file), T7 needs T1's interfaces, T8 needs nothing but T1 and is the first link of
the serial codegen chain (T8 → T10 → T12 → T14; decisions.md#m9--tripwires). Write-sets are disjoint; all three run
in parallel.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T6 | `ElkUtil` part 2 (Java :707-1293) + `ElkUtilTest` (M10) | typescript-pro | src/core/util/ElkUtil.ts, src/core/util/ElkUtil{Coordinates,Defaults,Visitors}.ts (+ tests) | T1, T3 | [x] |
| T7 | `TestController` (pulled into batch 1, see journal) | typescript-pro | src/core/testing/TestController.ts (+ test) | T1 | [x] |
| T8 | `FixedLayoutProvider`; un-hold Fixed; Fixed tripwires | typescript-pro | src/core/util/FixedLayoutProvider.ts (+ test), tools/melk/config.ts, src/core/options/{FixedLayouterOptions,CoreOptions}.ts (generated), test/melk/**, src/graph/json/JsonMetaDataConverter.test.ts, test/helpers/mission5-stand-ins.ts | T1 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
