<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Rectpacking `util`

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T6): port the rectpacking util package` · Scratch: `$TMPDIR/alg-packing/T6/`

## Context

Mission 8c, PK1, PK5. `R/util/{Block,BlockRow,BlockStack,RectRow,DrawingData,DrawingDataDescriptor,DrawingUtil}.java` (1,625 lines),
`R/options/InternalProperties.java`, `R/RectPackingLayoutPhases.java`. util is a leaf (core/graph only; `BlockRow.java:142` calls
`ElkUtil.translate`). No hashed containers; `remove(Object)`/`contains` are identity (`BlockRow.java:99`, `Block.java:132-134`,
`RectRow.java:152`); `Block.java:345` local `LinkedList`. Sentinels: `Double.MIN_VALUE` (`RectRow.java:155`) = `Number.MIN_VALUE`;
`POSITIVE_INFINITY`/`NEGATIVE_INFINITY` kept.

## Task

1. Port the classes whole (Java method boundaries; sections behind the class only if `Block.ts` exceeds a limit).
2. `test/helpers/rectpacking-replay-{rows,dump,elk}.ts` in the `disco-replay-*` shape: read `rectpacking.json`, rebuild the p2 stop
   structures (rows, stacks, blocks, rects) from rows, dump them by the recorder's field names.
3. Unit tests per class from the p2/p3 stop rows (structure invariants and bounds as recorded); every expectation from a row.

## Write-set

`src/alg/rectpacking/util/**`, `src/alg/rectpacking/options/InternalProperties{,.test}.ts`, `src/alg/rectpacking/RectPackingLayoutPhases.ts`,
`test/helpers/rectpacking-replay-*.ts`.

## Read-set

The Java above, `test/helpers/disco-replay-*.ts`, `src/core/util/ElkUtil*.ts` (`translate`), `src/core/math/ElkRectangle.ts`,
`decisions.md#pk5--hashed-containers`, T1's journal row (stop names).

## Interface contract (consumed by T9, T10, T12)

`Block`, `BlockRow`, `BlockStack`, `RectRow`, `DrawingData`, `DrawingDataDescriptor`, `DrawingUtil`, `InternalProperties`,
`RectPackingLayoutPhases` under Java signatures; the replay helpers.

## Acceptance criteria

- Given every p2 stop row, when the structure is rebuilt and dumped, then it equals the row.
- Given a `remove(Object)` site, then the port removes by identity (`indexOf`), never by value.
- Given `RectRow`'s `Double.MIN_VALUE` sentinel, then the port uses `Number.MIN_VALUE`.

## Observability / Rollback

N/A — no new observable operations. Reversible.
