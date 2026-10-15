<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Lexer + converter vectors and the `elkj-vectors.sh` runner

**Agent:** java-architect · **Commit:** `test(T2): record elkj lexer and converter vectors from the jvm`

## Context
Mirror 4b's T2 (`tools/vectors/ElktLexerVectors.java`, `elkt-lexer-cases.txt`, `elkt-vectors.sh`) for the
`ElkGraphJson` language. The generated lexer (`src-gen/.../parser/antlr/internal/InternalElkGraphJsonLexer.java`) is
recorded, never ported (D7). Grammar facts: Xtext common Terminals (`ID` with `^`, `INT`, `STRING` with both quotes,
`ML_COMMENT`, `SL_COMMENT`, `WS`, `ANY_OTHER`) plus `SIGNED_INT`/`FLOAT` overrides (`ElkGraphJson.xtext:120-126`);
known keys are keywords in three spellings (`'"id"'`, `"'id'"`, `'id'`), so a known quoted key lexes as a keyword
and an unknown one as `STRING`.

## Task
1. `elkj-vectors.sh`: copy of `elkt-vectors.sh` running every `tools/vectors/Elkj*Vectors.java` (sorted), same
   classpath, Xtext 2.36.0 and pin checks, `ELKJ_VECTORS_LIST=1` listing; writes `graph-json-text-<x>.json`.
2. `ElkjLexerVectors.java` + `elkj-lexer-cases.txt` (format and escapes as `elkt-lexer-cases.txt`): token rows
   `{input, tokens:[{type,text,line,hidden}], lexError}` and converter rows `{converter, op, input, output|error}`.
3. Lexer families: every keyword in all three spellings and as near misses (`"idx"`, `'Id'`, `children2`), `true`/
   `false`/`null`, punctuation, `STRING` escapes in both quote styles and unterminated, `SIGNED_INT`/`FLOAT` with signs
   and exponents and their boundaries (`1.`, `1e`, `-.5`), `^`-escaped IDs, comments, WS members, CR/LF/CRLF lines,
   and recovery boundaries (the 4b T9 kinds: `10.`, `1ex`, `// x\r\r\ny`).
4. Converter rows for the rules the service registers (`ElkGraphJsonValueConverterService.xtend`): `Number`,
   `PropertyKey`, `StringValue`, `NumberValue`, `BooleanValue`, the terminals `ID`, `STRING`, `INT`, `SIGNED_INT`,
   `FLOAT`, an unknown rule (NO_OP), `toValue` (null node) and `toString` (typed inputs as 4b's `Typed`, malformed
   input rejected per AD-16b), plus a `Document` pseudo-converter: one-property documents parsed for the
   node-dependent `PropertyValue.toValue` branch (known and unknown keys, both quote styles).

## Write-set
`tools/vectors/ElkjLexerVectors.java`, `tools/vectors/elkj-lexer-cases.txt`, `tools/vectors/elkj-vectors.sh`,
`test/golden/refs/java/graph-json-text-lexer.json`.

## Read-set
`tools/vectors/{ElktLexerVectors.java,elkt-lexer-cases.txt,elkt-vectors.sh}`, `ElkGraphJson.xtext`,
`conversion/*.xtend` (upstream), `.agent-notes/graph-text.md` (lexer recovery, Java `^` precedence).

## Interface contracts (outputs)
`graph-json-text-lexer.json` = `{elkCommit, xtextVersion, registry:"core", tokens:[…], converters:[…]}`, row shapes
as `graph-text-lexer.json`. Consumed by T8 (tokens) and T9 (converters).

## Acceptance criteria
- Given `"id"`, `'id'`, `id` and `"idx"`, when lexed, then the first three are the `KeyId` keyword tokens and the last
  is `RULE_STRING`.
- Given the recorder run twice, when outputs are compared, then they are byte-identical.
- Given `elkj-vectors.sh`, when run, then the 4b runner `elkt-vectors.sh` is untouched and its refs unchanged.

## Observability / Rollback
N/A — tooling only. Reversible: revert the commit.
