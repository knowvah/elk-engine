<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — `java.lang` semantics shims

**Agent:** typescript-pro · **Commit:** `feat(java): add java.lang math, int32, and double-compare shims`

## Context
Java and JavaScript differ in ways that silently change layout results:
`Math.round` (Java rounds half up toward +∞ and returns `long`/`int`;
`0.49999999999999994` → 0), `(int)`/`(long)` casts (truncate, saturate,
NaN → 0), int32 overflow wrapping, integer division truncation,
`floorDiv`/`floorMod`, shifts (count masked to 5 bits), and
`Double.compare` (−0.0 < 0.0, NaN greatest and equal to itself).

## Task
TDD: write tests replaying `test/golden/refs/java/lang.json` first; then
implement from the Javadoc / JLS specifications.

## Write-set
`src/java/lang/JavaMath.ts`, `src/java/lang/JavaMath.test.ts`,
`src/java/lang/Int32.ts`, `src/java/lang/Int32.test.ts`,
`src/java/lang/DoubleCompare.ts`, `src/java/lang/DoubleCompare.test.ts`.

## Read-set
- `test/golden/refs/java/lang.json` (contract: `batch-2b/T6-jvm-vectors.md#interface-contract`)
- Javadoc `java.lang.Math` (`round`, `floorDiv`, `floorMod`), `java.lang.Double.compare`;
  JLS §5.1.3 (narrowing primitive conversion), §15.17 (multiplicative
  operators), §15.19 (shift operators)
- `../decisions.md#ad-9…`, `#ad-7…`, `#ad-13…`. Never OpenJDK source.

## API (output; consumed by future missions)
```ts
// JavaMath.ts  (file not named Math.ts to avoid shadowing the global)
export function round(x: number): number;        // Math.round(double) → long; result |x| < 2^53 as number, else bigint? — see note
export function roundFloat(x: number): number;   // Math.round(float) → int
export function floorDiv(a: number, b: number): number;  // int args
export function floorMod(a: number, b: number): number;
export function d2i(x: number): number;          // (int) x
export function d2l(x: number): bigint;          // (long) x
// Int32.ts
export function add(a: number, b: number): number;   // also sub, mul (Math.imul), div (truncating, throws on 0), rem, neg, shl, shr, ushr
// DoubleCompare.ts
export function compare(a: number, b: number): -1 | 0 | 1;
```
Note on `round(double)`: Java returns `long`. Return `number` when the
result is a safe integer; the vectors cover ≥ 2^53 inputs — choose a
signature that passes them exactly (e.g. return `bigint` from a separate
`roundToLong`), and document the choice in a comment and the journal.

## Acceptance criteria
- Given every case in `lang.json`, then each shim matches bit-for-bit.
- Given `round(0.49999999999999994)`, then `0`; `round(-2.5)` → `-2`;
  `d2i(NaN)` → `0`; `d2i(1e10)` → `2147483647`.
- Given `compare(-0.0, 0.0)`, then `-1`; `compare(NaN, Infinity)` → `1`;
  `compare(NaN, NaN)` → `0`.
- Given `Int32.div(1, 0)`, then it throws (`ArithmeticException` analog,
  a `RangeError`).

## Quality bar
Gates in README.md (brief); coverage 90×4. `@see` Javadoc/JLS reference on
each export.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.
