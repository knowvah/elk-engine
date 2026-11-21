<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: build helper and launch sites; melk and dump TS debts

| Task                                 | Writes                                                                                                                                              | Owner        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| [T1](T1-java-program-build.md)       | `tools/vectors/java-program.sh` (new), `vector-cache.sh`, `layered-loops-vectors.sh`, `tools/oracle/loops-sweep.sh`, `test/vectors/java-program.test.ts` (new) | orchestrator |
| [T2](T2-melk-list-integer.md)        | `test/melk/recorder.ts`, its test, `test/melk/layered-options.test.ts`, `test/melk/layered-registry.test.ts`                                        | any          |
| [T3](T3-dump-kvectorchain.md)        | `test/helpers/layered-framework-replay.ts` (+ test), `test/helpers/layered-site-replay-dump.ts` and its importers, `LayeredOrderVectors.java` comment | any          |

The three write-sets are disjoint. T2 and T3 do not depend on T1. Each task is one commit (temporary commits; T6
squashes).

**Ordering constraint.** T1 must be committed before T5 starts the `elkj` lane. After T1, do not edit
`vector-cache.sh`, `java-program.sh`, `elkj-vectors.sh` or any `Elkj*Vectors.java` again: each edit restarts the 4 h
lane.

Exit: T1-T3 acceptance criteria hold. `npx vitest run test/melk test/helpers test/vectors` and
`npm run typecheck` are green.
