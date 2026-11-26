<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: rectpacking-open-arm (issue #81, 2026-11)

## Observation: since #1239 a block's parent row is always the row that holds it

- **Context**: proving `Compaction.java:364-365` dead at `8bca22f4` (`plans/rectpacking-open-arm/evidence.md` § 2, L4).
- **Finding**: every site that adds a block to a row's `children` sets that row as `parentRow` (`Block.java:89` through
  `InitialPlacement.java:52`, `:66-67`, `:78-80`; `Compaction.java:324`, `:413`), and no block is held twice. So
  `wasFromNextRow` (`Compaction.java:101`) is true exactly for `rows.get(nextRowIndex).getChildren().get(0)`. Checked at
  15,905,585 block steps of 1,000,000 inputs with no violation; with the line of #1239 removed, 139,696 violations in
  40,000 inputs.
- **Impact**: two corollaries. With `rowHeightReevaluation` on, the `nextBlock` of `placeBeside` holds exactly one rect
  (`U` row 19 of `plans/alg-packing/unreached.md`). And `rows.size() > nextRowIndex` is always true at `Compaction.java:325`
  and `:416`: that is the question of issue #107, which this mission did not work; its proof can start from L4.
- **Confidence**: High

## Observation: with rowHeightReevaluation on, the first block of the first row can be empty

- **Context**: lemma L1 of the same proof; the planning hypothesis said every block holds exactly one rect.
- **Finding**: `InitialPlacement.place` creates the first block before the loop (`InitialPlacement.java:52`). When the first
  rect has `IN_NEW_ROW` (or there is no rect), that block stays empty and its row is still added (`:64`, `:85`). Every other
  block holds exactly one rect. An empty `nextBlock` leaves `compact` at `Compaction.java:109`, `:117`.
- **Impact**: state rect-count claims about flag-on blocks as "at most one".
- **Confidence**: High

## Observation: a scratch oracle comparison must register every provider

- **Context**: the oracle cross-check of 1,200 inputs (`tools/oracle/run.sh --cases` against a scratch script on the port).
- **Finding**: the JSON exporter writes an option id as its shortest suffix that is unique in the registry. With only
  `RectPackingMetaDataProvider` registered the port wrote `iterations`; the oracle harness registers every provider and
  writes `compaction.iterations` (force and stress also end in `iterations`). 557 of 1,200 cases differed in that key alone.
- **Impact**: in a scratch comparison, call `registerTreeAlgorithms` of `tools/corpus/ts-layout-pipeline.ts` and export with
  `exportLikeOracle` (`test/helpers/graph-json-oracle.ts`) before reading a difference as a port defect.
- **Confidence**: High

## Observation: batch workers under a watchdog search rectpacking at about 5,000 inputs per second

- **Context**: the instrumented search (8c ran one process per input under `timeout`, about 900,000 inputs in total).
- **Finding**: an esbuild bundle of an instrumented `git archive` snapshot, six child processes over a seed range, each
  writing its current seed to a progress file before every input, and a parent that kills a child whose seed has not changed
  for 10 s: 1,000,000 inputs of 2 to 14 nodes in 187 s. A planted hang is killed and the run resumes at the next seed.
  The texts are in `plans/rectpacking-open-arm/evidence.md` § 6.
- **Impact**: reuse the shape for the next arm search (#107) instead of one process per input.
- **Confidence**: High
