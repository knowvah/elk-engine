<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Naming, scoping, linking

One task: the three ElkGraph-specific language services that sit on the Xtext subset (`src/xtext/naming`
T8, `scoping` T14, `linking` T16) and the converter/parser outputs of batch 3 and 4. Depends on batch 4.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T17 | `ElkGraphQualifiedNameProvider`, `ElkGraphScopeProvider`, `ElkGraphLinker` | typescript-pro | src/graph/text/naming/ElkGraphQualifiedNameProvider.ts, src/graph/text/scoping/ElkGraphScopeProvider.ts (+ generated-chain base if needed), src/graph/text/linking/{ElkGraphLinker,ElkGraphReferences}.ts | T13, T14, T15, T16 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
