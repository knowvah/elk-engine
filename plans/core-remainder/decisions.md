<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — core-remainder (locked 2026-10-24)

The user approved all of these during planning, as recommended. They amend, and never rewrite:
- AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`);
- C1–C10 and the standing rules (`plans/core-metadata/decisions.md`);
- the J-decisions (`plans/elk-json-adapter/decisions.md`), G1–G8 (`plans/graph-text/decisions.md`) and D1–D9
  (`plans/grandom/decisions.md`);
- M1–M17 (`plans/core-engine/decisions.md`).

| ID | Decision |
|----|----------|
| R1 | Port the uncalled code now: `comments/*`, `util/selection/*` and `PropertyConstantsDelegator`. The `core` bundle is then complete |
| R2 | Narrow `src/java/util/regex/Pattern.ts` and `src/java/lang/JavaCharacter.ts`, from the Javadoc only, proven by JDK vectors |
| R3 | `src/java/awt/geom/Rectangle2D.ts` with only the surface `comments/*` uses; Javadoc only, JVM vectors |
| R4 | Every `ElkMath` `*l` function takes and returns `bigint` through `src/java/lang/Int64.ts`, wrapping as Java does |
| R5 | Comments interfaces with `default` methods become abstract classes with the Java names, carrying the defaults |
| R6 | `comments/*`: unit tests from the Java source, plus about 10 tie-free `CommentAttacher` oracle scenarios compared as sets |
| R7 | New recorders `CoreJdkVectors.java` (pure JDK) and `CommentVectors.java` (oracle classpath) write new files only |
| P1–P9 | Pre-made rules applied from standing decisions and precedents ([below](#pre-made)) |

## R1 — Scope

The roadmap row lists them. Nothing in ELK calls them, and `comments/*` has no Java tests, so their evidence comes from
R6. `core.util.persistence` stays out of scope (AD-11).

## R2 — Java text semantics for `NodeReferenceMatcher`

`J/comments/NodeReferenceMatcher.java:320-385` builds its patterns from:
- `Pattern.quote`
- `\b`
- the class `[\h\v]*`
- the flags `DOTALL` and `CASE_INSENSITIVE`
- `Character.isUpperCase`, `isLowerCase`, `isWhitespace`
- `String.trim()` (the landed `src/java/lang/JavaString.ts` `trim`)

From the JDK 21 `Pattern` Javadoc:
- `\h` is `[ \t\xA0 ᠎ -   　]` and `\v` is `[\n\x0B\f\r\x85  ]`.
  JS has no `\h`, and JS `\v` matches only the vertical tab.
- `\b` is defined through `\w`, which is `[a-zA-Z_0-9]` unless `UNICODE_CHARACTER_CLASS` is set.
- `CASE_INSENSITIVE` matches US-ASCII only, unless `UNICODE_CASE` is also set.

**`Pattern` shim**, translating to a JS `RegExp`:
- It supports exactly the constructs above: quoted literals, the `\b` anchor, the `[\h\v]` class with `*`, `DOTALL` and
  `CASE_INSENSITIVE`.
- ASCII letters become `[aA]` classes, and the JS `i` flag is never used.
- `\b` is emitted as an explicit ASCII-word lookaround, not JS `\b`. With the `u` and `i` flags, JS `\b` would treat
  `ſ` and `K` (the Kelvin sign) as word characters.
- Any other construct throws `UnsupportedOperationException`.
- API: `quote`, `compile(regex, flags)`, `matcher(text).find()`.

**`JavaCharacter`:**
- `isUpperCase`, `isLowerCase` and `isWhitespace` on one UTF-16 code unit, using the JDK's tables as recorded.
- The code-unit ranges come from `character.json`, not from JS `\p{…}`. V8's ICU may be a newer Unicode version than
  JDK 21's Unicode 15.0.

**Extension found while writing the brief (2026-10-24, flagged to the user):** `TextPrefixFilter.java:154` calls
`String.equalsIgnoreCase`. Its Javadoc defines it through `Character.toUpperCase` and `Character.toLowerCase`, so:
- `JavaCharacter` also provides those two mappings, from JDK tables;
- `src/java/lang/JavaString.ts` gains `equalsIgnoreCase`;
- `character.json` records the mappings plus `equalsIgnoreCase` rows.

**Vectors** (`regex.json`, `character.json`, written by T2):
- `character.json`: all 65,536 units, stored as ranges.
- `regex.json`: patterns built exactly as `fuzzyRegexpFor` and `strictRegexpFor` build them. They cover non-ASCII case
  pairs, every `\h`/`\v` member, `_` and digits at `\b`, and quoted metacharacters.

## R3 — `Rectangle2D`

Only `comments/*` uses it: `AlignmentMatcher`, `DistanceMatcher`, `ElkGraphBoundsProvider`, `IBoundsProvider`,
`NodeReferenceMatcher` and `SizeFilter`.

**Surface:**
- an abstract `Rectangle2D` with `OUT_LEFT`, `OUT_TOP`, `OUT_RIGHT`, `OUT_BOTTOM`, `outcode(x, y)`,
  `intersects(Rectangle2D)` (plus the `intersects(x, y, w, h)` it delegates to) and `isEmpty()`;
- a nested `Rectangle2D.Double` with public `x`, `y`, `width`, `height` and a 4-argument constructor.

**Source:** the Javadoc only (AD-9).

**Vectors** (`awt.json`): cover empty, negative-size and NaN rectangles, edge and corner contact, and points on every
side.

## R4 — `long` in `ElkMath`

`factl(20) = 2432902008176640000`, which is above 2^53 (`ElkMathTest.java:132`). These functions return `bigint`
through `Int64`:
- `factl`
- `binomiall`; its `factl(n) / (factl(k) * factl(n - k))` and the recursive sum wrap as Java `long` does
- `maxl`, `minl`, `averagel`, `boundl`

Each site's doc comment names the translation rule ("bigint beyond 2^53"). Outside tests, nothing calls the `*l`
functions.

## R5 — Default methods

The five interfaces with defaults:

| Interface | Default methods |
|-----------|-----------------|
| `IDataProvider` | `provideTargetsFor`, `cached` |
| `IBoundsProvider` | `preprocess`, `cleanup`, `cached` |
| `IMatcher` | `preprocess`, `cleanup` |
| `IFilter` | `preprocess`, `cleanup` |
| `IExplicitAttachmentProvider` | `preprocess`, `cleanup` |

Each becomes an `abstract class` with the Java name. The abstract methods stay abstract and the default bodies are
inherited. No class in scope implements two of them, and translation-rules §6.2 allows an abstract base. The cost is
that a lambda cannot implement one, and no ELK code passes a lambda. `IDecider` has no defaults and stays an
interface.

## R6 — Comment evidence

T14 records about 10 scenarios. Each lays out nothing: it runs `CommentAttacher` with `ElkGraphDataProvider`,
`ElkGraphBoundsProvider`, the default filters and matchers and `AggregatedMatchDecider` over a small ElkGraph.

- **Content:** together the scenarios exercise every matcher and filter, explicit attachments and hierarchy.
- **Ties:** `CommentAttacher.java:379-382` and `AggregatedMatchDecider.java:119` iterate identity-hashed maps
  (AD-10), so the scenarios must have no ties.
- **Comparison:** attachments are compared as a sorted set of `[commentId, targetId]` pairs.
- **Stability:** the recorder runs each scenario twice and fails on any difference (stop 8).

## R7 — Vector tooling

- **`tools/vectors/CoreJdkVectors.java`** (T2): pure JDK, no classpath. Run it as
  `java tools/vectors/CoreJdkVectors.java test/golden/refs/java`. It writes `awt.json`, `regex.json` and
  `character.json`.
- **`tools/vectors/CommentVectors.java`** plus **`tools/vectors/comment-vectors.sh`** (T14): oracle classpath and
  `vector-cache.sh`, following the `elkr-vectors.sh` pattern. It writes `comments.json`.
- `JavaVectors.java`, `vector-cache.sh` and every landed vector file stay byte-identical.

## Pre-made

| ID | Rule | Source |
|----|------|--------|
| P1 | `ElkMath` becomes a facade (`ElkMath.ts`, namespace object plus named exports, `boundi` unchanged) over `ElkMath{Combinatorics,Aggregates,Bezier,Geometry}.ts`. Nested classes go in prefixed files (`ElkGraphAdapters*`, `BezierCurve`, the `ElkSpacings` builders, `NormalizationFunction`) | M10, M15 |
| P2 | `ElkSpacings.factorMap` → `JavaHashMap` with the `IProperty` strategy (V2). `LayoutConfigurator` maps → `Map` (I28, I29). `PropertyConstantsDelegator` iterates `knownOptions` (`JavaHashMap`, V3). Identity-hashed sites (comments caches and maps, `LayoutProcessorConfiguration` sets, `AlgorithmAssembler.cache`, `DefaultSelectionIterator.visited`) → `Map`/`Set` in insertion order, each journaled; T21 adds the I-rows | AD-10 |
| P3 | `EnumBasedFactoryComparator`: its elkjs-exclude block (`:40-47`) is dropped; it compares with the TS enum classes' `compareTo` (ordinal) | M2 |
| P4 | `SpacingConfigurationTest`: `PlainJavaInitialization.initializePlainJavaLayout()` → `LayoutMetaDataService.unload(); LayoutMetaDataService.getInstance();` | J6 |
| P5 | Exit: `test/helpers/elkt-layout-harness.ts` builds `new LayoutConfigurator()`, `configure(ElkNode).setProperty(CoreOptions.ALGORITHM, id)`, `ElkUtil.applyVisitors(root, configurator)` (`TestAlgorithm.java:44-49, :134-138`). No assertion changes | roadmap row 5b |
| P6 | `AbstractTreeIterator` (and `TreeIterator` if needed) is ported from EMF's source into `src/emf/common/util/` | translation-rules §emf |
| P7 | `DefaultFactory` takes a constructor (`new () => T`) where Java takes a `Class`. `AlgorithmAssembler.create(phaseEnum)` takes the enum class side `{ values(): readonly P[] }` | AlgorithmFactory precedent (5a T1) |
| P8 | Java test helpers `TestPhases` and `TestProcessors` → `test/helpers/`. JUnit ports keep the Java name, `<Name>Test.test.ts`, in the Java test's package directory | 5a precedent |
| P9 | Per-task commits during execution; regrouped into at most 5 commits before hand-off | user rule (few commits) |

## Baseline

Recorded at planning (Phase 8, 2026-10-24) on `main` at `1f83f33`:

- `npm test`: 66.3 s wall time (vitest reports 65.7 s); 363 files, 18,868 passed and 68 skipped; exit 0.
- Load average at measurement: 19.9 at the start, 23.1 at the end (1-minute), from other sessions.
- Also clean at baseline: typecheck; complexity (543 files, 4,480 functions); prettier on the brief files.
- Stop 12 compares a later run at similar load: about 76 s or more at load 20 trips it.
