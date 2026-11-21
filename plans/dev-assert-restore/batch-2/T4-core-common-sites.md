<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: #9, #12, #13 — wraps and new tests

## Context

#113 option 2 for the core and alg.common sites. The tests pin what a JVM without `-ea` does; each violating step now
runs inside `withAssertions(false, …)`, and one new test per site pins the `AssertionError` with assertions on.
Decisions [D4](../decisions.md#d4-where-the-113-steps-are-wrapped) and
[D6](../decisions.md#d6-one-new-test-per-site-with-assertions-on).

| # | Site | Wrap (census decides the exact tests) | New test (file) |
| - | ---- | ------------------------------------- | --------------- |
| 9 | `InstancePool` constructor, `factory != null` | `create()` without `providerFactory` in `LayoutAlgorithmData.test.ts` (6), `LayoutCategoryData.test.ts` (1), `TestController.test.ts` (1), module-level construction in `PropertyConstantsDelegator.test.ts` | `new InstancePool(null as never)` throws (`InstancePool.test.ts`) |
| 12 | `NodeContext.comparePortContexts` default arm | "returns 0 for two ports without a side (the Java default arm, assert false at :277)" | two `UNDEFINED`-side ports throw (`NodeContext.test.ts`) |
| 13 | `HorizontalPortPlacementSizeCalculator.minSizeRequiredToRespectSpacing` | `LayeredFrameworkAdapterVectors.test.ts` rows in a named set of the nine `adapters/sweep-*` ids | `minSizeRequiredToRespectSpacing(<spacing>, 0.125, 0)` throws (`HorizontalPortPlacementSizeCalculator.test.ts`) |

## Write-set

`src/core/data/LayoutAlgorithmData.test.ts`, `src/core/data/LayoutCategoryData.test.ts`,
`src/core/testing/TestController.test.ts`, `src/core/util/PropertyConstantsDelegator.test.ts`,
`src/core/util/InstancePool.test.ts`, `src/alg/common/nodespacing/internal/NodeContext.test.ts`,
`src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.test.ts`,
`src/alg/layered/graph/LayeredFrameworkAdapterVectors.test.ts`.

## Read-set

`census.md` (#9, #12, #13 tables); `test/helpers/with-assertions.ts`; `src/java/lang/AssertionError.ts`; the three site
functions by symbol; `LayeredFrameworkAdapterVectors.test.ts:255-280`.

## Rules

Wrap the violating call, not the `it` body, where the call is separable; the `expect` lines stay byte-identical. A
module-level wrap in `PropertyConstantsDelegator.test.ts` wraps only the construction. Row sets are named constants
listing ids verbatim from #113.

## Acceptance criteria

- Given the eight files, when run with assertions on and with `ELK_DEV_ASSERTIONS=off`, then each passes with its T2
  baseline count plus its new tests.
- Given each new test, when run in either mode, then it observes an `AssertionError` with message `''` from its site.
- Given `git diff` of the eight files, when read, then no existing `expect`, expected value or title changed.

## Observability / rollback

N/A — test code only. Reversible.
