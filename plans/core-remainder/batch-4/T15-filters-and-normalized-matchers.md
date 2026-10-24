<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Filters and normalized matchers

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T15): port comment filters and distance and alignment matchers`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`.

## Context
Mission 5b (README). This task builds on T13's abstract `IFilter`, `IMatcher` and `IBoundsProvider` and on T8's
`Rectangle2D`. There are no Java tests; the unit tests derive from the Java source, and T19's oracle scenarios
exercise these classes end to end.

## Task
1. Port `J/comments/SizeFilter.java` (`withMaximumArea`, `withBoundsProvider`, `preprocess`/`cleanup` overrides if
   any, `eligibleForAttachment` at `:99`).
2. Port `J/comments/TextPrefixFilter.java`:
   - `withCommentTextProvider(f)`, `withPrefixMatchRequiredForEligibility`, `withCaseSensitiveMatching`,
     `addPrefix`;
   - `commentPrefix.equalsIgnoreCase(prefix)` (`:154`) uses T9's `JavaString.equalsIgnoreCase`, never JS
     `toLowerCase`/`toUpperCase`. The comment text comes from `Strings.isNullOrEmpty` + `substring(0, prefix.length())`
     on UTF-16 units, as in Java.
   - `Function<C, String>` becomes `(c: C) => string`.
3. Port `J/comments/AbstractNormalizedMatcher.java`:
   - the nested enum `NormalizationFunction` (`LINEAR`, `BINARY`) goes in
     `AbstractNormalizedMatcherNormalizationFunction.ts` as a TS enum class (§6.3, P1);
   - `withBounds`, `withNormalizationFunction` (`requireNonNull` with Java's message), the getters, and
     `normalized(...)` with both function branches verbatim.
4. Port `J/comments/DistanceMatcher.java` and `J/comments/AlignmentMatcher.java`, including the public static
   `distance(...)` and `alignment(...)`:
   - the outcode constants (`TOP`, `LEFT`, …, `BOTTOM_RIGHT`) built from `Rectangle2D.OUT_*`;
   - the exact case ladder (`AlignmentMatcher.java:142-200`, `DistanceMatcher.java:138-200`);
   - `bounds2.intersects(bounds1)` vs `bounds1.intersects(bounds2)` exactly as written.
5. Write unit tests derived from the Java source: each outcode case of `distance` and `alignment` with hand-computed
   expected values, both normalization functions, and filter eligibility edges (area equal to the maximum; prefix
   case sensitivity).

## Write-set
`src/core/comments/{SizeFilter,TextPrefixFilter,AbstractNormalizedMatcher,AbstractNormalizedMatcherNormalizationFunction,DistanceMatcher,AlignmentMatcher}.ts`
and colocated tests.

## Read-set
- The five Java files.
- T13's `src/core/comments/*.ts`, T8's `src/java/awt/geom/Rectangle2D.ts`, T9's `JavaString.equalsIgnoreCase`,
  `src/guava/Strings.ts`.
- `src/core/options/Alignment.ts` (enum pattern), `src/java/lang/JavaString.ts`.
- `docs/translation-rules.md` §6.3.

## Interface contracts (outputs, consumed by T19)
- `SizeFilter<C> extends IFilter<C>`: `withMaximumArea(a)`, `withBoundsProvider(p)`.
- `TextPrefixFilter<C> extends IFilter<C>`: `withCommentTextProvider(f)`, `withPrefixMatchRequiredForEligibility()`,
  `withCaseSensitiveMatching()`, `addPrefix(p)`.
- `DistanceMatcher<C, T>` and `AlignmentMatcher<C, T>` extend `AbstractNormalizedMatcher<C, T>`:
  `withMaximumAttachmentDistance(d)` or `withMaximumAlignmentOffset(o)`, `withBoundsProvider(p)`,
  `withNormalizationFunction(f)`.
- Statics: `DistanceMatcher.distance(b1, b2)`, `AlignmentMatcher.alignment(b1, b2)`.

## Acceptance criteria
- Given two rectangles in each outcode relation (above, below, left, right, the 4 diagonals, intersecting), when
  `distance` and `alignment` run, then each result equals the value hand-computed from the Java formula.
- Given `LINEAR` and `BINARY` with raw values at, inside and beyond the bounds, when `normalized` runs, then the
  results follow `AbstractNormalizedMatcher.java`.
- Given `TextPrefixFilter` without `withCaseSensitiveMatching`, when the comment text starts with an ASCII prefix in
  another case, then eligibility follows Java's comparison.
- Given `withNormalizationFunction(null)`, when called, then a `TypeError` with Java's `requireNonNull` message is
  thrown. This follows the landed NPE precedent, `ElkGraphUtil.requireNonNull`.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
