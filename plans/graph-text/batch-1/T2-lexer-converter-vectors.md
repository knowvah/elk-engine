<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Lexer and value-converter JVM vectors, and the generic `elkt-vectors.sh` runner

**Agent:** java-architect · **Commit:** `test(T2): record elkt lexer and converter vectors from the jvm`

## Context
G6: the hand-written `ElkGraphLexer` (T9) and the converters (T7 Xtext conversion/`Strings`, T13 ELK
converters, T8 qualified-name converter) must reproduce the generated ANTLR lexer's token decisions and the
Xtext/ELK converter results. This task records both from the JVM before any TS exists (AD-13) and also
owns `tools/vectors/elkt-vectors.sh`, the single runner that T3, T4 and T5 plug their programs into.

## Task
1. **`tools/vectors/elkt-vectors.sh <outDir>`** (structure of `graph-json-vectors.sh`: pinned-commit check
   against `tools/oracle/ELK_COMMIT`, `ELK_ORACLE_DIR`, `P2_BUNDLES`). Classpath = the oracle jars of
   `$ELK_ORACLE_DIR/oracle-build.json` + the full `THIRD_PARTY` list of `tools/oracle/run.sh:25-33`
   (Gson, Guava + failureaccess, EMF, xbase lib, Xtend lib, Xtext, xtext.util, ANTLR runtime, Guice with
   inject/aopalliance/log4j, equinox common). Fail with a clear message unless the Xtext jar's
   Bundle-Version is `2.36.0` (stop 6). Then, for each file `tools/vectors/Elkt*Vectors.java` in sorted
   order (a glob that matches zero, one or all of T2–T5's programs), run it as a single-file source
   program: `java -cp "$CP" <file> <outDir> <tools/vectors dir>`. Each program writes
   `<outDir>/graph-text-<x>.json` itself (`Lexer` → `graph-text-lexer.json`, `Parse` → `-parse`, `Validate`
   → `-validate`, `Write` → `-write`). No per-program special cases in the script.
2. **`tools/vectors/ElktLexerVectors.java`** (self-contained, header documents the schema like
   `GraphJsonVectors.java:1-40`). First statement: `LayoutMetaDataService.getInstance(new ClassLoader(null) { })`
   (G3), then `new ElkGraphStandaloneSetup().createInjectorAndDoEMFRegistration()`
   (`ElkGraphStandaloneSetup.xtend:22-24`). Cases come from `tools/vectors/elkt-lexer-cases.txt`:
   `lex <escaped text>` and `conv <converter> <op> <escaped input>` rows, `#` comments; escapes `\n \r \t
   \\ \uXXXX` are **decoded by the program** (agent note: generators reading escaped text must decode it).
3. **Lexer rows.** Run the generated `InternalElkGraphLexer`
   (`../elk/plugins/org.eclipse.elk.graph.text/src-gen/org/eclipse/elk/graph/text/parser/antlr/internal/InternalElkGraphLexer.java`,
   bound by `AbstractElkGraphRuntimeModule.java:133-134`) over the text until EOF. Per token record `type`
   as the Xtext token name (`InternalElkGraphParser.tokenNames`, `InternalElkGraphParser.java:50-52`:
   `RULE_ID`, `RULE_STRING`, `RULE_SIGNED_INT`, `RULE_FLOAT`, `RULE_INT`, `RULE_ML_COMMENT`,
   `RULE_SL_COMMENT`, `RULE_WS`, `RULE_ANY_OTHER`, or the quoted keyword such as `'node'`, `'->'`), `text`,
   `line` (ANTLR `getLine()`), `hidden` (channel is HIDDEN: WS and comments). Also record `lexError: bool`
   (the lexer's `reportError` fired; message text is not recorded, G5 syntax errors are presence-only).
   Case families, one or more rows each (enumerate them in the cases file header):
   - **Keywords vs ID:** all 26 keyword literals (`graph node label port layout position size edge incoming
     outgoing start end bends section true false null`, punctuation `{ } [ ] : , -> | .`); near misses
     `nodes node1 Node _node node_ graph2 nul truee`; `^node`, `^graph`, `^` alone, `^1`, `^^a`, `a^b`.
   - **Numbers** (`ElkGraph.xtext:116-120`, `Terminals.xtext:14`): `0 007 +1 -1 + - +- -x`, `1.5 1. .5 1.e3
     1e5 1E5 1e+5 1E-5 1.5e3 1e 1e+ 1.5e 1.5.3 1..2 -1.5e-3 +.5`, `1-2 1+2 1,2 1|2`, `a1.5 e5 1e5x`,
     `1.a`, `a.1`, `00.50`, a 30-digit INT, `->-1`, `-1->2`, `- >`, `-->`.
   - **Strings** (`Terminals.xtext:15-18`): `"a"`, `""`, `'a'`, `''`, `"a'b"`, `'a"b'`, `"a\"b"`, `"a\\"`,
     `"\n"`, `"A"`, `"\x"`, `"\` (EOF after backslash), unterminated `"abc`, `"a<LF>b"` (raw newline
     inside), `'a<LF>b'`, `"a" "b"` and `"a""b"`.
   - **Comments and whitespace:** `// x<LF>`, `// x` at EOF, `// x<CRLF>`, `//` alone, `///`, `/* x */`,
     `/**/`, `/*/`, `/* x` unterminated, `/* /* */ */`, `/ x`, `/`, comment directly after a token
     (`a//b`), `/*a*/b`; WS of space/tab/CR/LF mixes, vertical tab, form feed, NBSP, BOM, other control chars,
     non-ASCII letters (`é`, `日`), a lone surrogate, emoji (surrogate pair, `RULE_ANY_OTHER` per code unit?).
   - **Lines:** `\n`, `\r\n`, lone `\r`, and a multi-line input so `line` is exercised after each.
   - **Boundaries:** empty input, whitespace-only, EOF mid-keyword, a real 15-line `.elkt` sample (copy of a
     small curated model's shape), `a.b.c`, `a . b`, `a. b`, `.a`, `a..b`.
4. **Converter rows** (`conv <converter> <op> <input>`), each recording `{converter, op, input, output}` or
   `{…, error: {cls, msg}}` (`cls` = binary class name; `msg` = `getMessage()`, with identity hashes
   `@<hash>` normalised like `CaseResult.java:25-27`). Converters, resolved through the injector's
   `IValueConverterService` (rule names `ID INT STRING SIGNED_INT FLOAT QualifiedId Number PropertyKey
   StringValue QualifiedIdValue NumberValue BooleanValue ML_COMMENT SL_COMMENT`; unknown-rule fallback
   behaviour is itself recorded) unless noted:
   - `IDValueConverter` (`toValue`/`toString`; `^`-escape rules, keywords as ids, empty, `^`, `^^a`, null),
     `STRINGValueConverter` (`toValue` of single/double quoted text with every escape, bad escapes, bad
     `\u`, unterminated; `toString` incl. quotes/control chars/non-BMP), `INTValueConverter` (`007`,
     overflow, empty, `+1`).
   - `org.eclipse.xtext.util.Strings` static methods called directly: `convertFromJavaString(s, true|false)`,
     `convertToJavaString(s, true|false)` over all escape forms, `split(s, ".")`/`split(s, '.')`
     (`Strings.java:132-153,181,231`; empty string, leading/trailing/double delimiter, no delimiter).
   - `NumberValueConverter` (`NumberValueConverter.xtend:23-40`): `toValue` of `1`, `-1`, `+1`, `1.5`,
     `1e3`, `1E+3`, `.5`, `1.`, `NaN`, `Infinity`, `0x10`, `1f`, `1d`, ` 1`, empty; `toString` of integral
     doubles, `-0.0`, `1e21`, `1.0E-5`, `NaN`, `±Infinity`, large integral (`intValue` saturation), null.
   - `PropertyKeyValueConverter` (`toValue`: known option by suffix, ambiguous suffix, unknown → `Property`
     with the verbatim string, empty, `^`-ids; `toString` of known option, unknown `IProperty`, option whose
     group must be kept, null → "IProperty value may not be null"). Record the output as `{class, id}`.
   - `PropertyValueValueConverter` (`PropertyValueValueConverter.xtend:35-89`): `toString` of null, Double
     integral/non-integral, Integer, Boolean, enum, String (`true`, `null`, `1.5`, `1e3`, `abc`, `a.b`, `a b`,
     `1abc`, `""`, `'x'`, `^x`), non-string objects, a `LayoutOptionProxy`; `toValue` with a **null node**
     (always yields `LayoutOptionProxy` or null: record `{class, text}`) and, for the node-dependent branch
     (`semanticElem instanceof ElkPropertyToValueMapEntryImpl`, line 71), through parsing a one-property
     document `graph g\n<key>: <value>` and reading the entry's value; this covers known typed options
     (double, int, boolean, enum, string, `KVector`, `EnumSet`), unknown keys and quoted/unquoted forms
     (`unquoteIfNecessary`, lines 81-89: quotes of both kinds, identifier start, `^`, leading digit).
   - `ElkGraphQualifiedNameConverter` (`ElkGraphQualifiedNameConverter.xtend:38-51`): `toQualifiedName` of
     `a`, `a.b`, `^a.b`, `a..b`, empty, null, `1a`, `a.1`; `toString` of one/many segments incl. segments needing
     `^` (keywords) and the null/empty-name errors. Record `QualifiedName` as `{segments, text}`.
5. Output `<outDir>/graph-text-lexer.json`: top level `{ elkCommit, xtextVersion, registry: "core", tokens: [
   {input, tokens:[{type,text,line,hidden}], lexError} ], converters: [{converter,op,input,output|error}] }`
   (2-space top level, one compact row per line, trailing newline). Run twice; byte-identical. Existing
   refs unchanged.

## Write-set
`tools/vectors/ElktLexerVectors.java`, `tools/vectors/elkt-lexer-cases.txt`, `tools/vectors/elkt-vectors.sh`,
`test/golden/refs/java/graph-text-lexer.json`. (`.txt` and `.java` are not Prettier-checked.)

## Read-set
- `tools/oracle/run.sh:25-33,58-70`, `tools/vectors/graph-json-vectors.sh`, `tools/vectors/GraphJsonVectors.java:1-40`, `tools/vectors/MetaDataVectors.java:126-130`
- `src-gen/…/graph/text/parser/antlr/internal/InternalElkGraphLexer.java` (whole file: the edge-case spec), `…/InternalElkGraph.tokens`, `ElkGraph.xtext:92-120`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.graph.text/src/org/eclipse/elk/graph/text/`: `conversion/ElkGraphValueConverterService.xtend:23-64`, `conversion/{PropertyKeyValueConverter,PropertyValueValueConverter,NumberValueConverter}.xtend`, `naming/ElkGraphQualifiedNameConverter.xtend`
- Xtext 2.36.0 EPL source: `common/Terminals.xtext`, `common/services/DefaultTerminalConverters.java`, `conversion/impl/{AbstractIDValueConverter,IDValueConverter,STRINGValueConverter,INTValueConverter}.java`, `org/eclipse/xtext/util/{Strings,JavaStringConverter}.java` (source jars: `org.eclipse.xtext.source_2.36.0…jar` and the `org.eclipse.xtext.util` source jar in `~/.m2/repository/.cache/tycho/https/eclipse.mirror.rafal.ca/releases/2024-09/202409111000/plugins/`)

## Decisions
- [G6](../decisions.md#g6--lexer), [G3](../decisions.md#g3--option-registry-for-refs), [G5](../decisions.md#g5--diagnostic-fidelity), [G7](../decisions.md#g7--evidence-layout)
- AD-9 (no OpenJDK source: `Double.valueOf`/`toString` behaviour is recorded, never read), AD-13

## Interface contract (consumed by T7, T9, T13, T8 tests; T3–T5 use the runner)
`graph-text-lexer.json` as in step 5. `tokens[].type` strings are exactly the Xtext names above; T9's token
type enum maps onto them. `elkt-vectors.sh <outDir>` contract: see `overview.md`.

## Acceptance criteria
- Given each case family above, then `graph-text-lexer.json` has at least one lexer row per family and one
  converter row per (converter, op) pair, errors recorded as `{cls, msg}`.
- Given the script run with only T2's program present, then it succeeds and writes only the lexer file;
  given T3–T5's programs present, then each writes its file with no change to the script.
- Given two runs, then every output is byte-identical; `git diff test/golden/refs` shows only new files.

## Quality bar
README gates; `shellcheck` clean; lizard clean on the Java (split case families into helper classes inside
the single file, or move data to the cases file, to stay ≤ 500 lines and CCN ≤ 10).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No OpenJDK/Guava/ANTLR-runtime source (stop 5): the generated lexer is read as an edge-case spec only and
**called**, never copied. No edits to existing vector scripts or refs. Agents never commit; the orchestrator
commits per task.
