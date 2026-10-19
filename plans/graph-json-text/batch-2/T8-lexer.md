<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — `.elkj` lexer and token types; fitness admission

**Agent:** typescript-pro · **Commit:** `feat(T8): add the elkj lexer reproducing the antlr token decisions`

## Context
4b precedent: `src/graph/text/parser/{ElkGraphTokenType,ElkGraphLexer}.ts` and their replay of
`graph-text-lexer.json`. D7: reproduce the generated `InternalElkGraphJsonLexer` token decisions (the generated file
is the edge-case spec, never ported line by line). The key difference from `.elkt`: 14 keys in three spellings give 42
keyword tokens, 28 of them quoted (`'"children"'`, `"'children'"`); a quoted keyword beats `STRING` for exactly its
text (ANTLR prefers the keyword on an equal-length match). `true`/`false`/`null` are keywords too.

## Task
1. `ElkGraphJsonTokenType.ts`: the token type names as `InternalElkGraphJsonParser.tokenNames` prints them (the T2
   row `type` values), the keyword set, and the hidden set (WS, ML_COMMENT, SL_COMMENT).
2. `ElkGraphJsonLexer.ts`: `tokenize(text)` and `tokenizeWithDiagnostics(text)` returning tokens
   `{type, text, line, offset, hidden}` that implement T7's `Token` (structural typing; no import from
   `src/graph/text`), with 4b's recovery semantics (`.agent-notes/graph-text.md` "Xtext lexer recovery boundaries").
3. Add `'src/graph/json/text'` to `XTEXT_CLIENT_BUNDLES` in `test/architecture/module-boundaries.fitness.test.ts` and
   update its comment ("Only the graph.text bundle requires Xtext").
4. Tests: replay every `graph-json-text-lexer.json` token row (type, text, line, hidden, offsets, lexError), a row-count
   assertion, and a performance test (the largest converted model lexes < 200 ms when `$ELK_MODELS_DIR` is present).

## Write-set
`src/graph/json/text/parser/{ElkGraphJsonTokenType,ElkGraphJsonLexer}.ts` (+ tests),
`test/architecture/module-boundaries.fitness.test.ts`.

## Read-set
`src/graph/text/parser/{ElkGraphLexer,ElkGraphTokenType}.ts`, `src/graph/text/parser/ElkGraphLexer.test.ts`,
`ElkGraphJson.xtext:110-170`, `src-gen/.../InternalElkGraphJsonLexer.java` (edge cases), T2's contract.

## Interface contracts (outputs)
`tokenize`, `tokenizeWithDiagnostics` and the token type table; consumed by T9 (token source for the ID re-lex
check), T11, T15.

## Acceptance criteria
- Given every recorded token row, when tokenized, then type, text, line, hidden and lexError match and offsets tile
  the input.
- Given `"id"` and `"idx"`, when tokenized, then the first is the quoted-keyword type and the second `RULE_STRING`.
- Given the fitness tests, when run, then `src/graph/json/text` may import `src/xtext` and still not `src/graph/text`.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
