<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Generator model: algorithms, option support, pending types

**Agent:** typescript-pro · **Commit:** `feat(T12): resolve melk algorithms and hold back pending types`

## Context
Completes the registry-call model (T11) with what the algorithm classes do, and implements C1: a
list of pending types whose registrations are held back until their classes are ported.

## Task
TDD. Following `MetaDataJvmModelInferrer.xtend:282-484`:
- Bundle `apply` ends with one `new <AlgorithmClass>().apply(registry)` per algorithm in source
  order (`:282-285`); model those calls inline, as the recorder sees them.
- Algorithm class: `ALGORITHM_ID` = qualified name; `registerAlgorithm` data (`:438-476`): id, name
  (`(label ?: name)` shrunk), description (shrunk), factory class `<Name>Factory`, category
  qualified name, `melkBundleName` = bundle label, `definingBundleId` = the directory before `src`
  in the file's **upstream path** (from `tools/melk/sources/manifest.json`, `:596-606`), image path,
  supported features (`GraphFeature` upper-case, `EnumSet.of` order), validator class.
- `addOptionSupport(algorithmId, optionId, value)` per `supports` in order: the support's value if
  given, else the option's own default (`<CONSTANT>.getDefault()`).
- Per-support constants for the emitter: `<OPTION>_DEFAULT` (private, when a value is given) and
  `<OPTION>` (`new Property(<Bundle>.<OPTION>, <OPTION>_DEFAULT)` or the bundle constant itself).
- **Pending types (C1).** `resolveAll(files, { pendingTypes })`: any registration (algorithm,
  dependency, option default/bound, support) whose expression or provider references a pending type
  is moved from `calls` to a `heldBack` list with its reason; an algorithm held back also drops its
  `apply` call and its `addOptionSupport` calls. Mission-3 list, exported as a constant from the
  generator config: `org.eclipse.elk.core.util.FixedLayoutProvider`,
  `org.eclipse.elk.core.util.BoxLayoutProvider` (the nested `PackingMode` is **not** pending),
  `org.eclipse.elk.core.util.RandomLayoutProvider`,
  `org.eclipse.elk.core.options.TopdownSizeApproximator`.

## Write-set
`tools/melk/model*.ts`, `tools/melk/expr.ts`, `tools/melk/config.ts` (pending-types constant),
`test/melk/model-algorithms.test.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core.meta/src/org/eclipse/elk/core/meta/jvmmodel/MetaDataJvmModelInferrer.xtend:282-484,492-606`
- `tools/melk/{model*,expr}.ts` (T11), `test/melk/helpers.ts`, `tools/melk/sources/manifest.json`
- `../decisions.md#c1--pending-types`

## Interface contract (consumed by T13, T14, T17)
```ts
export const PENDING_TYPES: readonly string[];          // tools/melk/config.ts
interface ResolvedBundle { …T11; calls: RegistryCall[]; heldBack: { call: RegistryCall; reason: string }[];
  algorithms: ResolvedAlgorithm[] /* class name, id, factory, provider type, parameter, supports with constants */ }
export function resolveAll(files: MelkFile[], opts?: { pendingTypes?: readonly string[] }): ResolvedBundle[];
```

## Acceptance criteria
- Given all 13 files resolved with `pendingTypes: []`, then every bundle's `calls` deep-equal
  `metadata.json` (i) for its bundle class, and every algorithm class's calls equal its own entry.
- Given `Core.melk` with `PENDING_TYPES`, then `heldBack` holds exactly the `fixed`, `box`, `random`
  algorithms (with their `addOptionSupport` calls) and the one `topdown.sizeCategories` dependency;
  `calls` equals (i) for `CoreOptions` minus exactly those.
- Given the other 12 files with `PENDING_TYPES`, then `heldBack` is empty (stop condition 8 if not).
- Given `Layered.melk`, then `supports org.eclipse.elk.aspectRatio = 1.6f` yields the
  `1.600000023841858` double and `definingBundleId` is `org.eclipse.elk.alg.layered`.

## Quality bar
README gates; coverage ≥ 90% on `tools/melk/**`; files ≤ 500 lines; functions ≤ 30 NLOC, CCN ≤ 10.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
No emission. Never edit `metadata.json`.
