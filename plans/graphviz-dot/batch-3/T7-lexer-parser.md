<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7: DOT lexer, parser and value conversion

**Owner:** subagent (`claude`, opus). **Budget:** 90 min. **Commit:** `feat(graphviz-dot): port the dot lexer and parser`.

## Context

D4. The grammar is `GraphvizDot.xtext`: rules `GraphvizModel`, `Graph`, `Statement`, `Attribute`, `NodeStatement`, `Node`,
`EdgeStatement`, `EdgeTarget`, `AttributeStatement`, `Subgraph`, `ListAttribute`, `Port` and `DotID`; the enums
`EdgeOperator`, `GraphType` and `AttributeType`; terminals `INT`, `ID`, `FLOAT`, `STRING` and `PREC_LINE` over
`org.eclipse.xtext.common.Terminals` (`WS`, `ML_COMMENT`, `SL_COMMENT`, `ANY_OTHER`); hidden `WS`, `ML_COMMENT`, `SL_COMMENT`,
`PREC_LINE`. The `.elkt` lexer and parser (`src/graph/text/parser/`) are the pattern.

## Write-set

`src/alg/graphviz/dot/parser/GraphvizDotTokenType.ts`, `GraphvizDotLexer.ts`, `GraphvizDotParser.ts` (split along rule
methods if the 500-line hook requires), `src/alg/graphviz/dot/conversion/*` (only if the vectors show a converter that
`src/xtext/conversion` does not have), and colocated tests (`*.test.ts`, a replay test per ref).

## Read-set

The grammar; `src-gen/.../parser/antlr/internal/InternalGraphvizDotLexer.java` and `InternalGraphvizDotParser.java` (edge
cases, keyword decisions, error recovery); `src-gen/.../GraphvizDotStandaloneSetupGenerated.java` and
`AbstractGraphvizDotRuntimeModule.java` (which value converter service is bound); `src/xtext/conversion/**`,
`src/xtext/parser/**`, `src/xtext/nodemodel/**`; `src/graph/text/parser/*`; `graphviz-dot-lexer.json` and
`graphviz-dot-parse.json`.

## Steps

1. Replay tests first: one per ref. Lexer rows compare token type and text. Parse rows compare the model dump and the
   diagnostics (syntax: presence and line; conversion: exact message and line, D4).
2. Lexer: reproduce the generated lexer's decisions (longest match, keyword vs `ID`, `INT` vs `FLOAT`, the `STRING` escape
   rule `'\\' '"' | !'"'`, `PREC_LINE` to end of line, `ANY_OTHER`).
3. Parser: recursive descent, one method per rule. Keep the optional `;` and `,`. `Statement` dispatch must match ANTLR's
   decisions for `ID =` (`Attribute`) against `ID [` / `ID ->` / `ID` alone and `graph`/`node`/`edge [`. Error recovery only to
   the extent the vectors' presence and line need it (D4).
4. Value conversion: apply what the bound `IValueConverterService` does for `DotID`, `ID` and the enum rules, as the vectors
   show. Journal each converter's origin (`Terminals`, the default datatype-rule conversion).

## Acceptance criteria

- Given every row of `graphviz-dot-lexer.json`, when replayed, then each token type and text matches.
- Given every row of `graphviz-dot-parse.json`, when replayed, then each model dump matches exactly, and for each syntax error
  row an error is reported at the recorded line.
- Given each `dot-graphviz-output/` fixture (five algorithms), when parsed, then the model equals the recorded dump.

**Observability:** N/A. **Rollback:** reversible (new files).
