<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6: Xtext `formatting2` autowrap

**Owner:** subagent (`claude`, opus). **Budget:** 90 min. **Commit:** `feat(xtext): port the autowrap path of formatting2`.

## Context

D3. `GraphvizDotFormatter.format(GraphvizModel)` sets `autowrap` on every hidden region (`GraphvizDotFormatter.xtend:38-43`),
and `GraphvizDotSerializer` sets `maxLineWidth` to 255. The landed `src/xtext/formatting2` omits autowrap on purpose,
because `ElkGraphFormatter` never uses it, and each affected file says so in its header. This task ports that path from Xtext
2.36 (EPL source jar: README § Reference), only as far as `autowrap()` with no arguments reaches.

## Write-set

Under `src/xtext/formatting2/`: `IHiddenRegionFormatter.ts`, `IHiddenRegionFormatting.ts`, `ITextReplacerContext.ts`,
`internal/AbstractHiddenRegionFormatter.ts`, `internal/HiddenRegionFormatting.ts`, `internal/HiddenRegionFormattingMerger.ts`,
`internal/TextReplacerContext.ts`, `internal/FormattableDocument.ts`, `internal/WhitespaceReplacer.ts`,
`internal/TextSegmentSet.ts` (only if the Xtext path needs the omitted members), `regionaccess/**` (only the line-length
queries the path calls), `FormatterPreferenceKeys.ts` (only its comment), the colocated tests, and new files the path needs
(for example `IAutowrapFormatter.ts` if the call is unconditional).

## Read-set

Xtext 2.36 sources: `org/eclipse/xtext/formatting2/{IHiddenRegionFormatter,IHiddenRegionFormatting,ITextReplacerContext,
FormatterRequest}.java`, `internal/{AbstractHiddenRegionFormatter,HiddenRegionFormatting,HiddenRegionFormattingMerger,
TextReplacerContext,FormattableDocument,WhitespaceReplacer,HiddenRegionReplacer}.java`; the landed TS files above and their
tests; `$ELK_ORACLE_DIR/plugins/org.eclipse.elk.alg.graphviz.dot/xtend-gen/.../GraphvizDotFormatter.java` (the exact calls).

## Steps

1. List, in the journal hand-back, each Xtext method on the path from `set(region, [autowrap])` through
   `FormattableDocument.renderToTextReplacements` to the `WhitespaceReplacer` autowrap arm, and mark each as ported, already
   present, or not reached.
2. Tests first: unit tests on a string-built region access (the pattern of `FormattableDocument.test.ts`). Expected values come
   from reading the Xtext source: a line under the width is not wrapped; a line over it wraps at the last autowrap region that
   fits, with the indentation in effect; a conflict merge of an autowrap formatting with `oneSpace`/`noSpace` follows
   `HiddenRegionFormattingMerger`; priorities hold. The JVM write vectors (`graphviz-dot-write.json`, rows over 255
   characters) give the final proof in T8.
3. Port the path. Update each file's "not ported" comment so it names only what is still left out.
4. Regression: `tools/vectors/elkt-vectors.sh test/golden/refs/java && tools/oracle/regen-elkt-refs.sh && git diff
   --exit-code test/golden/refs/`, plus `npx vitest run src/graph/text src/graph/json/text src/core/debug/grandom src/xtext`.
   Any change is stop 4.

## Acceptance criteria

- Given an `ElkGraphFormatter` run on every landed `.elkt` write vector, when the autowrap port is in, then the output is
  byte-identical to the landed refs.
- Given a region access whose single line is 300 characters with autowrap on every hidden region and `maxLineWidth` 255, when
  formatted, then the line breaks at the last hidden region before column 255, as `TextReplacerContext` and
  `WhitespaceReplacer` define.
- Given a line of 200 characters, when formatted the same way, then no replacement inserts a newline.

**Observability:** N/A. **Rollback:** reversible. The change is confined to `src/xtext/formatting2`, and the `.elkt` refs guard
it.
