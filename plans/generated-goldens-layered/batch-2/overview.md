<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: docs; close-out and squash

Sequential, no subagent. T2 needs T1's ids and counts; T3 needs T2.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T2](T2-docs.md) | Counts, mislabel notes out, the 0.01 px bar citing #74 (D6) | orchestrator | `docs/conformance.md`, `docs/architecture/alg-trees.md`, `docs/architecture/alg-layered-compound.md` | T1 | [x] |
| [T3](T3-close-out.md) | Gates 1-7, hand-back, roadmap, notes, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/generated-goldens-layered.md`, README, journal | T2 | [x] |
