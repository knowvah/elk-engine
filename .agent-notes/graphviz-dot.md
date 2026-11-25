<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: graphviz-dot (issue #95 step 2, 2026-11)

## Observation: `build.sh --record-only` turns every vector cache cold

- **Context**: T1 added `alg.graphviz.dot` to `BUNDLES` and ran `tools/oracle/build.sh --record-only`.
- **Finding**: `--record-only` rewrites `oracle-build.json` (a new `builtAt`, one more `jars` entry). The salt of
  `tools/vectors/vector-cache.sh` hashes that whole file and the classpath string, and the inputs digest covers every file
  under `tools/vectors/`. So every cached program of every `*-vectors.sh` (27 cache namespaces) records again on its next
  run. `elkt-vectors.sh` re-recorded its four programs cold in this mission (refs unchanged); the others were not rerun.
  The `.elkj` round-trip recorder alone costs about 2.8 CPU-hours cold (`docs/architecture/grandom.md` § 7).
- **Impact**: adopting a bundle for recorders costs a cold run of every recorder, not only a `--record-only`. Plan it, or
  change the salt first (issue #179).
- **Confidence**: High

## Observation: the layouter bundle requires Xtext too

- **Context**: T1, the `XTEXT_CLIENT_BUNDLES` fitness addition (brief D9).
- **Finding**: D9 says the layouter's manifest has no Xtext require. `plugins/org.eclipse.elk.alg.graphviz.layouter/
META-INF/MANIFEST.MF:11` reads `org.eclipse.xtext;bundle-version="2.9.0"`, and `GraphvizLayoutProvider` uses
  `XtextResourceSet`. No test was written that forbids the layouter importing `src/xtext`.
- **Impact**: #95 step 3 (issue #178) adds `src/alg/graphviz/layouter` to `XTEXT_CLIENT_BUNDLES`. A planning claim about a
  manifest is checked with `grep -n Require-Bundle -A12` on that manifest.
- **Confidence**: High

## Observation: how Xtext's autowrap measures and breaks a line

- **Context**: T6 and T8, the 133 `built/autowrap/*` and `built/width/*` rows of `graphviz-dot-write.json`.
- **Finding**: every hidden region of a string-built region access is empty, so `getLeadingCharsInLineCount` measures the
  replacements made so far. A tab counts `tabWidth` 4, except on the first line of the text, where the raw offset is
  added. When the line before the next replacer is longer than `maxLineWidth`, `FormattableDocument.createReplacements`
  rewinds to the last autowrap candidate, which becomes a newline plus the indentation in effect. A token is never
  split. `needsAutowrap` ends in `if (...) return false; return false;` in Xtext, kept.
- **Impact**: a grammar whose formatter uses `autowrap(int)`, `noAutowrap` or `setOnAutowrap` needs more of the path;
  those three are not ported. `FormattableDocument.autowrap.test.ts` replays 124 JVM rows without the DOT writer and
  localises an autowrap regression.
- **Confidence**: High

## Observation: the DOT grammar's lexer differs from `.elkt` at the same inputs

- **Context**: T2 lexer vectors, T7.
- **Finding**: `GraphvizDot.xtext` redefines `INT`, `ID`, `FLOAT`, `STRING`. `1.`, `-1.`, `10.` are one `<invalid>` token
  each (`.elkt` splits them); `^` is `ANY_OTHER` (no `^` in `ID`), so `ID.toString` has nothing to escape and rejects
  keywords; `#` starts a `PREC_LINE` anywhere; a `//` or `#` line ending at a lone CR is `<invalid>` through one
  character after the CR; `\"` closes a string only at the end of input (ANTLR's greedy loop decision). `DotID` has no
  converter: the model keeps quotes and the writer emits values raw.
- **Impact**: do not reuse `.elkt` lexer expectations for another Xtext grammar; record its lexer rows first.
- **Confidence**: High

## Observation: Xtext's `recover` records an error whatever `errorRecovery` says

- **Context**: T7, parse rows `err-syntax-compass-not-id` and `err-syntax-html-label`.
- **Finding**: Xtext's parser override of `recover` sets the pending error without checking the ANTLR `errorRecovery`
  flag, and ANTLR forces one `consume` when `lastErrorIndex == index`. A `NoViableAlt` therefore repeats on the next
  token. A pending error attaches to the next non-hidden leaf, or at the end to the last leaf, and is dropped if that
  leaf already has one. Xtext's single-token insertion conjures no token.
- **Impact**: a hand-written parser that must match recovered partial models needs these four rules;
  `src/alg/graphviz/dot/parser/GraphvizDotRecognizer.ts` has them.
- **Confidence**: High

## Observation: an empty token merges its two hidden regions

- **Context**: T8, write rows `built/value/*/empty` (a logged `ConflictingFormattingException`).
- **Finding**: `TextRegionAccessBuildingSequencer` drops an empty token, so the hidden regions on both sides become one.
  If the formatter set `oneSpace` on one side and `noSpace` on the other, that is a conflict; the default handler logs
  it and the first formatting wins.
- **Impact**: an unexpected "Conflicting values for 'space'" in a writer test points at an empty string value.
- **Confidence**: High

## Observation: transforms that read `CoreOptions` defaults need the metadata service first

- **Context**: T10 and T11 replay tests run alone.
- **Finding**: `getProperty(CoreOptions.PADDING)` clones its default through `ElkReflect`, whose clone functions are
  registered by `LayoutMetaDataService.getInstance()`. Without that call a single test fails with "Couldn't clone
  property 'org.eclipse.elk.padding'"; in the full suite another test has usually made the call.
- **Impact**: a test of code that reads object-valued option defaults calls `LayoutMetaDataService.getInstance()` in its
  setup, as the recorders do.
- **Confidence**: High

## Observation: `canonGraph` formats only registry doubles as `Double.toString`

- **Context**: T10, the source-graph dump of the export ref.
- **Finding**: `test/helpers/elkt-canon.ts` writes a double as Java's `Double.toString` only when the key is a registered
  `DOUBLE` option. A value set through a plain `Property` object (the `CoreOptions` statics a profile sets, such as
  `spacing.nodeNode`, or the layouter options of a recorder mimic) prints as JS text (`-1`, not `-1.0`).
- **Impact**: a dump helper built on `canonGraph` re-formats such ids (`test/helpers/dot-export-dump.ts` `dumpSource`).
- **Confidence**: High

## Observation: the write hook's limits reach test files, and lizard misreads some comparisons

- **Context**: T4, T5 and T8 subagents, blocked by the complexity hook on writes.
- **Finding**: the hook applies the 30-NLOC function limit to colocated `*.test.ts` and `test/helpers` files, and counts
  a whole `describe` callback as one function. Lizard also reads TS expressions such as `a < b << c` or `x < 0 ? …` as
  the start of a generic and reports one huge "function" that swallows the rest of the file.
- **Impact**: keep test tables at module level; rewrite such a comparison (`compare(...) > 0`, `=== -1`) when a
  function is reported with an absurd NLOC.
- **Confidence**: High

## Observation: subagent hand-back counts need a check against the ref

- **Context**: T8 and T2 hand-backs, read while writing `docs/conformance.md`.
- **Finding**: two hand-backs gave wrong counts (22 serializer exception rows, the ref has 28; 33 syntax-error cases, the
  ref has 31). The replays themselves covered every row; only the reported numbers were off.
- **Impact**: numbers that enter the docs or the journal are recomputed from the ref with a script, not copied from a
  hand-back.
- **Confidence**: High
