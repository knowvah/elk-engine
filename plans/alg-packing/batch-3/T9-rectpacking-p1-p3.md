<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Rectpacking p1 and p3

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T9): port rectpacking width approximation and whitespace elimination` ·
Scratch: `$TMPDIR/alg-packing/T9/`

## Context

Mission 8c. `R/p1widthapproximation/*` (886 lines: `AreaApproximation`, `Calculations`, `GreedyWidthApproximator`,
`TargetWidthWidthApproximator`, the filters, `BestCandidateFilter`), `R/p3whitespaceelimination/*` (238: `EqualWhitespaceEliminator`,
`ToAspectratioNodeExpander`, `RectangleExpansion`). Exact float equality against the computed min/max is verbatim
(`AreaFilter.java:43`, `ScaleMeasureFilter.java:48`, `AspectRatioFilter.java:46`). Guava `Lists.newArrayList` → arrays.
`RectangleExpansion`'s import of `RowFillingAndCompaction` is Javadoc only (no TS import). `UnsupportedConfigurationException` at
`TargetWidthWidthApproximator.java:47`, `EqualWhitespaceEliminator.java:50`; `IllegalArgumentException` default arms
(`AreaApproximation.java:302`) are `U` if unreachable.

## Task

1. Port the classes whole; enable the strategy enum `create()` bodies T5 staged for p1 and p3; remove their rows.
2. Replay the p1 stop of every `rectpacking.json` row (chosen `DrawingData`, target width) and the p3 stop from the p2 stop's state
   (T6 helpers rebuild it); replay the matching `throws` rows.

## Write-set

`src/alg/rectpacking/p1widthapproximation/**`, `src/alg/rectpacking/p3whitespaceelimination/**` (the enum files included),
`test/architecture/staged-classes.json` (their rows).

## Read-set

The Java above, `src/alg/rectpacking/util/**`, `test/helpers/rectpacking-replay-*.ts`, `src/core/UnsupportedConfigurationException.ts`.

## Interface contract (consumed by T12)

The phase classes and filters under Java signatures; `WidthApproximationStrategy.create()`, `WhiteSpaceEliminationStrategy.create()` live.

## Acceptance criteria

- Given every row's p1 stop, when replayed, then the chosen drawing and target width equal the row (raw bits).
- Given every row's p3 stop, then node bounds equal the row at the AD-4 bar.
- Given each `throws` row of p1 or p3, then class and message equal the row.

## Observability / Rollback

N/A — no new observable operations. Reversible.
