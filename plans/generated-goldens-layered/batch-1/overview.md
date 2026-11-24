<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: move the three goldens, prove byte identity

One task: the manifests, refs, inputs, script and both runners form one consistent unit (any partial state is red).
Sequential, no subagent.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-move-goldens.md) | Move entries and refs (D1), vendor inputs and resolve them in the regen script (D2), update both runners (D3), regen both sets (D4, D5) | orchestrator | `test/golden/{trees,layered}.json`, the 3 refs, `test/golden/inputs/pipeline/generated/*`, `tools/oracle/regen-goldens.sh`, `test/golden/{tree,layered-hierarchy}-goldens.test.ts` | — | [x] |
