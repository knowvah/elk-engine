<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorders, golden set, option codegen

Parallel; disjoint write-sets. Expectations come first (AD-13).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | Force and stress recorder ([brief](T1-force-recorder.md)) | java-architect | tools/vectors/{ForceVectors.java,force-vectors.sh}, test/golden/refs/java/{force,stress}.json | — | [x] |
| T2 | Disco recorder ([brief](T2-disco-recorder.md)) | java-architect | tools/vectors/{DiscoVectors.java,disco-vectors.sh}, test/golden/refs/java/disco.json | — | [x] |
| T3 | `force-disco` golden set ([brief](T3-golden-set.md)) | build-engineer | tools/oracle/regen-goldens.sh, test/golden/force-disco.json, test/golden/force-disco-inputs/**, test/golden/refs/elk-force-disco/** | — | [x] |
| T4 | Options codegen and staged providers ([brief](T4-options-codegen.md)) | typescript-pro | src/alg/{force,disco}/options/**, src/alg/force/stress/Dimension.ts, three staged providers, test/architecture/staged-classes{.json,.fitness.test.ts}, test/melk/force-disco-options.test.ts | — | [x] |

Files under `tools/vectors/` change the `vector-cache.sh` inputs digest: the next recorder runs are cold once.
