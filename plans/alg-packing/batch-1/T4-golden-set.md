<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — The `packing` golden set

**Agent:** tooling-engineer (sonnet) · **Commit:** `test(T4): add the packing golden set` · Scratch: `$TMPDIR/alg-packing/T4/`

## Context

Mission 8c, PK2, PK4. Template: the `force-disco` branch of `tools/oracle/regen-goldens.sh` and its manifest
`test/golden/force-disco.json`. Only refs and inputs land here; the comparing test is T13's.

## Task

1. Add `--set packing` to `regen-goldens.sh` (manifest `test/golden/packing.json`, refs `test/golden/refs/elk-packing/`, inputs
   `test/golden/packing-inputs/`, `-XX:hashCode=2`), additive only: the other sets' branches stay byte-identical.
2. Design the inputs and entries of PK2 for `rectpacking`, `sporeOverlap`, `sporeCompaction`, `topdownpacking`: the default and one
   entry per option value (one factor at a time), each input naming `elk.algorithm`; spore inputs with distinct node centres; at least
   two `--minst-ties-<n>` entries per spore algorithm (equal-cost grids or regular polygons).
3. Regenerate the set twice (detached, `nice -n 10`); the two runs must be byte-identical. Check each ref's `resolvedAlgorithm`.
4. Regenerate `default`, `algorithms`, `layered`, `trees`, `force-disco`: `git diff --exit-code test/golden/refs/` (stop 10).

## Write-set

`tools/oracle/regen-goldens.sh` (the new branch and usage line), `test/golden/packing.json`, `test/golden/packing-inputs/**`,
`test/golden/refs/elk-packing/**`.

## Read-set

`tools/oracle/regen-goldens.sh`, `test/golden/force-disco.json`, `test/golden/force-disco-inputs/` (two samples),
`tools/melk/sources/{RectPacking,SPOrE,Topdownpacking}.melk`, `decisions.md#pk2--the-packing-golden-set`, `#pk4--mathrandom-jitter`.

## Interface contract (consumed by T13)

Manifest entries `{ id, path, algorithm, variant, note }` as in `force-disco.json`; ids `<alg>--<option>-<value>`, `<alg>--default`,
`<sporeAlg>--minst-ties-<n>`.

## Acceptance criteria

- Given two regenerations, then the refs are byte-identical (no spore entry hit the jitter path).
- Given each entry, then its ref's `resolvedAlgorithm` is the entry's algorithm.
- Given the landed sets, when regenerated, then `git diff --exit-code test/golden/refs/` is clean.
- Given the enumeration, then the journal lists each option of the three `.melk` files with its golden id or a reason it has none.

## Observability / Rollback

N/A — no new observable operations. Reversible.
