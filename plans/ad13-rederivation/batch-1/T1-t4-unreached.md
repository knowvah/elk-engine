<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Map T4 branches unreached by the replay

**Agent:** main session · **Commit:** `docs(T1): list t4 branches unreached by the oracle replay`

## Context

Mission 6b's T4 wrote `PortPlacementCalculator`, `HorizontalPortPlacementSizeCalculator` and
`VerticalPortPlacementSizeCalculator` before their unit tests (flag row in the 6b journal). The 326-row oracle replay
exercises those classes end to end; a TS-shaped unit-test expectation could hide only on a branch the replay never
reaches. D3 limits the extra oracle rows to exactly those branches.

## Task

1. Run the replay alone with coverage restricted to the three files, writing outside the repo:

   ```bash
   npx vitest run --coverage.enabled \
     --coverage.include='src/alg/common/nodespacing/internal/algorithm/PortPlacementCalculator.ts' \
     --coverage.include='src/alg/common/nodespacing/internal/algorithm/HorizontalPortPlacementSizeCalculator.ts' \
     --coverage.include='src/alg/common/nodespacing/internal/algorithm/VerticalPortPlacementSizeCalculator.ts' \
     --coverage.reporter=json --coverage.reportsDirectory=<scratchpad>/cov-t1 \
     src/alg/common/NodeMicroLayoutVectors.test.ts
   ```

2. From `coverage-final.json`, list every branch (and uncovered line) with its TS `file:line`, the Java line it ports,
   and the T4 unit test (`describe > it` name, file:line) that covers it. Mark a branch "unreachable from any input"
   only with the reason (for example a `!== null` guard on a non-null field).
3. Write `plans/ad13-rederivation/t4-unreached.md`: a table `| TS file:line | Java line | Covering T4 test | Scenario
   for T2 |`, then the count. Known candidates: `minSizeRequiredToRespectSpacing` at and beyond `EQUALITY_TOLERANCE`
   (`HorizontalPortPlacementSizeCalculator.java:195-216`), the single free non-overhanging port with
   `availableSpace < size` (`PortPlacementCalculator.java:110-209`, the `−Infinity` spacing).
4. If the count exceeds about 10, stop (stop 8).

## Write-set

`plans/ad13-rederivation/t4-unreached.md`.

## Read-set

- `src/alg/common/nodespacing/internal/algorithm/{PortPlacementCalculator,HorizontalPortPlacementSizeCalculator,VerticalPortPlacementSizeCalculator}.ts`
  and their `.test.ts`.
- `decisions.md#D3`.

## Interface contract (output, consumed by T2)

Each row of the table is one scenario T2 records: the T4 test's fixture (its `placementContext` options from
`test/helpers/port-placement-fixtures.ts:48-100`) and the values it asserts.

## Acceptance criteria

- Given the replay run alone, when coverage is read, then every uncovered branch in the three files appears in the
  table with a covering T4 test or a stated reason it is unreachable.
- Given the table, when counted, then it has at most about 10 scenario rows.

## Observability / Rollback

N/A — analysis only. Reversible: delete the file.
