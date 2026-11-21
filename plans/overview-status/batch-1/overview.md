<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: rewrite the English text

One task, run by the orchestrator. No dependencies.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-english-text.md) | `docs-site/guide/overview.md`, `docs-site/index.md`, `README.md`; `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold and it is committed as
`docs(T1): say the algorithms are ported on the overview and home page` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`. Batch 2 hashes the English pages **after** this commit, so do not touch them again
after it. A later English change would make every T2 hash wrong.
