<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — `LayoutMetaDataService` + `CoreOptions`

One task, larger than the others (~700 Java lines plus the generated file): `IndividualSpacings`,
`LayoutMetaDataService` and `CoreOptions` import each other, and every commit must typecheck, so
they land together. Stop condition 13 bounds it at 3 revisions.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T14 | `IndividualSpacings`, `PackingMode`, `LayoutMetaDataService`, generated `CoreOptions.ts`, registry check | typescript-pro | src/core/util/{IndividualSpacings,PackingMode}.ts, src/core/data/LayoutMetaDataService.ts, src/core/options/CoreOptions.ts (generated), test/melk/{core-registry.test.ts,held-back.ts} (+ .test.ts) | T1–T5, T8, T10, T13 | [x] |

Batch done when the acceptance criteria pass and the README gates are green.
