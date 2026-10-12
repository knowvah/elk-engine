<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — core.math and the EMF runtime

Both tasks need T1's `LinkedList`/`ListIterator`; they are otherwise independent.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T5 | `core.math`: `IDataObject`, `KVector`, `KVectorChain`, `Spacing`, `ElkMargin`, `ElkPadding` + ported `KVectorTest`, `KVectorChainTest` | typescript-pro | src/core/util/IDataObject.ts, src/core/math/{KVector,KVectorChain,Spacing,ElkMargin,ElkPadding}.ts (+ KVector/KVectorChain/Spacing .test.ts) | T1 | [x] |
| T6 | EMF runtime `src/emf/` + fitness boundary (D1, D2, D4) | typescript-pro | src/emf/** (+ tests), test/architecture/module-boundaries.fitness.test.ts | T1 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
