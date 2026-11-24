<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: baseline and mutant reconstruction

One task, run by the orchestrator. It fixes the "before" picture that batches 2 and 3 measure against.

| Task | Writes | Depends on |
| ---- | ------ | ---------- |
| [T1](T1-baseline-mutants.md) | [items.md](../items.md) (Mutant column), the journal | — |

Done when every item in [items.md](../items.md) names its exact mutant(s) and each one's base status (survived or
killed) is journaled.
