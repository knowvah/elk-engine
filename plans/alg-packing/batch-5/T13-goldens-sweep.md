<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Goldens test, sweep, hand-offs

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T13): compare packing goldens and sweep the packing algorithms` ·
Scratch: `$TMPDIR/alg-packing/T13/`

## Context

Mission 8c, PK2, PK9. Template `test/golden/force-disco-goldens.test.ts`. The oracle registers every algorithm, so option keys depend
on the registered set; register what the oracle registers that the goldens' export can see.

## Task

1. `test/golden/packing-goldens.test.ts`: every `packing.json` entry laid out by the TS and compared with `compareLayout` at AD-4; a test
   that each ref's `resolvedAlgorithm` is the entry's algorithm; the `--minst-ties-*` entries listed by name in one test title.
2. 8b hand-off: register `RectPackingMetaDataProvider` (and the spore and topdownpacking providers) in `force-disco-goldens.test.ts`'s
   setup and remove the `SUFFIX_DIFFERENCES` row (pre-approved, PK9); the force-disco goldens stay green against unchanged refs.
3. `tools/corpus/ts-layout-compare.ts`: register the three metadata providers; unit cases in `test/corpus/ts-layout-compare.test.ts`.
4. Sweeps (PK9; `uptime`, detached, `nice -n 10`): oracle and TS for `rectpacking`, `sporeOverlap`, `sporeCompaction`, `topdownpacking`;
   journal per algorithm and category, nondeterministic counted. Re-run force, stress, disco over `interactiveRectpacking_{hierarchy,oneBigNode}`
   and the #68 tree residuals; comment results on #68 and #71 (do not close).
5. Each remaining mismatch: diagnosis artifact, fix at origin (stop 14/15) or `needs-ruling` with its mechanism.

## Write-set

`test/golden/packing-goldens.test.ts`, `test/golden/force-disco-goldens.test.ts` (setup registrations and the row only),
`tools/corpus/ts-layout-compare.ts`, `test/corpus/ts-layout-compare.test.ts`.

## Read-set

`test/golden/force-disco-goldens.test.ts`, `test/golden/compare-json.ts`, `test/golden/packing.json`, `tools/corpus/ts-layout-compare.ts`,
`tools/oracle/sweep.sh`, `docs/parity-report.md`, issues #68, #71, `decisions.md#pk9--sweep-and-the-hand-offs-it-closes`.

## Acceptance criteria

- Given every `packing.json` entry, then the TS layout equals the ref within 1e-6 (the `--minst-ties-*` entries included).
- Given the force-disco goldens with rectpacking registered and the row removed, then all pass against unchanged refs.
- Given the four sweeps, then 0 mismatches and 0 one-sided throws among deterministic cases, or each remaining case is `needs-ruling` with its mechanism.
- Given the landed sets regenerated, then `git diff --exit-code test/golden/refs/` is clean.

## Observability / Rollback

N/A — no new observable operations. Reversible.
