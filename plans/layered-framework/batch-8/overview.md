<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Anchored unit tests (re-planned under X5)

Four parallel tasks after T10: a generic site replay (the authority, 6c D1) plus colocated unit tests for every T9
branch, each literal equal to a `layered-sites.json` row. Write-sets are disjoint by file; T11b–T11d read the JSON
directly and never import T11a's helper. The original single-task brief ([T11-anchored-tests.md](T11-anchored-tests.md))
is kept for the record.

| ID   | Description | Agent | Writes | Depends On | Done |
| ---- | ----------- | ----- | ------ | ---------- | ---- |
| T11a | Generic site replay and its test ([brief](T11a-site-replay.md)) | typescript-pro | test/helpers/layered-site-replay.ts, src/alg/layered/LayeredSiteVectors.test.ts | T10 | [x] |
| T11b | Graph sites S1–S7, S9, S10, S16–S19 (elements) ([brief](T11b-graph-sites.md)) | typescript-pro | src/alg/layered/graph/\*.test.ts except transform/, LNodeNodeType and the vectors tests; new test/helpers/lgraph-site-\*.ts | T10 | [x] |
| T11c | Transform, provider and hierarchy sites S11–S15, S19 (provider, utility, hierarchyAware) ([brief](T11c-transform-sites.md)) | typescript-pro | src/alg/layered/graph/transform/\*.test.ts except the vectors test; src/alg/layered/{LayeredLayoutProvider,IHierarchyAwareLayoutProcessor}.test.ts; new test/helpers/transform-site-\*.ts | T10 | [x] |
| T11d | Options sites S8, S20–S22 ([brief](T11d-options-sites.md)) | typescript-pro | src/alg/layered/options/\*.test.ts, src/alg/layered/LayeredPhases.test.ts, src/alg/layered/components/ComponentOrderingStrategy.test.ts, src/alg/layered/graph/LNodeNodeType.test.ts | T10 | [x] |

The batch is done when every task's acceptance criteria pass and the README gates are green, including 90 % branch
coverage for every non-staged 7a class, the U list excepted (else stop 11). Commits: one per task, `test(T11a): …`
… `test(T11d): …`.
