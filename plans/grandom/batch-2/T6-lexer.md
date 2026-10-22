<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — `.elkr` lexer and token types; fitness admission

**Agent:** typescript-pro · **Commit:** `feat(T6): add the grandom lexer reproducing the antlr tokens`

## Context
D2. Precedents: `src/graph/text/parser/{ElkGraphTokenType,ElkGraphLexer}.ts` and
`src/graph/json/text/parser/{ElkGraphJsonTokenType,ElkGraphJsonLexer}.ts` with their lexer-row replays. Tokens
implement `src/xtext/parser/Token.ts` structurally. `src/core/debug/grandom` is not yet in `XTEXT_CLIENT_BUNDLES`
(`test/architecture/module-boundaries.fitness.test.ts:42`).

## Task
1. `GRandomTokenType.ts`: token type names as `InternalGRandomParser.tokenNames` prints them (the T1 `type` values),
   the keyword set (multi-word keywords included), the hidden set (WS, ML_COMMENT, SL_COMMENT).
2. `GRandomLexer.ts`: `tokenize(text)` and `tokenizeWithDiagnostics(text)` with 4b's recovery semantics; keyword
   matching is longest-match over the keyword table, so `cross-hierarchy relative edges` beats
   `cross-hierarchy edges` and `trees` vs `treesx` follows ANTLR (keyword only on an exact-length match).
3. Add `'src/core/debug/grandom'` to `XTEXT_CLIENT_BUNDLES` and update the comment.
4. Tests: replay every `grandom-lexer.json` row (type, text, line, offset, length, hidden, lexError), a row-count
   assertion, offsets tile the input.

## Write-set
`src/core/debug/grandom/parser/{GRandomTokenType,GRandomLexer}.ts` (+ tests),
`test/architecture/module-boundaries.fitness.test.ts`.

## Read-set
`src/graph/json/text/parser/{ElkGraphJsonLexer,ElkGraphJsonTokenType}.ts` and test, `src/xtext/parser/Token.ts`,
`GRandom.xtext`, `src-gen/.../InternalGRandomLexer.java` (edge cases), `.agent-notes/graph-text.md` (lexer recovery).

## Interface contracts (outputs)
`tokenize`, `tokenizeWithDiagnostics`, the token-type table; consumed by T8.

## Acceptance criteria
- Given every recorded row, when tokenized, then every field matches and offsets tile the input.
- Given `cross-hierarchy relative edges = 2`, when tokenized, then the first token is the single multi-word keyword.
- Given `1.5`, when tokenized, then `RULE_INT`, `'.'`, `RULE_INT`.
- Given the fitness tests, when run, then `src/core/debug/grandom` may import `src/xtext` and still only the
  bundles `bundle-deps.json` allows otherwise.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
