<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Ported tests, round-trip, sweep

Three independent tasks; write-sets disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T17 | Port `EdgesTest`, `IdTest`, `GraphTest`, `LayoutOptionsTest` (19 methods) | typescript-pro | src/graph/json/{EdgesTest,IdTest,GraphTest,LayoutOptionsTest}.test.ts | T15 | [x] |
| T18 | Round-trip vs `elk-parse` refs + local 550-model sweep | tooling-engineer | test/golden/json-roundtrip.test.ts, tools/oracle/json-sweep.sh, test/corpus/json-sweep.test.ts, .gitignore | T5, T15 | [x] |
| T19 | Port `ExportTest`, `IndividualSpacingsTest`, `SectionsTest`, `TransferLayoutTest` (13 methods; 3 deferred) | typescript-pro | src/graph/json/{ExportTest,IndividualSpacingsTest,SectionsTest,TransferLayoutTest}.test.ts | T15, T16 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
