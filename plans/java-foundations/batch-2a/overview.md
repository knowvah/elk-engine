<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2a — Numeric, Int64, String/Integer, Double

Shims that replay Batch 1's vectors. Disjoint write-sets; all four run in parallel (and in parallel
with Batch 2b). Agents run their own tests + typecheck only; the orchestrator runs coverage.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T4 | Numeric shims: `l2i`, `ArithmeticException` throws, `Float32`, `log10`, setSeed replay | typescript-pro | src/java/lang/{JavaMath,Int32,Float32}.ts (+ .test.ts), src/java/util/Random.test.ts (append) | T1, T2 | [x] |
| T5 | `Int64` | typescript-pro | src/java/lang/Int64.ts (+ .test.ts) | T1, T2 | [x] |
| T6 | `JavaString` + `JavaInteger` | typescript-pro | src/java/lang/{JavaString,JavaInteger}.ts (+ .test.ts) | T1, T2 | [x] |
| T7 | `JavaDouble`: hashCode, doubleToLongBits, parseDouble | typescript-pro | src/java/lang/JavaDouble.ts (+ .test.ts) | T1, T2 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
