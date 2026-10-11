<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Numeric shims: l2i, ArithmeticException, Float32, log10, setSeed

**Agent:** typescript-pro · **Commit:** `feat(java): add l2i, float32 helpers and arithmetic exceptions`

## Context
`numeric.json` and `random-setseed.json` (T1) record JVM results; exception classes exist (T2).
Shims are written from Javadoc/JLS only (AD-9) and replay vectors exactly (AD-13).

## Task
TDD per item: write the vector-replay test first, see it fail, then implement.
1. `JavaMath.l2i(x: bigint): number` — JLS 5.1.3 narrowing `long`→`int` keeps the low 32 bits.
2. `Int32.div/rem`, `JavaMath.floorDiv/floorMod`: throw `ArithmeticException('/ by zero')` (M5).
3. `src/java/lang/Float32.ts`: `fromDouble` (= `Math.fround`), `add`, `sub`, `mul`, `div` on float
   values (result `Math.fround(a op b)`), plus anything `numeric.json` `f32` covers.
4. `log10`: replay `numeric.json` `log10` rows against native `Math.log10`. If all match, add no
   shim (the test documents it). If an exact power 10^0…10^22 mismatches, add
   `JavaMath.log10` returning n for exact powers, else native — only if no non-power row changes
   (else STOP 9).
5. Append a `random-setseed.json` replay to `src/java/util/Random.test.ts` (no `Random.ts` change
   expected; if one is needed, STOP 1 — it is outside the write-set).

## Write-set
`src/java/lang/JavaMath.ts`, `JavaMath.test.ts`, `Int32.ts`, `Int32.test.ts`, `Float32.ts`,
`Float32.test.ts`, `src/java/util/Random.test.ts` (append only).

## Read-set
- `../decisions.md#m5--exceptions`, `#m4--vector-files`
- `docs/translation-rules.md:82-99` (§1.2), `:122-149` (§1.5–1.6), `:173-188` (§1.9)
- `src/java/lang/JavaMath.ts` (110 lines), `src/java/lang/Int32.ts:25-50`,
  `src/java/lang/JavaMath.test.ts:1-40,95-110` (vector loading pattern; frozen `RangeError` assertion at :100)
- `test/golden/refs/java/numeric.json`, `random-setseed.json` (structure only — sample a few rows)

## Interface contract (consumed by later missions)
`l2i(x: bigint): number`; `Float32.{fromDouble, add, sub, mul, div}(…): number` (returns a value
exactly representable as binary32); throws `ArithmeticException` per M5.

## Acceptance criteria
- Given every `numeric.json` `l2i` row, then `l2i(BigInt(row[0])) === row[1]`.
- Given a zero divisor, then `Int32.div/rem` and `floorDiv/floorMod` throw `ArithmeticException`
  with message `/ by zero`, and `JavaMath.test.ts:100` (`toThrow(RangeError)`) still passes unchanged.
- Given every `f32` row, then the result bits equal the vector bits.
- Given every `log10` row for an exact power 10^0…10^22, then the result is exactly n.
- Given every `random-setseed.json` row, then the existing `Random` reproduces it.

## Quality bar
README gates. No existing test line changes (append-only for test files). `@see` Javadoc/JLS URL on
each new export.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not edit `Random.ts`, vectors, or any other shim.
