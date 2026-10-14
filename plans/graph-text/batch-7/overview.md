<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Validator and formatter

Two independent tasks with disjoint write-sets: T20 ports `ElkGraphValidator`, `IssueCodes` and
`ElkGraphTextUtil` on the T11 validation base, plus core's `LayoutOptionValidator`; T21 ports `ElkGraphFormatter` on the T12 `formatting2` subset.
Depends on batch 6 (T18 `load` for loading scenarios; T19 serializer for formatted output).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T20 | `ElkGraphValidator`, `IssueCodes`, `ElkGraphTextUtil` | typescript-pro | src/graph/text/validation/{ElkGraphValidator,IssueCodes}.ts, src/graph/text/ElkGraphTextUtil.ts, src/core/validation/LayoutOptionValidator.ts, src/graph/util/ElkGraphUtil.ts (export only) | T11, T18 | [x] |
| T21 | `ElkGraphFormatter` | typescript-pro | src/graph/text/formatting2/ElkGraphFormatter.ts | T12, T19 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green.
