<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Option data, `.melk` parser

Two independent tasks (disjoint write-sets). T8 needs T3 (`Pair`); T9 needs T6 (vendored sources).
T9 also turns on coverage for `tools/melk/**` (C7).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T8 | `ILayoutMetaData`, `ILayoutMetaDataProvider`, `LayoutOptionData`, `Class<?>` tokens | typescript-pro | src/core/data/{ILayoutMetaData,ILayoutMetaDataProvider,LayoutOptionData}.ts, src/java/lang/JavaClass.ts (+ .test.ts) | T3 | [ ] |
| T9 | `.melk` lexer, parser, AST | typescript-pro | tools/melk/{lexer,parser,ast}.ts, test/melk/parser.test.ts, vitest.config.ts | T6 | [ ] |

Batch done when every task's acceptance criteria pass and the README gates are green.
