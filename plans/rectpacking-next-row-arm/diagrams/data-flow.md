<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow: how control reaches the next-row guards (planning hypothesis, D1)

The lemmas of D1 along one pass of `Compaction.compact` at `8bca22f4`. T1 proves or breaks each edge.

```plantuml
@startuml
start
:getNextBlock(rows, row, blockId, nextRowIndex) (:98);
if (blockId < last block of row?) then (yes)
  :nextBlock in row; parentRow == row (I);
  :wasFromNextRow = false (:101);
else (no, and nextRowIndex < rows.size(), :217)
  :nextBlock = rows[nextRowIndex].children[0] (:219);
  :wasFromNextRow = true (N1);
endif
:absorbBlocks (:113): rows not passed (N2);
if (nextBlock empty? (:126)) then (yes)
  :rows.remove at :132;
  :continue (:137);
  stop
else (no: rows unchanged since :217, N2)
endif
if (placeBelow (:147)) then (called)
  if (wasFromNextRow? (:322)) then (true)
    :rows.size() > nextRowIndex (:325)\nalways true (N3);
  else (false)
    :guard not reached;
  endif
else (returned false)
  if (wasFromNextRow? (:152)) then (true)
    :placeBeside (:158);
    :rows.size() > nextRowIndex (:416)\nalways true (N4);
  else (false)
    :guard not reached;
  endif
endif
stop
@enduml
```
