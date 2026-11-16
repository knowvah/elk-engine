<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorders, golden set, option codegen and staging

Parallel; disjoint write-sets. The recorders and goldens need only the oracle; T5 needs only the melk tool. Each recorder runs
detached under `nice -n 10` after an `uptime` check (system prompt: long runs).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | Rectpacking recorder, incl. the `sort` group ([brief](T1-rectpacking-recorder.md)) | java-architect | tools/vectors/RectPackingVectors.java, rectpacking-vectors.sh, test/golden/refs/java/rectpacking.json | — | [x] |
| T2 | Spore recorder, incl. `minst` and `jitter` ([brief](T2-spore-recorder.md)) | java-architect | tools/vectors/SporeLayoutVectors.java, spore-layout-vectors.sh, test/golden/refs/java/spore-layout.json | — | [x] |
| T3 | Topdownpacking recorder ([brief](T3-topdownpacking-recorder.md)) | java-architect | tools/vectors/TopdownPackingVectors.java, topdownpacking-vectors.sh, test/golden/refs/java/topdownpacking.json | — | [x] |
| T4 | `packing` golden set ([brief](T4-golden-set.md)) | tooling-engineer | tools/oracle/regen-goldens.sh (additive), test/golden/packing.json, test/golden/packing-inputs/**, test/golden/refs/elk-packing/** | — | [x] |
| T5 | Option codegen, hand-ported option enums, staged providers ([brief](T5-options-staging.md)) | typescript-pro | src/alg/{rectpacking,spore,topdownpacking}/options/**, the staged provider and enum files, test/architecture/staged-classes{.json,.fitness.test.ts}, tools/melk config only if a bundle needs an entry | — | [x] |

Gate: the batch gate of the README; the `git diff --name-status` check lists exactly the added refs and golden files.
