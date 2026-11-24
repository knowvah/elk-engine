<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: how a block reaches `placeBeside` (planning hypothesis, D1)

The lemmas of D1 along the path a `nextBlock` takes at `8bca22f4`. T1 proves or breaks each edge.

```plantuml
@startuml
start
:InitialPlacement.place\n(flag on: one rect per block, L1);
:RowFillingAndCompaction.start\nrows compacted in index order (L3);
:Compaction.compact(rowIdx)\nabsorbBlocks adds rects to the current row only (L2);
:getNextBlock(rows, row, blockId, nextRowIndex);
if (blockId < last block of row?) then (yes)
  :nextBlock in row.children\nparentRow == row (L4);
  :wasFromNextRow = false;
  stop
else (no)
  :nextBlock = first block of rows[nextRowIndex]\n(not compacted yet: one rect);
  :wasFromNextRow = true;
endif
:placeBeside;
if (shouldRowHeigthBeReevalauted &&\nnextBlockHeight > minHeight?) then (true)
  :return false (Compaction.java:364)\nneeds a multi-rect nextBlock;
  stop
else (false: one rect, L5)
  :continue placeBeside;
endif
stop
@enduml
```
