<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: re-record vectors and goldens; triage the ref diff

Two orchestrator lanes after T1 (runbook §§ 7, 8, 11). T2 starts first and runs for hours. T3 runs beside it, one JVM
job at a time. T3's re-records of `rectpacking.json` and `spore-layout.json` unblock T4 and T5. T6 can start right after
T1.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-elkj-lane.md) | `elkj-vectors.sh` in its own detached lane | orchestrator | `test/golden/refs/java/graph-json-text-*.json` | T1 | [x] |
| [T3](T3-rerecord-and-triage.md) | Every other recorder (D1 recorder change first), goldens, regen scripts, census; normalized triage | orchestrator | `tools/vectors/RectPackingVectors.java`, `tools/vectors/SporeLayoutVectors.java` (D4 only), `test/golden/refs/**` except the `elkj` refs, `test/corpus/{census.json,elkt-curated,elkj-curated,generated}` | T1 | [x] |
