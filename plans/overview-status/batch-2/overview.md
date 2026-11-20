<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: refresh the 46 locale pages

One task. The orchestrator dispatches translation subagents in parallel, each owning a disjoint set of locale
directories, then verifies and commits. Depends on batch 1 (the T1 commit).

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T2](T2-translations.md) | `docs-site/<p>/guide/overview.md`, `docs-site/<p>/index.md` for the 23 locales; `decision-journal.md` | [x] |

Done when T2's acceptance criteria hold and it is committed as
`docs(T2): refresh the overview and home page translations` (unsigned, `-F <file>`; the body lists the locales and
any locale left to a follow-up under stop 6), followed by `docs(plans): mark batch 2 done`.
