<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — DoubleToString

**Agent:** typescript-pro · **Commit:** `feat(java): add java double to string conversion`

## Context
Java prints doubles differently from JS (`100.0` vs `100`, `1.0E10` vs `10000000000`,
`4.9E-324` vs `5e-324`). ELK stores vector options as `KVector.toString` text
(`core/.../math/KVector.java:113`) and joins option text (`IndividualSpacings.java:122`), so the
text must be Java's. `text.json` (T1) holds ~10,000 JVM rows.

## Task
TDD: write the full `toString` vector replay first, then implement
`src/java/lang/DoubleToString.ts` per decision M3.

## Write-set
`src/java/lang/DoubleToString.ts`, `src/java/lang/DoubleToString.test.ts`.

## Read-set
- `../decisions.md#m3--doubletostring` (the full Javadoc definition is summarized there; fetch
  `https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Double.html#toString(double)`
  for the exact text)
- `docs/translation-rules.md:425-448` (§7)
- `src/java/lang/DoubleCompare.ts` (precedent: one `Double` static per file)
- `test/golden/refs/java/text.json` (`toString` rows)

## Specification
1. NaN → `NaN`; ±Infinity → `Infinity`/`-Infinity`; ±0 → `0.0`/`-0.0`.
2. Otherwise m = |v| > 0. Let p = length of JS's shortest round-trip significand (a hint only).
   Candidates T = decimals of length p that round to m (or length 1 or 2 when p = 1). Choose the
   one closest to m using exact `bigint` rational comparison; on a tie, the even significand.
   Verify the choice rounds to m (exact check) — never trust the JS last digit.
3. Format: e = n + i − 1; plain for −3 ≤ e < 7 (`0.0123`, `12300.0`, `12.3`); else
   `s1.s2…snEe` with `.0` when n = 1 (`1.0E23`, `1.23E-19`, `4.9E-324`).

## Interface contract (consumed by T13 `Joiner`, later `KVector.toString`)
`toString(v: number): string`.

## Acceptance criteria
- Given every `text.json` `toString` row, then `toString(fromHex(row[0])) === row[1]`.
- Given `Number.MIN_VALUE`, then `4.9E-324`; given `1e23`, then `1.0E23`; given `100`, then `100.0`;
  given `0.001`, then `0.001`; given `1e-4`, then `1.0E-4`; given `1e7`, then `1.0E7`.
- Given the full suite, then it runs in < 5 s (else deterministic sample keeping all edge rows; journal).

## Quality bar
README gates; 100% coverage; functions ≤ 30 NLOC, CCN ≤ 10.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No `String.format` / `%f` formatting (not in scope). A mismatch the Javadoc definition cannot
explain is STOP 7.
