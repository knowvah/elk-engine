<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: baseline, the needs-ruling issue, the mutation harness

The orchestrator works alone. Batch 2 needs the T1 baseline, which says which arms the landed replays already reach and
which mutants survive them, and it needs the harness.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-baseline-and-harness.md) | Scoped baselines per item, mutant reconstruction, `mutate.sh`, the M-e `needs-ruling` issue | orchestrator | `items.md`, the journal; `$TMPDIR` only otherwise | — | [x] |
