<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 6 — Suites; coverage map; compound sweep

Three tasks with disjoint write-sets run **in parallel**, after batch 5. T11 ports the 9 issue suites and the 3 graph.json
methods, and files nothing new beyond H13's issue. T12 writes the coverage map `unreached.md` and lists the site scenarios T14
records. T13 adds the sweep to T1's recorder and runs it at stride 1.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T11 | The 9 issue suites and the 3 graph.json methods ([brief](T11-suites.md)) | typescript-pro | src/alg/layered/issues/Issue{316,455,552,596,628,665,700,701,734}Test.test.ts, src/graph/json/{TransferLayoutTest,LayoutOptionsTest,IndividualSpacingsTest}.test.ts (+ `EdgeCoordsTest.test.ts`) | T9 | [x] |
| T12 | Coverage map `unreached.md`, H8 closure list, site scenario list ([brief](T12-coverage-map.md)) | typescript-pro, checked by the orchestrator | plans/layered-compound/unreached.md | T9 | [x] |
| T13 | Compound sweep ([brief](T13-compound-sweep.md)) | java-architect | tools/vectors/LayeredCompoundVectors.java (sweep part), tools/oracle/compound-sweep.sh, test/corpus/compound-sweep.test.ts, test/helpers/layered-compound-sweep{,.test}.ts, .gitignore | T9 | [x] |
