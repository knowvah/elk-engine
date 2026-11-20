<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: Int32 crossing and path-count sums

## Context

`docs/translation-rules.md` § 1.1: every Java `int` `+ - *` wraps to 32 bits; `x += e` is `x = (int)(x + e)`; never
bare `+` on ints that can exceed 2^31. `LayerSweepCrossingMinimizerCounting.ts:130,134`, `AllCrossingsCounter.ts`,
`CrossingsCounter.ts` and `HyperedgeCrossingsCounter.ts` already use `Int32.add`; other crossing-count accumulators
in the same directories do not (roadmap § Revision 2026-10-30 follow-up). Wrapping needs more than 2^31 crossings, so
no recorded graph reaches it: the conversion must not change any test result or ref.

Planning's site candidates (T2 confirms each against the Java, D4):

| TS | Java | Note |
| -- | ---- | ---- |
| `intermediate/greedyswitch/SwitchDecider.ts:137-151` | `SwitchDecider.java:138-153` | two 4-term `int` sums and two `+=` |
| `p3order/LayerSweepTypeDecider.ts:76-78,109-138` | `LayerSweepTypeDecider.java:93-136` | `pathsTo*` `+=`; `allPaths` and the difference are `int` ops widened to `double` |
| `p3order/LayerSweepTypeDeciderNodeInfo.ts:17-19` | `LayerSweepTypeDecider.java:164-168` | `transfer`, pure seam for a wrap test (D5) |
| `intermediate/greedyswitch/BetweenLayerEdgeTwoNodeCrossingsCounter.ts` | `BetweenLayerEdgeTwoNodeCrossingsCounter.java:213-220` | `+= size()` and `+= countAdjacenciesBelowNodeOfFirstPort()` |
| `p3order/GreedyPortDistributor.ts` | `GreedyPortDistributor.java:110-118` | `+=` hierarchical crossings |
| `p3order/LayerSweepCrossingMinimizer.ts`, `…Counting.ts` | `LayerSweepCrossingMinimizer.java:195-230,393-445` | thoroughness loops compare only; `:416` accumulator is `double` (keep bare) |
| `p3order/counting/CrossingsCounterNorthSouth.ts`, others in the three dirs | per file | sweep every remaining bare `+=`/`+` on a Java `int` count |

All paths are under `src/alg/layered/`. Java under
`$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/`.

## Read-set

The TS and Java files above; `src/java/lang/Int32.ts`; decisions D4, D5.

## Write-set

Sources and colocated tests in `src/alg/layered/intermediate/greedyswitch/`, `src/alg/layered/p3order/`,
`src/alg/layered/p3order/counting/`. The orchestrator writes `plans/linkedlist-int32-cleanup/int32-sites.md`.

## Steps

1. For every bare `+`, `-`, `*`, `+=`, `-=`, `++` in non-test files of the three directories, read the Java
   operand types and classify by D4: `convert`, or `kept` with the reason (loop index, bounded by one collection,
   `double` accumulator). Only accumulators and multi-term sums need a row; plain loop indices need none.
2. For each `convert` row with a seam (D5), write the wrap test first and see it red (e.g. `transfer` of
   `hierarchicalInfluence = 2147483647` with `1` gives `-2147483648`, JLS 15.18.2).
3. Convert: `Int32.add/sub/mul`, Java association kept (`Int32.add(Int32.add(a, b), c)`); import
   `* as Int32 from '…/java/lang/Int32.js'` as the neighbouring files do.
4. Run the files' tests and the layered order/greedy-switch vector suites; then the full suite (orchestrator).

## Interface contracts

Returns to the orchestrator: `int32-sites.md` rows `| # | TS file:line | Java file:line | operation | verdict
(converted / converted (no seam) / kept) | reason or test name |`.

## Acceptance criteria

- Given every Java `int` count accumulator in the three directories, when `int32-sites.md` is read, then each is
  `converted`, `converted (no seam)` or `kept` with a D4 reason.
- Given `LayerSweepTypeDeciderNodeInfo.transfer` with `2147483647 + 1`, when tested, then each field reads
  `-2147483648` (red before the change).
- Given the full suite and `test/golden/refs/`, when T2 is committed, then no existing test result or ref changes.
- Given `npm run complexity`, then no new violation.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
