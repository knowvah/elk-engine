<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Issue suites and corpus runs; coverage map; loops sweep

Three tasks with disjoint write-sets, **in parallel**, after T16 (port fixes are T16's; a defect found here goes back through the
orchestrator as a `fix(T17|T18|T19)` commit with its artifact). T19 writes the recorder; T18 writes only `unreached.md`.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T17 | Issue suites, `NodeMarginCalculatorTest` hook, corpus-wide runs ([brief](T17-suites-and-corpus.md)) | test-automator | src/alg/layered/issues/Issue{433,444,463,870}Test.test.ts, src/alg/layered/intermediate/NodeMarginCalculatorTest.test.ts | T16 | [x] |
| T18 | Replay-alone coverage map, U items, scenarios for T20 ([brief](T18-coverage-map.md)) | orchestrator or typescript-pro | plans/layered-loops-wrapping-compaction/unreached.md | T16 | [x] |
| T19 | Loops sweep ([brief](T19-loops-sweep.md)) | java-architect | tools/vectors/LayeredLoopsVectors.java (sweep modes), tools/oracle/loops-sweep.sh, test/corpus/loops-sweep.test.ts, test/helpers/layered-loops-sweep.ts + test, .gitignore | T16 | [x] |
