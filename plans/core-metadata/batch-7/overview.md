<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Replacer, content assist, held-back emission

Three independent tasks (disjoint write-sets), all needing the service and `CoreOptions` (T14).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T15 | `DeprecatedLayoutOptionReplacer` + ported JUnit | typescript-pro | src/core/data/DeprecatedLayoutOptionReplacer.ts (+ .test.ts) | T14 | [ ] |
| T16 | `LayoutDataContentAssist` + ported JUnit (minus 2 cases, C10) | typescript-pro | src/core/data/LayoutDataContentAssist.ts (+ .test.ts) | T14 | [ ] |
| T17 | Emit the held-back Core algorithm classes against stub providers | typescript-pro | test/melk/held-back-emit.test.ts, test/melk/stub-provider.ts, .gitignore | T14 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
