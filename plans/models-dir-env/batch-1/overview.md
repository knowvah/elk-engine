<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: resolve from the real environment, prove it, drop the symlink step

One task, run by the orchestrator.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-honour-models-env.md) | `test/corpus/census.test.ts`; `test/corpus/corpus.test.ts`; `docs/architecture/elk-upgrade.md` (§ 14 step 5); `$TMPDIR/pm98-*` (scratch, removed); `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold. T1 is committed as
`test(T1): resolve the models dir from the environment in two files` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`.
