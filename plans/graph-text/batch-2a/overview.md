<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2a — TS foundations: boundary rules, Xtext converters and naming, lexer

Four independent TypeScript tasks with disjoint write-sets; they start from the batch-1 evidence
(`graph-text-lexer.json`, `elkt-*` vector fixtures). T6 opens `src/xtext` to the boundary fitness test
before any Xtext port lands; T7 and T8 are the first `src/xtext` ports (rule for the file layout is fixed
once, in T7); T9 is the hand-written lexer (G6). Depends on batch 1. Runs concurrently with batch 2b.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T6 | Boundary rules for `src/xtext` and `src/graph/text`, prettier ignores | typescript-pro | test/architecture/module-boundaries.fitness.test.ts, .prettierignore | T1–T5 | [ ] |
| T7 | Xtext `Strings`, value-converter core, ID/INT/STRING converters | typescript-pro | src/xtext/util/{Strings,JavaStringConverter}.ts, src/xtext/conversion/**, src/xtext/common/services/DefaultTerminalConverters.ts, src/xtext/parser/antlr/TokenTool.ts, src/xtext/nodemodel/{INode,ICrossReferenceNode,INodeModel}.ts, src/xtext/AbstractRule.ts (+ .test.ts) | T2 | [ ] |
| T8 | Xtext `QualifiedName`, qualified-name provider core, resource scope cache | typescript-pro | src/xtext/naming/**, src/xtext/util/{IResourceScopeCache,ResourceScopeCache}.ts (+ .test.ts) | T2, T3 | [ ] |
| T9 | `ElkGraphLexer`: tokenizer reproducing the generated ANTLR lexer | typescript-pro | src/graph/text/parser/ElkGraphLexer.ts, src/graph/text/parser/ElkGraphTokenType.ts (+ .test.ts) | T2 | [ ] |

T6's rules are self-contained (they only add allowed edges), so T6 may land before or after T7/T8; a
`src/xtext` file landing before T6 fails the fitness test as an unmapped directory, hence the commit
order T6 first.

Batch done when every task's acceptance criteria pass and the README gates are green.
