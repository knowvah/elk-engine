<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — `ElkGraphJson`, `transferLayout`

Two independent tasks; write-sets disjoint (T16 owns `JsonImporter.ts` for the delegation edit).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T15 | `ElkGraphJson` + end-to-end vector replay | typescript-pro | src/graph/json/ElkGraphJson.ts (+ test) | T2, T10, T12, T14 | [ ] |
| T16 | `transferLayout` + replay test | typescript-pro | src/graph/json/JsonImporterLayoutTransfer.ts, src/graph/json/JsonImporter.ts (delegation only), test/graph-json/transfer-replay.test.ts | T4, T10, T14 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
