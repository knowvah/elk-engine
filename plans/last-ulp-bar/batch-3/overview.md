<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: pinning test and entries table; close-out and squash

Sequential: T5 needs T4's measured values and test.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T4](T4-pinning-test.md) | `last-ulp-divergences.test.ts`; the entries table and the #74 sentences in `docs/conformance.md` | orchestrator | `test/golden/last-ulp-divergences.test.ts`, `docs/conformance.md`, the journal | T1, T2, T3 | [x] |
| [T5](T5-close-out.md) | Issues, queue gates 1-7, roadmap revision, notes, squash | orchestrator | `plans/roadmap.md` (append), `.agent-notes/last-ulp-bar.md`, README, journal | T4 | [x] |

Commit after T4: `test(golden): pin each last-ulp entry under the 0.01 px bar`. T5 squashes.
