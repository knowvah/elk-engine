<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Rectpacking recorder

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record rectpacking oracle vectors` · Scratch: `$TMPDIR/alg-packing/T1/`

## Context

Mission 8c, PK1, PK7. The oracle is the spec; no TS exists yet. `R/RectPackingLayoutProvider.java`, `R/intermediate/*`,
`R/p1widthapproximation/*`, `R/p2packing/*`, `R/p3whitespaceelimination/*`, `R/util/*`. No hashed containers (PK5); lists iterate in
insertion order and `remove(Object)` is identity. The provider falls back to `BoxLayoutProvider` (`R/RectPackingLayoutProvider.java:94-103`)
and calls `NodeMicroLayout` (`:69`, `:159`).

## Task

1. Write `tools/vectors/RectPackingVectors.java` and `rectpacking-vectors.sh` from the `DiscoVectors.java` shape: `rectpacking.json`
   with groups `full`, `stops`, `throws`, `sort`, the stops and scenarios of PK1 (every option value of `RectPacking.melk` one factor
   at a time; hierarchical children; `interactive` + `desiredPosition` with ties; the three native corpus models).
2. `sort` group (PK7): seeded lists of 1-64 `desiredPosition` values with many ties (and the all-equal list); per row the input
   positions (with an index per element) and either the sorted index order from `Collections.sort` with the comparator copied
   verbatim from `R/intermediate/InteractiveNodeReorderer.java:56-63`, or the thrown class and message. At least 500 rows, 100 of
   length ≥ 32.
3. Check `uptime` first. Run detached under `nice -n 10`; two runs must be `cmp`-identical.

## Write-set

`tools/vectors/RectPackingVectors.java`, `tools/vectors/rectpacking-vectors.sh`, `test/golden/refs/java/rectpacking.json`.

## Read-set

The Java above, `tools/vectors/DiscoVectors.java`, `tools/vectors/disco-vectors.sh`, `tools/vectors/vector-cache.sh`,
`decisions.md#pk1--recorders-and-row-contract`, `#pk7--the-contract-violating-comparator`, `tools/melk/sources/RectPacking.melk`,
the native models named in `test/corpus/census.json` (rectpacking rows).

## Interface contract (consumed by T6, T9, T10, T12)

Row `{ id, group, input, expected }`; stop names fixed in the launcher's header comment and listed in the journal; `sort` rows
`{ id, group: "sort", input: { positions: number[] }, expected: { order: number[] } | { throws: { class, message } } }`.

## Acceptance criteria

- Given a cold run, when repeated, then both outputs are `cmp`-identical and the ref is under 16 MiB.
- Given every option value of PK2 for rectpacking, then a `full` row exercises it.
- Given a row whose re-imported run differs from the original graph run, then the recorder fails.
- Given the `sort` group, then it holds ≥ 500 rows, ≥ 100 of length ≥ 32, and states per row whether Java threw.

## Observability / Rollback

N/A — no new observable operations. Reversible.
