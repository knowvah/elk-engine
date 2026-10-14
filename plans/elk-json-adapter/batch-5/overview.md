<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Importer edges

One task: it owns `JsonImporter.ts` for the `transformEdges` wiring, so nothing else that edits that
file can share the batch.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T14 | Importer edges and sections | typescript-pro | src/graph/json/JsonImporterEdges.ts (+ test), src/graph/json/JsonImporter.ts (wiring only) | T11 | [x] |

Batch done when the acceptance criteria pass and the README gates are green.
