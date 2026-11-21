<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: read manifests at the pin, tests first

One task, run by the orchestrator. No dependencies.

| Task | Writes | Status |
| ---- | ------ | ------ |
| [T1](T1-pinned-read.md) | `tools/bundle-deps.ts`; `test/architecture/bundle-deps.test.ts`; `test/architecture/module-boundaries.fitness.test.ts`; `decision-journal.md` | [x] |

Done when T1's acceptance criteria hold and it is committed as
`fix(T1): read bundle manifests at the pinned commit` (unsigned, `-F <file>`), followed by
`docs(plans): mark batch 1 done`.
