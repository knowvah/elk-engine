<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Goldens test and sweep

**Agent:** typescript-pro (sonnet) · **Commit:** `test(T11): add force-disco goldens and sweep registrations` · Scratch: `$TMPDIR/alg-force-disco/T11/`

## Context

Mission 8b, FD2, FD6. `test/golden/tree-goldens.test.ts` is the template. `tools/corpus/ts-layout-compare.ts:322` registers the tree
providers.

## Task

1. `test/golden/force-disco-goldens.test.ts`: every entry of `force-disco.json` against its ref at AD-4, plus a check that each ref's
   `resolvedAlgorithm` is the entry's algorithm. Register the providers and `PolyominoOptions` explicitly, plus layered and the
   tree algorithms that `componentLayoutAlgorithm` entries name.
2. Add `Force`, `Stress` and `DisCo` registrations to `ts-layout-compare.ts`, with `PolyominoOptions`, and update its test.
3. Run the oracle sweeps of FD6 detached (`uptime`, `nice -n 10`, polls ≤ 9 min) and the TS comparison. Journal per algorithm and
   category. Trace each `mismatch` and one-sided throw to its mechanism (diagnosis artifact), and fix at origin, or file `needs-ruling`.

## Write-set

`test/golden/force-disco-goldens.test.ts`, `tools/corpus/ts-layout-compare.ts`, `test/corpus/ts-layout-compare.test.ts`.

## Read-set

`test/golden/tree-goldens.test.ts`, `tools/corpus/ts-layout-compare.ts`, `tools/oracle/sweep.sh`, `decisions.md#fd2-the-force-disco-golden-set`,
`#fd6-sweep`, `docs/parity-report.md:24-53`.

## Acceptance criteria

- Given every golden, then the TS layout equals the ref within 1e-6, ids and section topology exact.
- Given a ref, then its `resolvedAlgorithm` equals its entry's algorithm.
- Given the sweep, then the journal has counts per algorithm and category, and each mismatch and one-sided throw carries a mechanism.

## Observability / Rollback

N/A — no new observable operations. Reversible.
