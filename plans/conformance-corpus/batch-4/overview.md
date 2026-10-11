<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Sweep

Plans every case from the census, generated corpus, and variants; runs each twice in separate
JVMs; assigns D4 verdicts. Single task.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T8 | Oracle corpus sweep | typescript-pro | tools/oracle/sweep.sh, tools/corpus/sweep.ts, test/corpus/sweep.test.ts | T4, T5, T6 | [ ] |

Batch done when T8's acceptance criteria pass, the first full sweep is journaled (wall time,
verdict counts per algorithm), and the README gates are green.
