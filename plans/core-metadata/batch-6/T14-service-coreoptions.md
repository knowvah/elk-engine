<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — `LayoutMetaDataService`, `IndividualSpacings`, `CoreOptions`

**Agent:** typescript-pro · **Commit:** `feat(T14): add the layout metadata service and generated coreoptions`

## Context
The mission's exit criterion: the TS registry for `CoreOptions` equals the oracle's metadata dump.
Three classes form an import cycle — `CoreOptions` types `SPACING_INDIVIDUAL` as
`IndividualSpacings`; `IndividualSpacings` reads `CoreOptions.SPACING_INDIVIDUAL` and calls
`LayoutMetaDataService.getInstance()`; the service's constructor registers `IndividualSpacings`
with `ElkReflect` and `getInstance` registers `new CoreOptions()` — so they land in one commit.
ES modules tolerate the cycle only if no member is *used* during module evaluation; keep every
cross-reference inside methods or lazily evaluated code, and verify load order by test.

## Task
TDD.
1. `src/core/util/PackingMode.ts` — `BoxLayoutProvider.PackingMode` in its own file (C3), `@see`
   the outer class; constants and order from `BoxLayoutProvider.java`.
2. `IndividualSpacings` (`extends MapPropertyHolder implements IDataObject`): copy constructor,
   both `getIndividualOrInherited` overloads (`ElkNode` | `NodeAdapter`, dispatch per §6.5),
   `toString` (`;,;`-joined `id:value` in `getAllProperties()` iteration order — the mission-2
   `PropertyMap` order), `parse` (every branch, `JavaString.split` for the two regexes, wrapped
   `IllegalArgumentException` with the Java message).
3. `LayoutMetaDataService`: private static singleton field (C8); constructor calls `initElkReflect`;
   `getInstance()`/`getInstance(loader)` register `new CoreOptions()` (ServiceLoader block dropped,
   C8); `unload`; `initElkReflect` (registrations as in the Java; Java collection classes mapped as
   the mission-2 seam in `src/graph/properties/Property.test.ts:47-90` does — `Array` for
   `ArrayList`, `Set` for the three set classes, journal it); `registerLayoutMetaDataProviders`
   (clears the suffix cache); all getters including `getOptionDataBySuffix` /
   `getAlgorithmDataBySuffix` / `getAlgorithmDataBySuffixOrDefault` / `getOptionData(algorithm,
   target)`; the inner `Registry` with `Triple`, `applyDependencies`, `retrieveBackupCategory`.
   Maps are `Maps.newLinkedHashMap()` → insertion-ordered `Map` (AD-10).
4. `npm run melk:generate` (Core + Labels; Labels must come out unchanged) to write `src/core/options/CoreOptions.ts`; held-back
   registrations per C1 (no algorithm classes, no three `apply` calls, no topdown dependency).
5. `test/melk/held-back.ts`: one helper that removes C1's held-back registrations **and their derived
   service effects** from the expected dump (decisions.md C1) — nothing else.
6. `test/melk/core-registry.test.ts`: (a) `new CoreOptions().apply(recorder)` vs (i) minus held-back;
   (b) `LayoutMetaDataService.getInstance()` + `registerLayoutMetaDataProviders(new
   LabelManagementOptions())` dumped in the T7 (ii) shape vs (ii) minus held-back and derived effects;
   (c) freshness of `CoreOptions.ts`. Reset the singleton between tests with `unload()`.

## Write-set
`src/core/util/{IndividualSpacings,PackingMode}.ts`, `src/core/data/LayoutMetaDataService.ts`,
generated `src/core/options/CoreOptions.ts`, `IndividualSpacings.test.ts`,
`LayoutMetaDataService.test.ts`, `test/melk/core-registry.test.ts`, `test/melk/held-back.ts`.

## Read-set
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/LayoutMetaDataService.java` (whole; 539 lines)
- `…/core/util/IndividualSpacings.java`, `…/core/util/BoxLayoutProvider.java` (the `PackingMode` enum only)
- `src/graph/properties/{MapPropertyHolder,PropertyMap,Property}.ts`, `src/graph/util/ElkReflect.ts`,
  `src/graph/properties/Property.test.ts:45-95`, `src/java/lang/JavaString.ts` (`split`)
- `test/melk/{recorder,helpers}.ts`, `tools/melk/generate.ts`, `../decisions.md#c1--pending-types`, `#c8`

## Interface contract (consumed by T15, T16, T17, mission 4)
```ts
class LayoutMetaDataService { static getInstance(loader?: unknown): LayoutMetaDataService; static unload(): void;
  static initElkReflect(): void; registerLayoutMetaDataProviders(...providers: ILayoutMetaDataProvider[]): void;
  getAlgorithmData(id?: string); getAlgorithmDataBySuffix(suffix); getAlgorithmDataBySuffixOrDefault(id, def);
  getOptionData(id?: string); getOptionDataBySuffix(suffix); getOptionData(algorithm, target);
  getCategoryData(id?: string) }   // overloads per §6.5
class CoreOptions implements ILayoutMetaDataProvider { static readonly ALGORITHM: IProperty<string>; … apply(registry) }
```

## Acceptance criteria
- Given `new CoreOptions().apply(recorder)`, then the calls deep-equal `metadata.json` (i) for
  `CoreOptions` minus exactly the held-back calls (3 algorithms with their supports, 1 dependency).
- Given the service with Core + Labels, then its dump deep-equals (ii) minus the held-back
  registrations and their derived effects (the `""`/`Other` backup category).
- Given `generate({ bundles: ['Core'], write: false })`, then the text equals the committed
  `CoreOptions.ts` byte for byte.
- Given `getOptionDataBySuffix("spacing.nodeNode")` and a legacy id, then the Java results; given an
  ambiguous suffix, the Java's `null`/first-match behaviour.
- Given `new IndividualSpacings()` parsed from `"org.eclipse.elk.spacing.nodeNode:5.0"`, then
  `toString()` round-trips; an unknown id throws `IllegalArgumentException` with the Java message.
- Given a fresh import of `CoreOptions.ts` alone (dynamic import in a test), then module evaluation
  succeeds (no cycle use at load time).

## Quality bar
README gates; 100% coverage of the hand-ported files; `LayoutMetaDataService.ts` ≤ 500 lines (Javadoc
summaries only; stop condition 10 otherwise); functions ≤ 30 NLOC, CCN ≤ 10.

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not edit `Property.test.ts` (AD-13; its seam stays, see T18). No `LayoutAlgorithmResolver`, no
`TopdownSizeApproximator` (C1). Never edit `metadata.json`; `held-back.ts` removes only what C1 names.
