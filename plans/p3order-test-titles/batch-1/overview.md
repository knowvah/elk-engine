<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: rename the three titles

One task, run by the orchestrator. No dependencies.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-rename-titles.md) | the three `p3order/*.test.ts` title lines; `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold and it is committed as
`test(T1): retitle p3order nested-graph suites after 7h` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`.
