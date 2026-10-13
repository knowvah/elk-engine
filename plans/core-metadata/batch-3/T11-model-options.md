<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Generator model: options and categories

**Agent:** typescript-pro · **Commit:** `feat(T11): resolve melk options and categories into the registry model`

## Context
The model turns parsed `MelkFile`s (T9) into the exact sequence of registry calls the generated Java
makes, so it can be compared with `metadata.json` (i) (T7) for all 13 files before any TS is
emitted. This task covers `register(LayoutOptionData)`, `register(LayoutCategoryData)` and
`addDependency`; algorithms and `addOptionSupport` are T12. The spec is
`MetaDataJvmModelInferrer.xtend` (EPL-2.0, may be read; not ported line by line).

## Task
TDD. Implement, following the inferrer:
- **Ids** (`getQualifiedName`, `inferrer:608-622`): prefix = `bundle.idPrefix ?: model.package`;
  drop the prefix's last segment when it equals the member name; then group path, then name.
- **Constant names** (`:623-661`): groups and name `toUpperCaseWithUnderscores` joined by `_`;
  `_DEFAULT`, `_LOWER_BOUND`, `_UPPER_BOUND`, `<OPT>_DEP_<TARGET>_<index>`.
- **Registration order** (`registerLayoutOptions`, `:216-262`; `getAllOptionDefinitions`, `:485-490`):
  at each level the level's own options first (source order), then each group's definitions
  recursively by the same rule; each option is followed by its `addDependency` calls; then
  categories (`:267`); then the algorithm classes' `apply` (T12). Reproduce the dump's order.
- **Class names** (`:492-502`): bundle class = `package + '.' + (metadataClass ?: 'Metadata')`
  (`metadataClass` may be qualified, e.g. `core.options.CoreOptions`); algorithm class likewise
  with `name.toFirstUpper + 'Metadata'` as fallback.
- **Fields**: `group` = group names joined by `.`; `name` = `(label ?: name)` then `shrinkWhiteSpace`
  (`:669-689`); `description` = `shrinkWhiteSpace`; `type` per `getOptionType` (`:514-542`);
  `optionClass` per `getOptionTypeClass` (`:543-579`, boxed for primitives); `targets` (upper-case,
  `EnumSet.of` order); visibility: `programmatic|output|global` → `HIDDEN`, `advanced` → `ADVANCED`,
  else `VISIBLE`; `legacyIds` as written.
- **Expression evaluation** (`tools/melk/expr.ts`): evaluate each C5 form into the C4 value encoding,
  resolving names through the file's imports and a class index for referenced types (enum
  constants, `EnumSet`, `KVector`, `ElkPadding`, `ElkMargin`, `ExclusiveBounds`, static factories):
  - `Nf` float literals widen through `Math.fround` (`1.6f` → `1.600000023841858`); `Nd`/plain
    decimals are doubles; integer literals stay `int` unless the option type widens them (follow
    the generated Java — journal each widening rule).
  - Enum constants evaluate **symbolically** to `{t:"enum",c,n}` from the reference itself (class
    simple name via the imports, `Outer.Inner` when nested) — most alg-bundle enums are not ported
    yet. Values that need real class behaviour (`EnumSet.of/noneOf`, `ContentAlignment.topLeft()`,
    `new ElkPadding(…)`, `ExclusiveBounds.greaterThan(…)`) occur only with core classes, which are
    ported: compute them by importing the TS ports from `src/` (the generator may import `src/`,
    never the reverse). A behavioural value on an unported class is stop condition 9.
- **Cross-file references**: `requires`/`supports` targets resolve through an index of all 13 files
  (Layered references `org.eclipse.elk.aspectRatio` from Core).
- `test/melk/helpers.ts`: load `metadata.json`, parse+resolve a vendored file, compare call lists
  with a readable diff (first differing call, field path).

## Write-set
`tools/melk/model*.ts`, `tools/melk/expr.ts`, `test/melk/model-options.test.ts`, `test/melk/helpers.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend:82-262,485-697`
- `tools/melk/{ast,parser}.ts` (T9), `test/golden/refs/java/metadata.json` (T7; read via helpers,
  not into context in full), `../decisions.md#c4--jvm-metadata-golden`, `#c5--parser-scope`
- `../elk-oracle/plugins/org.eclipse.elk.core/src-gen/org/eclipse/elk/core/options/CoreOptions.java`
  (spot-check generated constants, not in full)

## Interface contract (consumed by T12, T13)
```ts
type RegistryCall =
  | { call: 'registerOption'; data: OptionData } | { call: 'registerCategory'; data: CategoryData }
  | { call: 'addDependency'; source: string; target: string; value: EncodedValue | null }
  | { call: 'registerAlgorithm'; … } | { call: 'addOptionSupport'; … };     // T12 fills these
interface ResolvedBundle { file: string; packageName: string; bundleClass: string; calls: RegistryCall[];
  options: ResolvedOption[] /* with constantName, value Expr, TS-side type info for the emitter */ }
export function resolveAll(files: MelkFile[]): ResolvedBundle[];
```
`OptionData` uses the T7 field names, so a model call deep-equals its dump entry.

## Acceptance criteria
- Given each of the 13 files, when resolved, then the `registerOption`, `registerCategory` and
  `addDependency` calls equal those in `metadata.json` (i) for the file's bundle class, in order
  (deep equality, per-file test case).
- Given `Labels.melk` (package `org.eclipse.elk.core.labels`), then option ids match the dump.
- Given a description with line breaks and runs of spaces, then `shrinkWhiteSpace` output equals the
  dump's text.
- Given `Core.melk`, then every option's encoded default, lower and upper bound equal the dump.

## Quality bar
README gates; coverage ≥ 90% on `tools/melk/**`; each file ≤ 500 lines (split `model.ts` into
`model-*.ts` if needed — journal); functions ≤ 30 NLOC, CCN ≤ 10.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No emission. Never edit `metadata.json`; a mismatch is a diagnosis (stop condition 7), not a fix.
