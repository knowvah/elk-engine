<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: graphviz-dot (#95 step 2)

## Observation: the DOT formatter needs Xtext autowrap, which `src/xtext` left out

- **Context**: Sizing the DOT writer against the landed `src/xtext/formatting2` subset.
- **Finding**: `GraphvizDotFormatter.xtend:38-43` sets `autowrap` on every hidden region, and `GraphvizDotSerializer` sets
  `maxLineWidth` to 255. The graph-text mission ported `formatting2` without autowrap, because `ElkGraphFormatter` never uses
  it. Eight files say so in their headers (`IHiddenRegionFormatter.ts`, `IHiddenRegionFormatting.ts`,
  `ITextReplacerContext.ts`, `internal/{TextReplacerContext,FormattableDocument,WhitespaceReplacer,HiddenRegionFormatting,
TextSegmentSet}.ts`).
- **Impact**: Any new Xtext grammar port checks its formatter for `autowrap`, `maxLineWidth` or other members those headers
  list as not ported before it assumes the subset is enough.
- **Confidence**: High

## Observation: `oracle-build.json` records only the jars `build.sh` lists, not every jar the reactor built

- **Context**: Checking that the oracle can run DOT recorders.
- **Finding**: `tools/oracle/build.sh:22-24` `BUNDLES` drives the `jars` map. The Tycho reactor builds every plugin, so
  `plugins/org.eclipse.elk.alg.graphviz.dot/target/*.jar` exists without being recorded. `build.sh --record-only` rewrites the
  record from the built jars without Maven.
- **Impact**: Adopting a bundle for recorders means adding it to `BUNDLES` and running `--record-only`. A full rebuild is
  not needed if the jar is from the same build.
- **Confidence**: High

## Observation: issue selection with a cross-repo "Blocked by"

- **Context**: Resolving `next` for the queue.
- **Finding**: #95's "Blocked by" names knowvah/dot-engine#220, which is open, and the issue body itself scopes that block to
  step 5 and the end-to-end suite. Planning took #95 and planned only the unblocked step 2.
- **Impact**: When #95's remainder is filed as a new issue (T13), its "Blocked by" lines should name only real blockers
  (#177 for step 3; dot-engine#220 for step 5), so the selection rule reads them literally.
- **Confidence**: Medium (selection rule interpretation; recorded in `plans/graphviz-dot/decisions.md` § Auto-confirmed)

## Observation: `@knowvah/dot-engine` renders synchronously

- **Context**: Framing #177 (runner injection).
- **Finding**: `~/git/knowvah/dot-engine/src/index.ts:93` exports `renderSvg(dotSource: string, engine: EngineName): string`,
  a synchronous call, so a synchronous runner fits ELK's synchronous `IElkLayoutProvider.layout`.
- **Impact**: Step 3 needs no async bridge inside the layout provider, if dot-engine#220's DOT output keeps that shape.
- **Confidence**: Medium (read at planning; #220 may change the API)
