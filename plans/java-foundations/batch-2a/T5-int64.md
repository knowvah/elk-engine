<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Int64

**Agent:** typescript-pro · **Commit:** `feat(java): add int64 wrapping arithmetic on bigint`

## Context
A few ELK sites need full 64-bit `long` semantics beyond 2^53: `ElkMath.factl/binomiall` (20! >
2^53, `core/.../math/ElkMath.java:36,51,97`) and `TwoBitGrid` word shifts up to 62
(`alg.common/.../polyomino/structures/TwoBitGrid.java:185,211`). Decision M7: `bigint` wrapped
with `BigInt.asIntN(64)`.

## Task
TDD: write the `numeric.json` `i64` replay test, then implement `src/java/lang/Int64.ts`.

## Write-set
`src/java/lang/Int64.ts`, `src/java/lang/Int64.test.ts`.

## Read-set
- `../decisions.md#m7--int64`, `#m5--exceptions`
- `docs/translation-rules.md:100-121` (§1.3–1.4)
- `src/java/lang/Int32.ts` (shape to mirror), `test/golden/refs/java/numeric.json` (`i64`, `divZero` long rows)

## Interface contract
`Int64.{add, sub, mul, div, rem, neg, shl, shr, ushr}(a: bigint, b: bigint | number): bigint`; all
results in `[-2^63, 2^63)`; shift distance masked with `& 63` (JLS 15.19); `div/rem` truncate toward
zero and throw `ArithmeticException('/ by zero')`; `MIN / -1` wraps to `MIN`.

## Acceptance criteria
- Given every `i64` row, then the result equals `BigInt(row.result)`.
- Given shift distances 64, 65, −1, then they act as 0, 1, 63.
- Given `div(x, 0n)`, then `ArithmeticException` with `/ by zero`.

## Quality bar
README gates; 100% coverage of `Int64.ts`.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No other file.
