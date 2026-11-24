<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: mission start, probe harness, baseline measurements

One task, run by the orchestrator. Batch 2 needs its table of `D_oracle` per shape, the first TS overflow sites and the D5
reference outputs.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-baseline-and-probe.md) | Probe harness; oracle and TS brackets; D5 references | orchestrator | the journal; `$TMPDIR/tree-recursion-depth/**` | — | [x] |
