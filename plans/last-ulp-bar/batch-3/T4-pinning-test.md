<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: pinning test and entries table

**Agent:** orchestrator. **Budget:** 70 min (stop 11).

## Context

Rule point 4 of the amendment: each known-divergence entry records its mechanism, its measured maximum positional delta,
and the test that pins both; no global tolerance or comparator change ([D5](../decisions.md#d5-the-pinning-test),
[D6](../decisions.md#d6-docs)). T1 measured, T3 recorded the oracle evidence.

## Task

1. Write `test/golden/last-ulp-divergences.test.ts` (TDD: the test is the deliverable; run it against the T3 ref first
   and journal its first result). One `describe` per `accepted` and `inside-bar` entry of T1's table:
   - **Mechanism.** For every `math` row of `last-ulp.json`, V8 `Math[fn](x)` encoded with `canonicalHex`
     (`test/helpers/double-hex.ts`) equals `strict`; the set of row ids with `warm !== strict` equals a named constant
     listing them, and each such pair is one ulp apart (adjacent bit patterns of the same sign).
   - **Bound.** `LAST_ULP_BAR_PX = 0.01`; one named `MEASURED_MAX_<ENTRY>` constant per entry holding T1's measured delta,
     with an assertion that it is `<= LAST_ULP_BAR_PX`. E1: lay out the vendored `.elkt` as the TS sweep does
     (`tools/corpus/ts-layout-pipeline.ts`), compare with each recorded `layout` row: `compareLayout` at the default
     tolerance gives exactly the journaled diff list, and the D3 delta is `<= MEASURED_MAX_E1`. E2: replay the six `import`
     stops of `disco.json` with `test/helpers/disco-replay-dump.ts` and assert the D3 delta `<= MEASURED_MAX_E2`.
   - **Discrete.** Ids, counts and every non-numeric value outside the journaled list are equal.
   - A self-check that the D3 walker finds a planted 0.02 px difference in a size-valued option string and in a bend
     point (so the bound cannot pass vacuously).
   Put the D3 walker in the test file, or in `test/helpers/last-ulp-delta.ts` with its own test if another test needs it
   (push-forward).
2. `npx vitest run test/golden/last-ulp-divergences.test.ts src/alg/disco/DiscoVectors.test.ts test/golden/tree-goldens.test.ts test/architecture`.
   A failure on a landed test is stop 5.
3. `docs/conformance.md`:
   - Under the § 2 policy, the table "Last-ulp `Math.*` entries (AD-4 amendment)": one row per audited entry (case,
     class, mechanism with function, input and bits or "none observed", measured maximum positional delta, pinning test,
     approval: #68 B for E1, "inside 1e-6" for E2).
   - Replace the "… issue #74" endings at `:283-284`, `:2008` and `:2477-2478` with the result and a link to the table.
   - Add the measured delta and the pinning test to the 8a (`:2002-2008`) and 8b (`:2137-2142`) entries.
   - `npx prettier --check docs/conformance.md`; `npm run docs:build` if the table has links into other pages.
4. Journal: the measured values from the test (and whether they equal T1's), the diff lists, the test count.

## Write-set

`test/golden/last-ulp-divergences.test.ts` (new), optionally `test/helpers/last-ulp-delta.ts` + `.test.ts` (new),
`docs/conformance.md`, the journal.

## Read-set

T1 `audit` rows; `test/golden/refs/java/last-ulp.json`; `test/golden/compare-json.ts` (exports only);
`test/helpers/double-hex.ts`; `test/helpers/disco-replay-dump.ts`; `src/alg/disco/DiscoVectors.test.ts:1-60`;
`test/golden/tree-goldens.test.ts:1-80`; `tools/corpus/ts-layout-pipeline.ts`; `docs/conformance.md` lines named above.

## Acceptance criteria

- Given the T3 ref and the current tree, when the pinning test runs, then it passes, and each `MEASURED_MAX_*` is at most
  0.01 and at least the delta the test computes.
- Given a planted 0.02 px change in a size option string or a bend point, when the D3 walker runs, then it reports 0.02
  (self-check).
- Given V8's `Math.sin`/`Math.cos` on the recorded inputs, when compared, then they equal `StrictMath` on every row and
  the warm-HotSpot divergent set equals the named constant.
- Given `docs/conformance.md`, when read, then every audited entry has a row with mechanism, delta and pin, and no
  sentence says the audit is still issue #74's.
- Given `git diff <base> -- test/golden/refs/ src/ test/golden/compare-json.ts`, when run, then the only change is the
  added `last-ulp.json`.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (delete the test, revert the doc rows).
