<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — Recorder, replay helpers, layered golden refs

Three tasks with disjoint write-sets run **in parallel**. T1 and T3 record every expectation from the oracle before any 7h
TypeScript exists (AD-13, L4). T2 builds the TS twin of T1's row format (the hierarchical `models` stop and the whole-tree dump).
It consumes T1's **header contract**, not its output, and develops against hand-built nested `LGraph`s until T1 lands. T3 records
refs only; their TS test is T10's, because it cannot pass before T8.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T1  | Oracle recorder `LayeredCompoundVectors`, the ref, vendored inputs ([brief](T1-compound-recorder.md)) | java-architect | tools/vectors/{LayeredCompoundVectors.java,layered-compound-vectors.sh}, test/golden/refs/java/layered-compound.json, test/golden/inputs/compound/**, test/golden/inputs/manifest.json, test/golden/algorithm-refs.test.ts | — | [x] |
| T2  | Compound replay helpers: rows, hierarchical stops, tree dump ([brief](T2-compound-replay-helpers.md)) | typescript-pro | test/helpers/layered-compound-replay-{rows,stops,dump}.ts + tests | — | [x] |
| T3  | Layered golden set: `regen-goldens.sh --set layered`, 24 refs ([brief](T3-layered-golden-refs.md)) | build-engineer | tools/oracle/regen-goldens.sh, test/golden/layered.json, test/golden/refs/elk-layered/** | — | [x] |

The batch is done when all three tasks pass their acceptance criteria and the README gates are green. Agents never run
`npm run coverage` and never commit; the orchestrator commits each task.
