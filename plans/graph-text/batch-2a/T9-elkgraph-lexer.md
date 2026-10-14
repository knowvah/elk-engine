<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — `ElkGraphLexer`: hand-written tokenizer reproducing the generated ANTLR lexer

**Agent:** typescript-pro · **Commit:** `feat(T9): add elkgraph lexer matching the generated antlr lexer`

## Context
The parser (T15) is hand-written recursive descent (D8); it needs a token stream with ANTLR's exact token
decisions (G6), including hidden tokens (whitespace/comments, which carry line information and, for
`PropertyKey hidden()`, adjacency). T13 also uses the lexer as the `TokenSource` of `IDValueConverter`
(`AbstractLexerBasedConverter.assertTokens`, T7). The generated lexer is read as an edge-case
**specification only**, never ported line by line (D8, stop 5).

## Task
1. `src/graph/text/parser/ElkGraphTokenType.ts`: one `as const` object of string constants named exactly as
   the ANTLR vocabulary (`../elk/plugins/org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/parser/antlr/internal/InternalElkGraph.tokens`):
   terminals `RULE_ID`, `RULE_STRING`, `RULE_SIGNED_INT`, `RULE_FLOAT`, `RULE_ML_COMMENT`,
   `RULE_SL_COMMENT`, `RULE_WS`, `RULE_ANY_OTHER` (`RULE_INT` is a lexer *fragment*: never emitted; the
   vocabulary entry exists only because the grammar declares the `INT` terminal) and the 26 keyword
   tokens as their literal text with single quotes (`'graph'`, `'->'`, `'{'`, ...), which is how the
   `.tokens` file and Xtext's token-def map spell them. If the T2 JSON spells token types differently,
   follow T2 (it is the recorded truth) and map once here. Export
   `ELK_GRAPH_KEYWORDS: ReadonlySet<string>` = the 26 keyword texts (T13 passes the identifier-like subset
   to the ID converter exactly as `GrammarUtil.getAllKeywords` yields it: all parser-rule keywords,
   punctuation included, harmless for IDs) and `HIDDEN_TOKEN_TYPES` = `RULE_WS`, `RULE_ML_COMMENT`,
   `RULE_SL_COMMENT` (hidden set of `common/Terminals.xtext:9`).
2. `src/graph/text/parser/ElkGraphLexer.ts`: `tokenize(text: string): ElkGraphToken[]` with
   ```ts
   export interface ElkGraphToken { readonly type: string; readonly text: string;
     readonly offset: number; readonly line: number; readonly hidden: boolean }
   ```
   `offset` is the UTF-16 index of the first code unit, `line` the 1-based line of the token's first
   character, `hidden` true for the three hidden types. The token list covers the whole input with no gaps
   (concatenating `text` reproduces the input) and never contains an EOF token. Rules to reproduce (spec:
   `InternalElkGraphLexer.java`: `mTokens` 1279 and DFA17 predictions 1528+, `mRULE_SIGNED_INT` 617,
   `mRULE_FLOAT` 663, `mRULE_ID` 786, `mRULE_INT` 865, `mRULE_STRING` 910, `mRULE_ML_COMMENT` 1053,
   `mRULE_SL_COMMENT` 1113, `mRULE_WS` 1203, `mRULE_ANY_OTHER` 1260; grammar side
   `InternalElkGraph.g:2146-2162` and `ElkGraph.xtext:116-120`; `common/Terminals.xtext:13-24`):
   - ANTLR picks the **longest** match among the alternatives of `mTokens`; ties are resolved by rule
     order (keywords `T__13..T__38` first, then `SIGNED_INT`, `FLOAT`, `ID`, `STRING`, `ML_COMMENT`,
     `SL_COMMENT`, `WS`, `ANY_OTHER`). A keyword wins over `RULE_ID` only for an exact equal-length match
     (`node` keyword, `nodes`/`node1`/`^node` are `RULE_ID`); keyword literals are case-sensitive.
   - `RULE_SIGNED_INT = ('+'|'-')? ('0'..'9')+`; `RULE_FLOAT = ('+'|'-')? (INT '.' INT | INT ('.' INT)?
     ('e'|'E') ('+'|'-')? INT)`: `1.5`, `1e5`, `1.5E-3`, `+2`, `-0.5` are single tokens; `1.` is `1`
     then keyword `'.'`; `1.5.2` is `1.5`, `'.'`, `2`; `1e` is `1` then `RULE_ID` `e`; a sign not followed by
     a digit is `->` (keyword) or `RULE_ANY_OTHER`; `a-1` is `a` then `-1` (no context in the lexer).
   - `RULE_ID = '^'? [A-Za-z_][A-Za-z_0-9]*` — ASCII only; a lone `^` or `^1` is ANY_OTHER then
     SIGNED_INT.
   - `RULE_STRING`: `"` or `'` quoted, backslash consumes the next char, **newlines are allowed**,
     unterminated quotes: whatever the DFA decides at EOF/mismatch — take it from the T2 row, not from
     guesses (likely `RULE_ANY_OTHER` for the opening quote). `RULE_ML_COMMENT` non-greedy to the first
     `*/`; unterminated `/*`: from T2. `RULE_SL_COMMENT` includes one trailing `\r?\n`.
   - `RULE_WS = (' '|'\t'|'\r'|'\n')+` (no `\f`, no U+00A0: those are `RULE_ANY_OTHER`).
   - `RULE_ANY_OTHER` consumes **one UTF-16 code unit** (ANTLR 3 char stream), so a surrogate pair is two
     tokens. Line counting increments **only on `\n`** (ANTLR 3 `ANTLRStringStream.consume`); a lone `\r`
     does not start a line — confirm with the T2 CRLF/lone-CR rows.
   `tokenizeWithDiagnostics(text): { tokens: ElkGraphToken[]; lexError: boolean }` is the same scan plus the
   ANTLR `reportError` presence flag recorded by T2 as `lexError` (G5: presence only; T15 turns it into a
   syntax error). `tokenize` returns its `tokens`.
3. Implementation: single pass, `charCodeAt` switch, no regex per token, no string slicing until the token
   ends. Budget: tokenize the 253 KB `realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt`
   in **< 200 ms** median of 5 runs (test reads it from `$ELK_MODELS_DIR`, default
   `../../eclipse-elk/elk-models`, and is skipped with an explicit reason when absent, like
   `module-boundaries` regeneration; a synthetic 250 KB input keeps CI coverage).
4. Tests: replay **every** row of `test/golden/refs/java/graph-text-lexer.json` `tokens[]`
   (`{input, tokens[{type, text, line, hidden}], lexError}`) comparing type, text, line, hidden and `lexError`, plus offset/hidden derived from
   the concatenation property; add the hand-derived cases above only where T2 has no row (name each in the
   test and journal any boundary T2 lacks — it needs a T2 follow-up row, not a guess).

## Write-set
`src/graph/text/parser/ElkGraphLexer.ts`, `src/graph/text/parser/ElkGraphTokenType.ts`
(colocated `*.test.ts` implicit).

## Read-set
- `test/golden/refs/java/graph-text-lexer.json` (`tokens`)
- `../elk/plugins/org.eclipse.elk.graph.text/src-gen/.../parser/antlr/internal/InternalElkGraphLexer.java:1279-1527` and the `mRULE_*` methods at the lines above (spec only)
- `../elk/plugins/org.eclipse.elk.graph.text/src-gen/.../parser/antlr/internal/{InternalElkGraph.g:2146-2162,InternalElkGraph.tokens}`
- `../elk/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/ElkGraph.xtext:92-120`
- Xtext `org/eclipse/xtext/common/Terminals.xtext:9-24` (`org.eclipse.xtext.source` jar, unpacked as in T7)

## Decisions
- [G6](../decisions.md#g6--lexer) · D8 (`plans/conformance-corpus/decisions.md`) · [G7](../decisions.md#g7--evidence-layout)

## Interface contract
Produced for T15 (token stream, hidden flags, `offset` for `PropertyKey`'s adjacency check) and T13
(`(text) => ElkGraphToken[]` is structurally a T7 `TokenSource`; `ELK_GRAPH_KEYWORDS` feeds
`IDValueConverter`). Consumes T2's recording only.

## Acceptance criteria
- Given every T2 token row, when replayed, then type, text and line match for each token and the
  concatenation of token texts equals the input.
- Given `a-1`, `1.`, `1e`, `^`, `'x`, a surrogate pair and a CRLF input, then the tokens equal the T2 rows
  for those inputs (or, where a row is missing, the task is blocked on a T2 addition, journaled).
- Given the 253 KB model, when tokenized five times, then the median is under 200 ms.

## Quality bar
README gates; TDD (write the replay harness first); `npm run complexity` clean — split the scanner per
token class (`scanNumber`, `scanString`, `scanComment`), not per character; no regex backtracking.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No ANTLR runtime or generated-lexer code in `src/` (stop 5). Do not read OpenJDK for `Character` classes
(ASCII-only rules need none). Do not edit `graph-text-lexer.json`. The agent does not commit; the
orchestrator commits per task.
