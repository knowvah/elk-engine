<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Ported full-layout suites

Three parallel tasks over `suite-allocation.md`. A suite whose run throws naming a later mission moves there with a journal row
(F8). The review step checks each port against the Java before the commit: no assertion the Java lacks; expected values are the
Java's literals. A red assertion is a port defect until shown otherwise; a test can never be relaxed (stop 3).

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T12a | Model-order suites ([brief](T12a-model-order-suites.md)) | typescript-pro | colocated `*Test.test.ts` for those suites; additive cases in SortByInputModelProcessorTest and PortListSorterTest | T11 | [x] |
| T12b | `Issue*` suites allocated to this brief ([brief](T12b-issue-suites.md)) | typescript-pro | src/alg/layered/issues/** except Issue587 and Issue726 | T11 | [x] |
| T12c | Processor, full-layout and S1 suites ([brief](T12c-processor-and-s1-suites.md)) | typescript-pro | colocated `*Test.test.ts`, the S1 suites, the un-skip in LayeredSpacingTest and RecursiveGraphLayoutEngine | T11 | [x] |

The batch is done when all three pass, the Java run counts agree with `java-baseline.md` for the vendored scope stated per suite, and the README gates are green.
