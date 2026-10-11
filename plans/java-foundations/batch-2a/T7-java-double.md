<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — JavaDouble: hashCode, doubleToLongBits, parseDouble

**Agent:** typescript-pro · **Commit:** `feat(java): add double hashing and parsing`

## Context
`Double.hashCode` feeds `KVector.hashCode` and `HashMap<Double,…>` order; `Double.parseDouble` is
caught for `NumberFormatException` at 10 ELK sites (`core/.../math/KVector.java:531`). JS `Number(s)`
accepts `""` and hex integers and rejects `1.0d` — a shim is needed. Vectors: `hash.json`, `text.json` (T1).

## Task
TDD: vector-replay tests first, then `src/java/lang/JavaDouble.ts`.

## Write-set
`src/java/lang/JavaDouble.ts`, `src/java/lang/JavaDouble.test.ts`.

## Read-set
- `../decisions.md#m3--doubletostring` (parseDouble grammar), `#m5--exceptions`
- `docs/translation-rules.md:386-403` (§6.7), `:425-448` (§7)
- `test/golden/refs/java/hash.json` (`doubleHash`, `doubleToLongBits`), `text.json` (`parseDouble`)
- Javadoc `Double.valueOf(String)` (fetch with WebFetch; grammar `FloatValue`)

## Interface contract (consumed by T11, T14, later KVector)
- `doubleToLongBits(v: number): bigint` (canonical NaN), `doubleToRawLongBits(v): bigint`
- `hashCode(v: number): number` = `(int)(bits ^ (bits >>> 32))` (Javadoc)
- `parseDouble(s: string): number`: trim per `String.trim` (code units ≤ U+0020), then the
  `FloatValue` grammar (sign, decimal, hex float `0x…p…`, `f/F/d/D` suffix, `NaN`, `Infinity`; no
  underscores); round-to-nearest; else `NumberFormatException` with the JVM message.

## Acceptance criteria
- Given every `doubleHash` and `doubleToLongBits` row, then equal.
- Given every `parseDouble` accept row, then the result bits equal the vector bits (incl. `-0.0`).
- Given every reject row, then `NumberFormatException` with the vector message.

## Quality bar
README gates; 100% coverage. Decimal conversion may use JS `Number()` on a validated, normalized
decimal string (round-to-nearest per ECMA-262 StringToNumber); hex floats need explicit handling.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `toString` (T8). No other file.
