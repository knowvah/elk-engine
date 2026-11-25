<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8: DOT writer (sequencers, formatter, serializer)

**Owner:** subagent (`claude`, opus). **Budget:** 90 min. **Commit:** `feat(graphviz-dot): port the dot serializer and
formatter`.

## Context

D2. `GraphvizDotSerializer.serialize` = `serializeToRegions` → `FormatterRequest` (`maxLineWidth` 255,
`formatUndefinedHiddenRegionsOnly = !options.isFormatting()`) → `GraphvizDotFormatter` → `renderToAppendable`. The semantic
sequencer adds nothing to its generated parent. The syntactic sequencer overrides five ambiguity emitters, each of which
emits its keyword (`,` ×3, `;`, `subgraph`). The `.elkt` writer (`src/graph/text/serializer/`, `formatting2/`) is the
pattern.

## Write-set

`src/alg/graphviz/dot/services/GraphvizDotGrammarAccess.ts` (only the elements named by the formatter and the sequencers);
`src/alg/graphviz/dot/serializer/GraphvizDotSemanticSequencer.ts`, `GraphvizDotSyntacticSequencer.ts`,
`GraphvizDotSerializer.ts`, plus a token writer or serialization error type if the pattern needs one;
`src/alg/graphviz/dot/formatting2/GraphvizDotFormatter.ts`; colocated tests and a test helper that builds models from the
parse ref's dumps.

## Read-set

`serializer/*.java`; `src-gen/.../serializer/AbstractGraphvizDot{Semantic,Syntactic}Sequencer.java` (constraint comments, the
emit order, transitions); `src-gen/.../services/GraphvizDotGrammarAccess.java`; `formatting2/GraphvizDotFormatter.xtend` and
its `xtend-gen` Java; `src/graph/text/serializer/*` and `src/graph/text/formatting2/ElkGraphFormatter.ts` (pattern);
`src/xtext/formatting2/**` (with T6's autowrap); `graphviz-dot-write.json`, `graphviz-dot-parse.json` (input models).

## Steps

1. Replay test first: for every write row, build the input model from its parse dump (or the built-model description), then
   compare formatted and unformatted text byte for byte. Compare exceptions by class and message.
2. Semantic sequencer: one method per rule, in the generated order. Value printing goes through the same converters T7
   uses for reading (`src/xtext/conversion`), so the writer emits exactly what the JVM emits for each `DotID` alternative.
3. Syntactic sequencer: the five overrides as written, plus whatever the generated parent resolves on its own (default
   emits).
4. `GraphvizDotFormatter`: line by line, every dispatch method, in source order (D2). `xtend-gen` settles the `?.` and
   `forEach` semantics.
5. `GraphvizDotSerializer`: the composition with `MAX_LINE_LENGTH = 255` and the `format` flag.

## Acceptance criteria

- Given every row of `graphviz-dot-write.json`, when replayed, then formatted and unformatted text match byte for byte.
- Given the rows with lines over 255 characters, when replayed, then the wraps match (D3 end to end).
- Given a model that the JVM cannot serialize (a recorded exception row), when serialized, then the same error class and
  message are thrown.

**Observability:** N/A. **Rollback:** reversible (new files).
