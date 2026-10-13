<!-- SPDX-License-Identifier: EPL-2.0 -->

# Agent notes — core-metadata (mission 3)

## Observation: lizard counts every `case`, `??` and `?.` toward CCN

- **Context**: porting `LayoutOptionData.parseValue` (T8) and writing `test/melk/recorder.ts` (T13)
- **Finding**: a faithful `parseValue` measured CCN 17 / 48 NLOC; a 7-arm `switch` plus two guarded
  returns is already CCN 12. An object literal with five `x ?? ''` / `y?.name()` fields reached CCN 12.
- **Impact**: any ported `switch` of 8+ arms needs per-arm helpers (standing rule, decisions.md);
  move null-coalescing into tiny helpers rather than inline object literals.
- **Confidence**: High

## Observation: lizard misparses regex literals such as `/\r?\n/`

- **Context**: T13 `tools/melk/emit.ts`
- **Finding**: lizard reads the regex as division and inflates NLOC of the following functions.
- **Impact**: prefer `split('\n')` (or a `RegExp` constructor) in files under the lizard gate.
- **Confidence**: Medium

## Observation: `static readonly X = Imported` re-exposing a nested-type file can hit a TDZ

- **Context**: T8 split `LayoutOptionData.Builder` into `LayoutOptionDataBuilder.ts`
- **Finding**: the builder constructs the outer class and the outer class re-exposes the builder; if a
  consumer imports the builder module first, a `static readonly Builder = LayoutOptionDataBuilder`
  initialiser runs while the builder binding is still in its TDZ (`ReferenceError`). A static getter
  is import-order safe. `CoreOptions → IndividualSpacings → LayoutMetaDataService → CoreOptions` works
  only because every cross-use is inside a method.
- **Impact**: nested types split into their own file (C3 amendment) need a static getter on the
  outer class whenever the nested file imports the outer one; test with the nested module imported first.
- **Confidence**: High

## Observation: `ElkReflect.ClassObject` rejects ported enums

- **Context**: T8 `src/java/lang/JavaClass.ts`
- **Finding**: `abstract new (...args: never[]) => unknown` does not accept classes with private
  constructors, so every ported enum fails to typecheck as a `ClassObject`.
- **Impact**: use `JavaClassRef` (`Function`-based) for option classes and `Class<?>` values.
- **Confidence**: High

## Observation: a JS number cannot be C4-encoded without its option's type

- **Context**: T13/T17 `RecordingRegistry`
- **Finding**: `15` may be an `Integer` or a `Double`; the recorder takes the type from the
  `LayoutOptionData` registered earlier. An algorithm class's `apply` alone therefore cannot be
  recorded — apply `new CoreOptions()` (or the bundle) to the same recorder first and compare only
  the calls the algorithm adds.
- **Impact**: mission 5 (real providers) and every later bundle comparison use the same pattern.
- **Confidence**: High

## Observation: `.melk` imports keep the `^` keyword escape

- **Context**: T11 import scope
- **Finding**: `import org.eclipse.elk.core.^labels.ILabelManager` keeps `^` in the parsed path;
  algorithm files resolve their own option enums without imports because the generated class shares
  the `...options` package.
- **Impact**: strip `^` when building import scopes; resolve unimported names in the generated
  class's package.
- **Confidence**: High

## Observation: `.melk` descriptions contain lines starting with `supports`

- **Context**: T9 per-file clause counts
- **Finding**: multi-line descriptions include text like "supports different routing styles", so a
  naive `grep -c supports` over-counts `supports` clauses.
- **Impact**: count clauses with `supports <name>` followed by `=` or end of line.
- **Confidence**: High

## Observation: the coverage glob `tools/melk/**` includes `sources/manifest.json`

- **Context**: T9 `vitest.config.ts`
- **Finding**: v8 coverage tries to parse the JSON manifest, logs a PARSE_ERROR and reports it at 0%.
- **Impact**: the include is `tools/melk/**/*.ts`; ad-hoc `--coverage.include` runs need the same.
- **Confidence**: High

## Observation: the oracle's `getInstance()` loads every provider unless the loader is isolated

- **Context**: T7 `MetaDataVectors.java`
- **Finding**: with all 16 oracle jars on the classpath, `ServiceLoader` registers 14 algorithms;
  `getInstance(new ClassLoader(null){})` limits it to `CoreOptions` (C8). `LayeredMetaDataProvider`
  needs `org.eclipse.xtext.xbase.lib` (`CollectionLiterals` in `<clinit>`).
- **Impact**: any JVM dump of service state must isolate the loader; TS compares against that state.
- **Confidence**: High

## Observation: the repo has no ESLint configuration

- **Context**: several agents tried `npx eslint`
- **Finding**: there is no `eslint.config.*` or `.eslintrc*`; ESLint 9 exits with a config error.
- **Impact**: not a gate; the gates are prettier, `tsc`, vitest coverage and lizard.
- **Confidence**: High
