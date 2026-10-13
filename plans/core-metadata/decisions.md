<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — core-metadata (locked 2026-10-13)

All approved by the user during planning. They amend, never rewrite,
`plans/elk-engine-skeleton/decisions.md` (AD-1…AD-15), `plans/java-foundations/decisions.md`
(M1–M8), `plans/elkgraph-model/decisions.md` (D1–D10) and `plans/conformance-corpus/decisions.md`.

| ID | Decision |
|----|----------|
| C1 | Pending types: registrations referencing an unported class are held back until mission 5 |
| C2 | `ElkUtil.ts` grows method by method; mission 3 ports `printElementPath` only |
| C3 | Nested types live in the outer class's file; own file only when the outer class is deferred |
| C4 | `MetaDataVectors.java` → `metadata.json`: per-provider calls + service state, written first |
| C5 | Parser covers only the expression forms the pinned `.melk` files use; hard error otherwise |
| C6 | Generated files carry a header, are written only by the script, skip lizard, freshness-tested |
| C7 | Coverage includes `tools/melk/**`; generated `src/` files stay in coverage |
| C8 | Service singleton registers `CoreOptions` only; ServiceLoader dropped; debug folder `string \| null` |
| C9 | The 13 `.melk` files are vendored in `tools/melk/sources/` with a sha manifest |
| C10 | Two `LayoutDataContentAssistTest` cases are deferred to mission 5, unchanged |

## C1 — Pending types

`CoreOptions.apply` ends with `new Fixed/Box/RandomLayouterOptions().apply(registry)`; each
algorithm class's factory constructs a mission-5 provider. `TopdownSizeApproximator` sets
`ALGORITHM = FixedLayouterOptions.ALGORITHM_ID` in one branch and needs `ElkUtil` and the resolver.
The generator therefore takes a **pending-types** list — mission 3: `FixedLayoutProvider`,
`BoxLayoutProvider` (but not its nested `PackingMode`), `RandomLayoutProvider`,
`TopdownSizeApproximator` — and skips every registration whose expression references one. In Core
that is exactly 3 algorithms (their algorithm classes are not emitted, and the three `apply` calls
are omitted) and 1 dependency (`topdown.sizeCategories` requires
`sizeApproximator == TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES`, `Core.melk:920`). The
registry check is exact for everything else; the held-back registrations are still checked at the
model level (T12) and by emitting them in a test with mocked providers (T17). The service dump
(C4 (ii)) also carries the **derived effects** of the held-back algorithms: none of the three has a
category, so the JVM's `Registry.applyDependencies` creates the backup category `""`/`"Other"` and
lists them as its layouters (`LayoutMetaDataService.java:481-535`). The TS check removes the
held-back algorithms, their known options, their category-layouter entries and that backup category
(it exists only because of them), plus the held-back dependency — one documented helper, no other
edits. Mission 5 empties the list and regenerates. Journaled in `docs/conformance.md` as a temporary gap.

Out of scope for this reason (mission 5): `TopdownSizeApproximator`, `TopdownSizeApproximatorUtil`,
`LayoutAlgorithmResolver`, `NullElkProgressMonitor`, `UnsupportedConfigurationException`,
`ElkUtil.computeChildAreaDimensions`. `ITopdownSizeApproximator` stays (the option's type).

## C2 — `ElkUtil` grows by method

`src/core/util/ElkUtil.ts` starts with `printElementPath` only (needed by `GraphIssue.toString`).
It is a static-helper class, so adding methods later is purely additive.

## C3 — Nested types

A Java nested type lives in its outer class's file as a `static readonly` member when the outer
class is ported in the same mission (precedent: `ElkGraphPackage.Literals`; here `LoggedGraph.Type`,
`LayoutOptionData.Target`/`Visibility`, `LayoutDataContentAssist.Proposal`). When the outer class is
deferred, the nested type gets its own file named after the nested class (`src/core/util/PackingMode.ts`,
`@see` the outer class) and the outer class adds `static readonly PackingMode = PackingMode` when
ported. The generator maps `BoxLayoutProvider.PackingMode` to that file; the same rule later covers
`StressMajorization.Dimension`.

## C4 — JVM metadata golden

`tools/vectors/MetaDataVectors.java` + `metadata-vectors.sh` (template: `graph-vectors.sh`) write
`test/golden/refs/java/metadata.json`, before any generator code exists:

- **(i) providers** — for each of the 27 generated classes of the 13 in-scope `.melk` files, every
  call its `apply(registry)` makes on a recording `ILayoutMetaDataProvider.Registry`, in order.
- **(ii) service** — `LayoutMetaDataService` state after `getInstance()` (registers `CoreOptions`)
  plus `LabelManagementOptions`: options, categories and algorithms in service order, with
  resolved dependencies.

Value encoding (every value, recursively):

| Java value | JSON |
|------------|------|
| `null` | `null` |
| `Boolean` / `Integer` / `String` | `{"t":"bool"|"int"|"string","v":…}` |
| `Double` / `Float` (boxed) | `{"t":"double","v":"<Double.toString text>"}` |
| enum constant | `{"t":"enum","c":"<simple name, Outer.Inner if nested>","n":"<name>"}` |
| `EnumSet` | `{"t":"set","c":"<element class>","items":["<name>",…]}` (iteration order) |
| `KVectorChain`, other lists | `{"t":"list","c":"<class>","items":[…]}` |
| other object | `{"t":"obj","c":"<class>","fields":{"<field>":…}}` (declared fields, Java order) |
| `Class<?>` | `{"t":"class","c":"<simple name>"}` |

A value with no row here is a stop condition. TS compares `double` text with
`src/java/lang/DoubleToString.ts`.

**Amendment (2026-10-13, user, T7 stop 6):** an unset bound — `getLowerBound()`/`getUpperBound()`
returning the `Property.NEGATIVE_INFINITY`/`POSITIVE_INFINITY` sentinel — encodes as `null`. Lossless:
the getters never return `null`, and lower vs. upper is known from the field name.

## C5 — Parser scope

The `.melk` parser implements all `MetaData.xtext` rules (`MdModel` … `Path`, lines 19–111) and,
for Xbase expressions, only the forms the 13 pinned files use (literals, `Nf`/`Nd` suffixes,
`null`, enum constants including nested, `new ElkPadding/ElkMargin/KVector/KVectorChain(…)`,
`ExclusiveBounds.greaterThan(…)`, `EnumSet.of/noneOf(…)`, `Integer.MAX_VALUE`, static factory calls
such as `ContentAlignment.topLeft()`, `#[…]` list literals, unary minus — T9 enumerates the exact
set). Anything else is a hard error naming file, line and form; mission 13 extends the table.

## C6 — Generated files and the complexity limits

Generated TS starts with a `GENERATED by tools/melk` header naming the source `.melk` file. It is
written only by `npm run melk:generate`, never by Write/Edit (so the complexity hook never sees it).
The brief's lizard gate skips files carrying the header; a freshness test (generator output ==
committed file) fails on any hand edit. `tools/melk/**` itself obeys every limit. No entry is added
to `~/.claude/hooks/complexity-ignore`.

## C7 — Coverage scope

`vitest.config.ts` coverage `include` gains `tools/melk/**` (T9). Generated `src/` files stay in
coverage: the registry tests execute all of their code.

## C8 — Service registration, debug folder

`LayoutMetaDataService.getInstance()` follows the Java's non-excluded path: create the instance,
register `new CoreOptions()`. The `elkjs-exclude` block (ServiceLoader, `Class.forName`) is
dropped; callers register other providers via `registerLayoutMetaDataProviders` (the test registers
`LabelManagementOptions` the way the core services file would). The singleton is a private static
field on the class (no module-level `let`); `getInstance(loader)` keeps its signature, the loader
unused. `IElkProgressMonitor.getDebugFolder()` returns `string | null` for `java.nio.file.Path`.

## C9 — Vendored `.melk` sources

CI has no `../elk`. The 13 in-scope `.melk` files (3,647 lines, EPL-2.0) are copied to
`tools/melk/sources/<Name>.melk`; `tools/melk/sources/manifest.json` records each upstream path
(relative to `$ELK_SOURCE_DIR`) and git blob sha at the pinned commit; `tools/melk/sync-sources.sh`
refreshes the copies from `$ELK_SOURCE_DIR`; `test/melk/sources.test.ts` checks every copy against
its manifest sha. Excluded: `Libavoid.melk`, `Graphviz.melk`, `Gmf.melk`.

## C10 — Deferred JUnit cases

`LayoutDataContentAssistTest.Other.testAlgorithmSpecificKnown` and `…Unknown` set the algorithm to
`Box/FixedLayouterOptions.ALGORITHM_ID` and need those algorithms registered (held back by C1). They
are ported unchanged in mission 5; the deferral is journaled and listed in `docs/conformance.md`.
