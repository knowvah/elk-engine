<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: sweep evidence for `sporeOverlap`

## Context

Issue #111 work item 4, third bullet: the corpus sweep's `sporeOverlap` cases may change output; verdicts are expected to
stay `ok` / `both-throw`, and the 27 #108 throws (`NaN` rectangles) are not expected to change. Decision
[D6](../decisions.md#d6): evidence only, `docs/parity-report.md` is not regenerated. The committed report's row:
`sporeOverlap` 906 planned, 879 `ok`, 27 throws; TS 879 ok, 0 mismatch, 27 both-throw. Known flicker on coincident
centres (#79, conformance § 2) can move verdicts between sweeps.

## Steps

1. `uptime` (wait above 12). Detached, `nice -n 10`:
   `tools/oracle/sweep.sh --filter /sporeOverlap/ --out "$TMPDIR/spore-scanline-0004/sweep"` (never without `--out`).
2. `npx tsx tools/corpus/ts-layout-compare.ts --algorithms sporeOverlap --sweep-dir "$TMPDIR/spore-scanline-0004/sweep"
   --out "$TMPDIR/spore-scanline-0004/ts-compare.json"` (check the flag names against its usage line).
3. Compare with the pre-0004 sweep cache (`~/git/knowvah/elk-oracle/sweep/8bca22f4…-ac5af2ba…/results.jsonl`,
   `sporeOverlap` rows): count cases whose oracle output changed under 0004, and verdict counts before/after.
4. Journal one `evidence` row: oracle and TS verdict counts, cases whose output changed, the 27 throw ids unchanged (or
   the difference), any `mismatch` / `ts-only-throw` / `oracle-only-throw` with its diagnosis (stop 7).

## Write-set

The journal only. Scratch under `$TMPDIR/spore-scanline-0004/`. Nothing from the sweep is committed (AD-5).

## Read-set

`docs/conformance.md:323-339` (sweep, parity report), `:252-260` (known flicker), `:2075-2125` (spore sweep history);
`tools/corpus/ts-layout-compare.ts:80-110` (flags).

## Acceptance criteria

- Given the patched oracle, when the filtered sweep runs, then it exits 0 (no `oracle-error`).
- Given the TS comparison, when it ends, then `mismatch`, `ts-only-throw` and `oracle-only-throw` are 0, or each case is
  explained by the #79 flicker with evidence, or filed under stop 7.
- Given the pre-0004 cache, when compared, then the journal states how many `sporeOverlap` outputs 0004 changed.

## Observability

N/A — no new observable operations.

## Rollback

Reversible: nothing committed.
