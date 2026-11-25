<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: language (lexer and parser; writer)

Two parallel subagents. T7 reads text into the model. T8 writes the model as text. Both build on T4's model, and T8 on T6's
autowrap. The write-sets are disjoint.

| Task | Writes | Proven by |
| ---- | ------ | --------- |
| [T7](T7-lexer-parser.md) | `src/alg/graphviz/dot/parser/**`, `src/alg/graphviz/dot/conversion/**` | `graphviz-dot-lexer.json`, `graphviz-dot-parse.json` |
| [T8](T8-writer.md) | `src/alg/graphviz/dot/serializer/**`, `formatting2/**`, `services/**` | `graphviz-dot-write.json` |

**Test inputs across tasks:** T8's tests need models. They build them from the parse ref's model dumps through a test helper
in its own write-set (`src/alg/graphviz/dot/serializer/testing/fromDump.ts` or a colocated helper), not through T7's parser,
so that T7 and T8 stay independent. The round trip `serialize(load(text))` is T9's.

**`DotPackage` literals:** if T8 needs a feature literal that T4 did not add, the orchestrator adds it to
`dot/DotPackage.ts` between the tasks. The subagent asks for it and does not write it.

## Common rules (include in every subagent prompt)

The batch 2 common rules, plus:

- Read `plans/graph-text/decisions.md` (G1, G5, G6) and the matching landed code (`src/graph/text/parser/`,
  `src/graph/text/serializer/`, `src/graph/text/formatting2/`). Reuse `src/xtext`; never import `src/graph/text` (fitness:
  algorithm bundles do not import each other unless the Java does).
- `src-gen` is the edge-case spec, never ported line by line (D4).

## Batch gate

Both tasks' tests green, with every row of the three refs replayed (no skipped rows unless a stop names them);
`npx vitest run src/alg/graphviz src/xtext test/architecture` green; the `.elkt` regression check of batch 2 again.
