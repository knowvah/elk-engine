<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4: rectpacking (eclipse-elk/elk#1237, #1239)

**Agent:** typescript-pro (sonnet), or the orchestrator. **Decisions:** D1, D2, D4, D5.2-D5.3, D5.5-D5.6, D9.

## Context

- `InteractiveNodeReorderer.java` now breaks desired-position ties by model order (`:50-74` at `8bca22f4`). The port
  keeps the old `-1` comparator, exported as `compareDesiredPositions`
  (`src/alg/rectpacking/intermediate/InteractiveNodeReorderer.ts:15-25`), and sorts with it at `:56`.
- `Compaction.java:413` adds `nextBlock.setParentRow(row)` after `row.addBlock(nextBlock)` in `placeBeside`. Find the
  port of that statement (`CompactionPlacement.ts` or `Compaction.ts`; `git grep -n 'addBlock(nextBlock)' src/alg/rectpacking`)
  and add the line in the same position. This ends the `absorbBlocks` hang (#73; `docs/architecture/alg-packing.md`
  § 4). **Never search for hanging inputs inside a vitest worker** (same section).
- T3 has re-recorded `rectpacking.json`. Its expected values are frozen. The journal's T3 content table lists the
  changed rows.

## Task

1. Port `test/org.eclipse.elk.alg.rectpacking.test/src/org/eclipse/elk/alg/rectpacking/InteractiveNodeReordererTest.java`
   (new, 143 lines) as `src/alg/rectpacking/InteractiveNodeReordererTest.test.ts`. Port the `CompactionTest.java` delta
   (+44) into `src/alg/rectpacking/CompactionTest.test.ts`. Run both: they are red.
2. Port the comparator change (D2) and the `setParentRow` line. Keep `@see`, the upstream comment text, and the
   statement order.
3. Update `RectPackingVectors.test.ts` "PK7: the sort proof" (D5.2): sort with the new comparator, built with a model
   order map of each row's input order, and assert that all 640 rows reproduce. Delete
   `test/helpers/rectpacking-sort-classified.ts`. Update the header comment (`:8`) and
   `intermediate/InteractiveNodeReorderer.test.ts:1-4`.
4. Run all of `src/alg/rectpacking` and `test/helpers/rectpacking-*.test.ts`. The red rows must all go green through the
   port. A changed `CHILDREN_NOT_X_GROUPED_ROWS` set is allowed only as the recomputed set (D5.3). Changed row counts
   are allowed only under D4/D5.5. Every assertion edit goes into the hand-back with its before, after and D5 item.
5. Renumber `InteractiveNodeReorderer.java:N` and `Compaction.java:N` references in `src/alg/rectpacking/**` and
   `test/helpers/rectpacking-*` (D9; `Compaction.java` references after `:412` shift by one).

## Write-set

`src/alg/rectpacking/**` (the two ported files, the two new or extended test files, `RectPackingVectors.test.ts`,
`util/RectRow.test.ts` under D5.3 only, and other colocated tests under D5.5 only); `test/helpers/rectpacking-*.ts`.

## Read-set

The Java diff `git -C ../elk diff e7eaea57 8bca22f4 -- plugins/org.eclipse.elk.alg.rectpacking test/org.eclipse.elk.alg.rectpacking.test`;
`docs/architecture/alg-packing.md` §§ 3.5, 4; `docs/translation-rules.md` (sort, AD-10 maps).

## Acceptance criteria

- Given the ported `InteractiveNodeReordererTest` and `CompactionTest` cases, when they run before the port, then they
  fail. After the port, they pass.
- Given `rectpacking.json` at `8bca22f4`, when "PK7: the sort proof" runs, then 640 of 640 rows reproduce and no
  classified list remains.
- Given every `full`, `stops` and `throws` row, when `RectPackingVectors.test.ts` runs, then each one passes at the AD-4
  bar.
- Given #73's input (the 11 children in the issue, `TARGET_WIDTH` 288, `rowHeightReevaluation`), when the port lays it
  out in a child process under `timeout 60`, then it terminates. Record the result for the #73 comment.

## Interface contracts

`compareDesiredPositions(modelOrder: Map<ElkNode, number>): (a: ElkNode, b: ElkNode) => number`, or the shape the
executor journals.

## Observability / rollback

N/A: no new observable operations. Reversible.
