<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — Shared parse runtime; lexer

T7 performs D1 (behaviour-neutral for 4b). T8 starts `src/graph/json/text` with the lexer and admits the bundle to
`src/xtext`. Disjoint write-sets; they run in parallel. Depends on batch 1 (T2 for T8's rows).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T7 | Move the generic parse runtime to `src/xtext/parser/` (D1) | typescript-pro | src/xtext/parser/** (+ tests), src/graph/text/parser/{ParseRecords,ElkGraphParser,ElkGraphParserEdges}.ts (+ their tests), test/architecture/exception-hierarchy.fitness.test.ts | — | [x] |
| T8 | `.elkj` lexer and token types; fitness admission | typescript-pro | src/graph/json/text/parser/{ElkGraphJsonTokenType,ElkGraphJsonLexer}.ts (+ tests), test/architecture/module-boundaries.fitness.test.ts | T2 | [x] |

Batch done when every task's acceptance criteria pass and the README gates are green — including the 4b vectors and
refs byte-identical after T7 (stop 5).
