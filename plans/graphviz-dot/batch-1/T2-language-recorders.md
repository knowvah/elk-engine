<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: DOT language recorders (JDK, lexer, parse, write) and their refs

**Owner:** subagent (`claude`, opus). **Budget:** 90 min. **Commit:** `test(graphviz-dot): record jvm vectors of the dot
language`.

## Context

The DOT language is `GraphvizDot.xtext` (119 lines, `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.graphviz.dot/src/.../`). The
JVM side uses `new GraphvizDotStandaloneSetup().createInjectorAndDoEMFRegistration()`, an `XtextResourceSet` from the
injector, `resource.load` for parsing, and `ISerializer.serialize` for writing (`GraphvizLayoutProvider.java:86-91, 204-222,
257-290`). The `.elkt` recorders are the pattern (`ElktLexerVectors.java`, `ElktParseVectors.java`, `ElktWriteVectors.java`).

## Write-set

- `tools/vectors/dot-vectors.sh` (copy the shape of `elkt-vectors.sh`; the cache namespace is `dot`; it honours
  `DOT_VECTORS_LIST=1` and `ELK_VECTORS_CACHE=off`; it refuses to run unless `oracle-build.json` names `ELK_COMMIT` and has the
  graphviz.dot jar).
- `tools/vectors/DotJdkVectors.java`, `DotLexerVectors.java`, `DotParseVectors.java`, `DotWriteVectors.java`.
- `tools/vectors/dot-lexer-cases.txt`, `tools/vectors/dot-parse-scenarios/*.dot`,
  `tools/vectors/dot-graphviz-output/` (fixtures plus a `README.md` with `dot -V` and the exact commands).
- `test/golden/refs/java/graphviz-dot-{jdk,lexer,parse,write}.json`, written by the script.

## Read-set

The grammar; `src-gen/.../parser/antlr/internal/InternalGraphvizDotLexer.java` (token decisions);
`src-gen/.../serializer/AbstractGraphvizDot{Semantic,Syntactic}Sequencer.java`; `serializer/*.java`; `formatting2/
GraphvizDotFormatter.xtend`; `transform/DotExporter.java:640-680, 730-745, 925-982` and `DotImporter.java:200-265, 685-699`
(the `StringTokenizer`, parse and print sites, D10); `tools/vectors/elkt-vectors.sh`, `ElktLexerVectors.java`,
`ElktParseVectors.java`, `ElktWriteVectors.java`; `tools/vectors/LastUlpVectors.java` (header without `elkCommit()`, D7);
existing JDK refs (`test/golden/refs/java/{lang,numeric}.json`), to avoid recording shapes already proven.

## Steps

1. `dot-vectors.sh` and `DotJdkVectors` first: `StringTokenizer` over each delimiter set the transforms use (D10) and edge
   inputs (empty, only delimiters, leading and trailing delimiters, `hasMoreTokens`/`nextToken`/`countTokens` as used, and
   `NoSuchElementException`). Add the numeric parse and print shapes that `{lang,numeric}.json` lack. Commit this first so
   T3 can start.
2. `DotLexerVectors`: drive the generated lexer (`InternalGraphvizDotLexer` through the injector's `Lexer` provider) over each
   line of `dot-lexer-cases.txt`. Record the token type name and text, hidden ones included. Cover each D4 boundary: keywords
   in every case variant, `-1`, `-.5`, `1.`, `.5`, `1.5.2`, `-` alone, `->`/`--`, strings with `\"` and with newlines, an
   unterminated string, `#` lines in mid-file, `//` and `/* */` comments, `<html>` (not a token in this grammar), and
   non-ASCII letters.
3. `DotParseVectors`: for every scenario and fixture, record a model dump (every feature of every object in containment order;
   distinguish unset from null; enum literals by name) and the diagnostics (syntax: presence and line; conversion: message
   and line). Scenarios: each grammar rule and option (`strict`, both graph types, unnamed graph, every statement kind with
   and without `;`, attribute lists with and without commas, empty lists, ports with and without compass points, subgraphs
   with and without the keyword and name, edge chains to nodes and to subgraphs), every `DotID` alternative, and syntax
   errors at several lines.
4. Fixtures (`dot-graphviz-output/`): write the DOT that `DotExporter` would produce for a few small graphs (or take it from a
   first run of T3's export recorder if T3 is ahead), then run the local `dot -q -y -K<alg>` for `dot`, `neato`, `fdp`,
   `twopi` and `circo` and commit the outputs. They are inputs only (D6).
5. `DotWriteVectors`: for each parsed scenario, record `serialize` formatted and unformatted (D2). Add built models (via
   `DotFactory`) whose statements put more than 255 characters on a line, with and without spaces to break at, so autowrap is
   recorded (D3). Record serialization exceptions by class and message.
6. Run the script twice; `cmp` the refs; commit.

## Acceptance criteria

- Given `dot-vectors.sh test/golden/refs/java`, when run twice, then the four refs are byte-identical and none has an `oracle`
  field.
- Given the lexer cases, when recorded, then every D4 boundary listed in step 2 has at least one row.
- Given the write vectors, when recorded, then at least three rows have an unformatted or formatted line over 255 characters,
  and the formatted text shows a wrap.
- Given `dot-vectors.sh` with `oracle-build.json` naming another commit, when run, then it exits non-zero before any program
  runs.

**Observability:** N/A. **Rollback:** reversible (new files only).
