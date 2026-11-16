<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: evidence

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-evidence.md) | Gather the DB5 evidence for the three bundles | orchestrator (optionally an `Explore` subagent for the greps) | `plans/deferred-bundles-adr/evidence.md` | — | [x] |

No code, no oracle run (DB7). The orchestrator commits T1.
