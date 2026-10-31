<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Before-P3 processors; counting and preserve-order

Three parallel tasks after batch 1, test-first against the `scenarios/*` rows of `layered-order.json` with the class
injected through T3's helpers (7b's pattern). Write-sets are disjoint by file. None of these classes needs a p3order
class: the counters and comparators depend on the LGraph model only; the processors on the model and options.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T4a | `PortSideProcessor`, `PortListSorter`, `LongEdgeSplitter`, `InvertedPortProcessor` ([brief](T4a-processors-a.md)) | typescript-pro | src/alg/layered/intermediate/{PortSideProcessor,PortListSorter,LongEdgeSplitter,InvertedPortProcessor}.ts + tests | T1, T3 | [x] |
| T4b | `NorthSouthPortPreprocessor`, `HierarchicalPortConstraintProcessor`, `SemiInteractiveCrossMinProcessor`, `SortByInputModelProcessor` ([brief](T4b-processors-b.md)) | typescript-pro | src/alg/layered/intermediate/{NorthSouthPortPreprocessor,HierarchicalPortConstraintProcessor,SemiInteractiveCrossMinProcessor,SortByInputModelProcessor}.ts + tests | T1, T3 | [x] |
| T5  | `p3order/counting` (6) and `intermediate/preserveorder` (3) ([brief](T5-counting-preserveorder.md)) | typescript-pro | src/alg/layered/p3order/counting/*.ts, src/alg/layered/intermediate/preserveorder/*.ts + tests | T1, T3 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green.
