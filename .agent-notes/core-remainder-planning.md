<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — core-remainder (mission 5b, 2026-10-24)

## Observation: nothing in ELK calls `comments/*`, `selection/*` or `PropertyConstantsDelegator`

- **Context**: mapping the bundles that consume the 5b classes across `$ELK_SOURCE_DIR/plugins` and `test`.
- **Finding**: `CommentAttacher`, `SelectionIterator` and `PropertyConstantsDelegator` have no references outside
  their own files, and `comments/*` has no Java tests. `AlgorithmAssembler` and `LayoutProcessorConfiguration` are
  used by 7 algorithm bundles; `ElkSpacings` by layered; `ElkGraphAdapters` by common, layered, rectpacking, spore;
  ElkMath `*l` functions by tests only (external callers use only `maxd` and `boundi`).
- **Impact**: comments evidence comes from oracle scenario vectors (R6); a bug in the assembler shows up in missions
  6 and 7 goldens.
- **Confidence**: High

## Observation: `java.awt.geom.Rectangle2D` is used only by `comments/*`

- **Context**: grepping `java.awt` in core and core.test.
- **Finding**: `AlignmentMatcher`, `DistanceMatcher`, `ElkGraphBoundsProvider`, `IBoundsProvider`,
  `NodeReferenceMatcher`, `SizeFilter` (plus `ElkRectangle`'s doc comment). Members used: the public fields,
  `outcode(x, y)`, `intersects(Rectangle2D)`, `OUT_*`.
- **Impact**: the shim surface is that small (R3).
- **Confidence**: High

## Observation: `NodeReferenceMatcher` relies on Java-only regex syntax and Unicode predicates

- **Context**: reading `NodeReferenceMatcher.java:320-385` and the JDK 21 `Pattern` Javadoc.
- **Finding**: it builds patterns from `\b`, `Pattern.quote` and `[\h\v]*`, with `DOTALL | CASE_INSENSITIVE`. JS has
  no `\h`, JS `\v` is only U+000B, and Java `CASE_INSENSITIVE` is ASCII-only without `UNICODE_CASE`. `\b` is defined
  through ASCII `\w` in JDK 21. Segmenting uses `Character.isUpperCase/isLowerCase/isWhitespace`.
  `TextPrefixFilter` uses `String.equalsIgnoreCase` (Character case mappings).
- **Impact**: narrow shims with JDK vectors (R2 plus its extension); never translate to JS `RegExp` flags directly.
- **Confidence**: High (Javadoc retrieved 2026-10-24)

## Observation: `NodeReferenceMatcher` depends on `DistanceMatcher`

- **Context**: task sequencing.
- **Finding**: `goFindMatches` calls `DistanceMatcher.distance` when a maximum distance is set.
- **Impact**: `NodeReferenceMatcher` lands after the distance matcher (T19 after T15).
- **Confidence**: High

## Observation: comment attachment iterates identity-hashed maps

- **Context**: AD-10 review of `comments/*`.
- **Finding**: `CommentAttacher.findMatch` builds `HashMap<target, HashMap<matcherClass, Double>>`;
  `AggregatedMatchDecider` picks the max with strict `>`, so ties go to the first entry in identity-hash order, and
  sum/avg aggregates add values in hash order.
- **Impact**: oracle scenarios must be tie-free and recorded twice; TS uses insertion order.
- **Confidence**: High

## Observation: the `.elkt` harness hand-applies the algorithm; Java uses `LayoutConfigurator`

- **Context**: roadmap row 5b exit.
- **Finding**: `test/helpers/elkt-layout-harness.ts` `applyAlgorithm` sets `ALGORITHM` on every node; Java's
  `TestAlgorithm` uses `new LayoutConfigurator().configure(ElkNode.class)` + `ElkUtil.applyVisitors`.
- **Impact**: T12 switches it; issue tests and goldens must stay unchanged.
- **Confidence**: High
