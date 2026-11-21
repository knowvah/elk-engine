<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: exempt `vector-cache/`, tests first

One task, run by the orchestrator. No dependencies.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-exempt-vector-cache.md) | `tools/oracle/build.sh`; `test/architecture/oracle-build.test.ts`; `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold and it is committed as
`fix(T1): exempt the vector cache from the stale-worktree check` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`.
