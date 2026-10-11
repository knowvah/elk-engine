<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3a — Java shims, oracle harness, corpus wiring

Runs in parallel with Batch 3b after Batches 2a and 2b. Tasks independent.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T9 | `java.util.Random` + `Collections.shuffle` | typescript-pro | src/java/util/Random.ts, Random.test.ts, Collections.ts, Collections.test.ts | T6 | [ ] |
| T10 | `java.lang` shims | typescript-pro | src/java/lang/{JavaMath,Int32,DoubleCompare}.ts + tests | T6 | [ ] |
| T11 | Oracle harness (JSON in → layout JSON out) | java-architect | tools/oracle/harness/ElkOracle.java, tools/oracle/run.sh | T8 | [ ] |
| T12 | elk-models corpus wiring | typescript-pro | test/corpus/manifest.json, test/corpus/fetch.sh, test/corpus/corpus.ts, test/corpus/corpus.test.ts | T1 | [ ] |

T9 and T10 both add `src/java/` files (different subdirectories); the
module-boundaries test (T5) must pass after both.
