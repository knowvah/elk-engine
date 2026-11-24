<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: audit, inputs and measurement

One task, run by the orchestrator. Everything later reads its journal rows and its input file.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-audit-and-measure.md) | Enumerate last-ulp entries, collect divergent-call inputs, measure each delta | orchestrator | `tools/vectors/last-ulp-inputs.txt`, the journal | — | [x] |

Commit after T1: `docs(plans): journal the last-ulp audit for #74` with the input file.
