<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Rectpacking p2

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T10): port rectpacking packing` · Scratch: `$TMPDIR/alg-packing/T10/`

## Context

Mission 8c, PK11, stop 17. `R/p2packing/*` (1,179 lines: `Compaction`, `RowFillingAndCompaction`, `InitialPlacement`, `NoPlacement`,
`Compactor`, `SimplePlacement`, `PackingStrategy`). `RowFillingAndCompaction.java:117` retries a row with `rowIdx--` when
`Compaction.compact` returns `second == true` (no guard: keep; a hang candidate is stop 17). `Compactor.java:75-95` loop on `iterations`;
`:91` NaN guard `newSM == (double) newSM`; `:190-195` `copyPosition` recursion (verbatim, hierarchy depth). `System.err.println`
at `Compaction.java:74` → `console.error` (PK11). `remove(Object)` identity at `Compaction.java:132`; `.equals(row)` at `:101` is identity.

## Task

1. Port the classes whole; enable `PackingStrategy.create()`; remove its row.
2. Replay the p2 stop of every `rectpacking.json` row from the p1 stop's state (rows, stacks, blocks, rects, bounds).
3. Port nothing of `CompactionTest` here (it runs the provider: T12).

## Write-set

`src/alg/rectpacking/p2packing/**`, `test/architecture/staged-classes.json` (its rows).

## Read-set

The Java above, `src/alg/rectpacking/util/**`, `test/helpers/rectpacking-replay-*.ts`, `decisions.md#pk11--scope-edges-and-hand-offs`.

## Interface contract (consumed by T12)

`PackingStrategy.create()` live; `Compactor`, `RowFillingAndCompaction`, `SimplePlacement`, `NoPlacement` under Java signatures.

## Acceptance criteria

- Given every row's p2 stop, when replayed, then the structure and bounds equal the row (raw bits).
- Given the `compaction.iterations` rows, then the iteration count and the `newSM` NaN guard behave as recorded.
- Given an empty-block input reaching `Compaction.java:74`, then the port writes the same text with `console.error` (or the arm is `U`).

## Observability / Rollback

N/A — no new observable operations. Reversible.
