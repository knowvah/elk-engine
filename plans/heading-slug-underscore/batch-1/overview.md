<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: rows first, then the rule

One task, run by the orchestrator. No dependencies.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-rows-and-rule.md) | `test/docs/site-config.test.ts`; `docs-site/.vitepress/config.ts`; `docs-site/.vitepress/README.md`; `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold and it is committed as
`fix(T1): keep connector punctuation in heading ids` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`.
