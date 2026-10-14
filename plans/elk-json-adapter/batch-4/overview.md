<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Gson façade, importer core, exporter, converter

Four independent tasks; write-sets disjoint.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T10 | Gson façade (`Gson`, `GsonBuilder`, `TypeAdapter`) | typescript-pro | src/gson/{Gson,GsonBuilder,TypeAdapter}.ts (+ tests) | T7, T8 | [x] |
| T11 | `JsonImporter` core | typescript-pro | src/graph/json/JsonImporter.ts (+ test) | T3, T7, T9 | [x] |
| T12 | `JsonExporter` | typescript-pro | src/graph/json/JsonExporter.ts, src/graph/json/JsonExporterSections.ts (only if needed, J3) (+ tests) | T3, T8, T9 | [x] |
| T13 | `JsonMetaDataConverter` | typescript-pro | src/graph/json/JsonMetaDataConverter.ts (+ test) | T3, T8, T9 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
