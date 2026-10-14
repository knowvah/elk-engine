<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2b — TS foundations: layout-option proxy, validation base, formatting2 subset

Three independent TypeScript tasks with disjoint write-sets, independent of batch 2a (they share no
files; T11/T12 only follow the file-mapping rule fixed in [T7](../batch-2a/T7-xtext-converters.md), which
needs no code). T10 ports the one unported `core` dependency of the property converters; T11 and T12 port
the Xtext `validation` and `formatting2` subsets that the ELK validator (T20) and formatter (T21) extend.
Depends on batch 1; may run concurrently with batch 2a.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T10 | `core.util.internal.LayoutOptionProxy` | typescript-pro | src/core/util/internal/LayoutOptionProxy.ts (+ .test.ts) | T3 | [x] |
| T11 | Xtext declarative-validation subset and resource validator | typescript-pro | src/xtext/validation/**, src/xtext/diagnostics/Severity.ts (+ .test.ts) | T4 | [x] |
| T12 | Xtext `formatting2` subset: region access, hidden-region formatting, rendering | typescript-pro | src/xtext/formatting2/** (+ .test.ts) | T5 | [x] |

T11 and T12 import nothing from `src/graph/text` (boundary rule, T6) and test against test-local
grammars/objects; their ELK-specific replay happens in T20/T21/T22.

Batch done when every task's acceptance criteria pass and the README gates are green.
