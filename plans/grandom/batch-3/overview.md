<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — `GeneratorOptions`; parser

Disjoint write-sets; T7 and T8 run in parallel. Depends on batch 2 (T3's randval rows for T7; T2's parse rows, T5's
model and T6's lexer for T8).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T7 | `GeneratorOptions`, `RandVal`, nested enums; randval replay | typescript-pro | src/core/debug/grandom/generators/{GeneratorOptions,RandVal,FileFormat,GraphType,EdgeDetermination}.ts (+ tests) | T3, T5 | [ ] |
| T8 | Recursive-descent parser; parse replay | typescript-pro | src/core/debug/grandom/parser/{GRandomParser,GRandomParserElements}.ts (+ tests) | T2, T5, T6 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
