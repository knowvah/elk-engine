<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: TS encoders to the canonical form

**Agent:** `claude` (sonnet). **Budget:** 60 min (stop 11).

## Context

Issue #72, ruling #53: the TS side must encode a port NaN the way the JVM recorders now do, `Double.doubleToLongBits`
(`7ff8000000000000`), so a NaN's sign bit never decides a comparison. The shim `doubleToLongBits`
(`src/java/lang/JavaDouble.ts:41`) is proven against the JVM by `test/golden/refs/java/hash.json:354-360`. Precedents:
`test/helpers/force-replay-rows.ts:25-29`, `test/helpers/layered-loops-sweep.ts:27-51` and the NaN test in
`test/helpers/layered-loops-sweep.test.ts`. Decisions: [D2](../decisions.md#d2-the-canonical-form-on-each-side),
[D4](../decisions.md#d4-the-proof).

## Task

1. Create `test/helpers/double-hex.ts`: `export const CANONICAL_NAN_HEX = '7ff8000000000000'` and
   `export function canonicalHex(value: number): string` (16 lowercase hex digits of
   `BigInt.asUintN(64, doubleToLongBits(value))`). JSDoc cites issue #72 and the `doubleToLongBits` Javadoc URL.
2. Create `test/helpers/double-hex.test.ts` with the D4 cases: `7ff8000000000000`, `fff8000000000000`,
   `7ff8dead0000beef`, `7ff0000000000001`, `ffffffffffffffff` (via `longBitsToDouble`) → `CANONICAL_NAN_HEX`; `0.0` →
   `0000000000000000`, `-0.0` → `8000000000000000`, `Infinity` → `7ff0000000000000`, `-Infinity` → `fff0000000000000`,
   `Number.MIN_VALUE` → `0000000000000001`, `1.5` → `3ff8000000000000`.
3. For every TS row of T1's audit table with action `move`, replace the local encoder body with a call to `canonicalHex`
   (keep the local function name if other code calls it). Point `force-replay-rows.ts`'s `NAN_HEX` and
   `layered-loops-sweep.ts`'s `CANONICAL_NAN` at `CANONICAL_NAN_HEX`, keeping their names and exports.
4. For each changed helper that exports an encoder or a hash (`layered-phase-sweep.ts` `canonicalHash`/hex,
   `layered-pipeline-sweep.ts` `pipelineHash`/hex, and the replay helpers), add one test to its existing `.test.ts` (create
   it if none exists) that an `fff8…` NaN and a `7ff8…` NaN encode or hash equal. Do not export a private encoder only to
   test it if the exported hash covers it.
5. Run `npx vitest run test/helpers/double-hex.test.ts` and every test file that imports a changed module, plus
   `npm run typecheck` and `npx prettier --check` on the changed files.

## Write-set

`test/helpers/double-hex.ts`, `test/helpers/double-hex.test.ts`, the TS files of T1's table with action `move`, and the
`.test.ts` beside each changed helper. Nothing in `src/` except the two `src/alg/common/**/*.test.ts` rows of the table.

## Read-set

T1's `audit` row (TS) in the journal; each listed encoder's lines; `src/java/lang/JavaDouble.ts:25-50`; the precedents
above.

## Acceptance criteria

- Given `canonicalHex`, when called with any of the five NaN patterns, then it returns `7ff8000000000000`; given the six
  non-NaN values, then it returns their raw bits.
- Given each changed helper, when its new test runs, then an `fff8…` NaN and a `7ff8…` NaN give the same hex or hash.
- Given the tests that import a changed helper, when they run, then every one that passed at the base still passes with no
  expected value changed.
- Given the tree, when `grep -rn -E "setFloat64\(|doubleToRawLongBits" test/helpers src/alg --include=*.ts` runs, then
  only sites T1 allowlisted match.

**Interface output (consumed by T4's fitness test):** module `test/helpers/double-hex.ts`, exports
`CANONICAL_NAN_HEX: string`, `canonicalHex(value: number): string`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible (revert the commit).
