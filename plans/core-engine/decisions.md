<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions — core-engine (locked 2026-10-23)

All approved by the user during planning, as recommended. They amend, never rewrite, AD-1…AD-16
(`plans/elk-engine-skeleton/decisions.md`), C1–C10 and the standing rules (`plans/core-metadata/decisions.md`),
the J-decisions (`plans/elk-json-adapter/decisions.md`), G1–G8 (`plans/graph-text/decisions.md`) and D0–D10
(`plans/conformance-corpus/decisions.md`).

| ID | Decision |
|----|----------|
| M1 | Roadmap row 5 splits: 5a `core-engine` (this brief) and 5b `core-remainder` (recorded in the roadmap by T20) |
| M2 | `elkjs-exclude` blocks are dropped (C8 precedent); logs stay in memory; `getDebugFolder()` is `null` |
| M3 | `BasicProgressMonitor` timing uses `performance.now()`; tests mock it; no clock API is added |
| M4 | Curated fixed/box/random goldens (~3 each) in a separate set `test/golden/algorithms.json` (user, 2026-10-23); inputs vendored to `test/golden/inputs/` so CI runs them |
| M5 | One task compares TS with the oracle sweep for 898 retarget cases × 3 algorithms, locally; counts in `docs/conformance.md` |
| M6 | Cross-bundle tests: `testEmptyAlgorithmId` → 7a unchanged; issues 457/489 ported with a vitest harness; spacing/alg/spline tests → 5b |
| M7 | Registry growth: replay vectors first; regenerate only by script when traced to registry state; else AD-13 STOP |
| M8 | `Property.test.ts`: the `ElkReflect.register` mirrors become `LayoutMetaDataService.getInstance()` (user-approved) |
| M9 | Tripwire tests built to fail at mission 5 are flipped by the task that registers each algorithm (user-approved) |

## M1 — Split

5a ports what fixed/box/random layout needs, end to end: `RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`,
`GraphValidator` + `GraphValidationException`, `TopdownSizeApproximator{,Util}`, `ITopdownLayoutProvider`,
`TestController` + `IWhiteBoxTestable` + `alg/ILayoutProcessor` (`TestController` imports it), `BasicProgressMonitor`,
`NullElkProgressMonitor`, `AlgorithmFactory`, `Unsupported{Configuration,Graph}Exception`, the rest of `ElkUtil`, the
three providers, all mission-5 cleanups and the goldens. 5b (`core-remainder`, ≈7.5k Java lines, ~13 tasks): `alg/*`
(rest), `comments/*`, `math/{BezierSpline,CubicSplineInterpolator,ISplineInterpolator,ElkRectangle}`, the rest of
`ElkMath`, `util/adapters/ElkGraphAdapters`, `util/selection/*`, `ElkSpacings`, `LayoutConfigurator`,
`PropertyConstantsDelegator`, `AbstractRandomListAccessor`, `DefaultFactory`, `Triple`, `Quadruple`,
`WrappedException`, a `java.awt.geom.Rectangle2D` shim with JVM vectors, and the tests that go with them
(`LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`, `LayoutProcessorConfigurationTest`,
`BezierSplineTest`, `CubicSplineInterpolatorTest`, the rest of `ElkMathTest`). Both land before mission 6.
`core.util.persistence` stays out of scope (AD-11).

## M2 — `elkjs-exclude`

Markers in scope: `BasicProgressMonitor.java` (22), `ElkUtil.java` (4: `debugFolderPath` body at :1230-1252,
`toSafePathName` at :1264-1274), `NullElkProgressMonitor.java` (2). Port the code outside the markers; inside them,
drop the code and leave a one-line comment naming the Java lines (C8 precedent). `debugFolderPath` keeps its
signature and returns `null` (the Java's post-block `return null`). `toSafePathName` is not ported. Path-typed
returns are `string | null`.

## M3 — Timing

Java: `System.nanoTime()` with a GWT fallback `currentTimeMillis() * 1000`. TS: `performance.now()` (milliseconds,
global in browsers and Node 22). Keep Java's units: convert to the same unit Java stores, so `getExecutionTime()`
returns seconds exactly as Java computes them. Tests use `vi.spyOn(performance, 'now')`.

## M4 — Goldens

- **Separate set (user, 2026-10-23).** `test/corpus/manifest.json` stays as is: `corpus.test.ts:96` freezes it at
  3–5 goldens and the docs-site showcase is built from it. The new goldens go into `test/golden/algorithms.json`
  (same `GoldenEntry` shape, `{ "golden": [...] }`, models commit taken from `test/corpus/manifest.json`), refs into
  `test/golden/refs/elk-algorithms/` with their own `_meta.json`; `tools/oracle/regen-goldens.sh` gains a
  `--set algorithms` switch (default unchanged, byte-identical behaviour for the existing set). Adding them to the
  showcase is later docs work.
- Entries with `retarget` for `org.eclipse.elk.fixed`,
  `org.eclipse.elk.box`, `org.eclipse.elk.random`; ~3 each; fixed and box get ≥1 hierarchical model each; random
  uses flat models only (retarget seeds only the root; nested composites would be unseeded) with a new variant
  `random-seed-1` = `{"org.eclipse.elk.randomSeed": 1}` in `test/corpus/variants.json`.
- Prefer small models (≤ 30 nodes) whose oracle sweep status is `ok` for that algorithm; fixed must avoid edges
  with > 1 section unless the oracle also throws (latent ELK bug, `FixedLayoutProvider.java:174-177`).
- Inputs are copied into `test/golden/inputs/` (same relative path under it) with a sha check against the pinned
  corpus; refs only via `tools/oracle/regen-goldens.sh`, journaled with the patch ids in `_meta.json`.
- The TS side applies the same overlays through `applyOverlay` (port of `GraphOverlay.java`, test helper).

## M5 — Local corpus comparison

`tools/corpus/ts-layout-compare.ts` (tsx, dev tool) reads the oracle outputs of a local sweep restricted to
`fixed`, `box`, `random` (rerun `tools/oracle/sweep.sh` for those algorithms if absent), lays out the same inputs
with the same overlays in TS and compares with `compareLayout`. Outputs counts per algorithm (ok, mismatch, both
throw, TS-only throw, oracle-only throw, nondeterministic-oracle excluded) and TS vs oracle wall time. Nothing from
the sweep is committed (AD-5); the counts go into `docs/conformance.md`. Mismatches with a named mechanism go to the
known-divergences list; unnamed ones are stop 5.

## M6 — Cross-bundle tests

- `RecursiveGraphLayoutEngineTest.testEmptyAlgorithmId` asserts the default resolves to layered: deferred to mission
  7a unchanged, documented in the test file header like C10. The other three cases are ported verbatim.
- `Issue457Test`, `Issue489Test` (`LayoutTestRunner` from the alg.test bundle): ported as plain vitest. A test
  helper loads each vendored `.elkt` (`tickets/core/457_boxLayouterIgnoresMinimumSize.elkt`,
  `489_paddingAndMinSize_{Small,Large}.elkt`, copied to `test/golden/inputs/tickets/core/`) through the ported
  `.elkt` loader, applies the test's `@Configurator` body, sets the `@Algorithm`, runs the engine, then runs the
  verbatim assertions.

## M7 — Registry growth and vectors

Java's `CoreOptions.apply` ends with the three `*LayouterOptions.apply` calls, so the JVM recorders' core-only
registry already has fixed/box/random. Expected: every landed vector replays unchanged once registered. If a row
differs, dump both sides; regenerate by the documented script only when the cause is registry state that the vector
recorded and TS now matches, and journal it; otherwise stop 4. The 11 `@deferred mission5` rows in
`graph-text-validate.json` replay by deleting the test's filter — the vector file is not touched.

## M8 — Property test seam

Replace `Property.test.ts:49-90` (the seven mirrored `ElkReflect.register` calls) with
`LayoutMetaDataService.getInstance()` in `beforeAll`, as Java's `@BeforeClass`. No assertion changes.

## M9 — Tripwires

These tests were written to fail once mission 5 registers the algorithms; the task that un-holds a type edits them
for that type only, keeping every other assertion: `test/melk/model-algorithms.test.ts` (`PENDING_TYPES` list; the
C1 mechanism tests switch to a test-local copy of the original four types so their assertions stay as they are),
`test/melk/held-back.ts` + `test/melk/stub-provider.ts` (+ the emit tests that use them),
`src/graph/json/JsonMetaDataConverter.test.ts` (`MISSION5_PROVIDERS` rows), `test/helpers/mission5-stand-ins.ts`
and its two users (`MISSION5_ALGORITHMS`). Each edit is journaled with the task id.

## Baseline

Pre-flight 2026-10-23 on `main` at `58f1147`, load average ~6.5:

- `npm run typecheck` 0; `npm run complexity` 0 (514 files, 4,209 functions); `npm run format:check` clean apart
  from the planning scratch file removed at hand-off.
- `npm run coverage` 0 in **112 s** wall: 332 test files, 18,411 passed + 68 skipped; 99.33 / 97.41 / 99.31 / 99.35
  (statements / branches / functions / lines). Stop 12 compares against 112 s at similar load.
- Oracle worktree `$ELK_ORACLE_DIR` built (`oracle-build.json` present; base `8aaa3c14` + patches); elk-models at the
  pinned `ac5af2ba`; the three `tickets/core` issue models present; JDK 21.0.1; a local sweep dir exists for the
  pinned ELK/models pair.
- Branch `feature/core-engine` does not exist locally or on `origin`. No irreversible change in this mission.

## Amendments during execution

| ID | Decision |
|----|----------|
| M10 | `ElkUtil` is split into section modules (user, 2026-10-23, T3 stop 10) |
| M11 | `math/ElkRectangle` is pulled from 5b into 5a with the two `PortAdapter` overloads of `ElkUtil` (user, 2026-10-23, T3 stop 3) |
| M12 | Generated algorithm `*Options` classes expose option constants as cached static getters (user, 2026-10-23, T8 stop 1) |
| M13 | Stub-registry tests in `src/core/data/{LayoutMetaDataService,LayoutDataContentAssist}.test.ts` become registry-independent (user, 2026-10-23, T8 AD-13 stop) |
| M14 | M13 extends to `src/core/data/LayoutAlgorithmResolver.test.ts`: stub ids must not share a suffix with a core algorithm (user, 2026-10-23, T12 AD-13 stop) |
| M15 | `BoxLayoutProvider` splits into the provider, `BoxLayoutProviderGroup.ts` and `BoxLayoutProviderGrouping.ts` (user, 2026-10-23, T12 stop 10) |
| M16 | Generated `*_DEP_*` constants become cached private static getters in every option file (user, 2026-10-23, T14) |
| M17 | The engine's topdown section moves to `RecursiveGraphLayoutEngineTopdown.ts`; tests split likewise (user, 2026-10-23, T16 stop 10) |

### M10 — `ElkUtil` section modules

Java `:84-706` alone ported to 885 lines (cap 500). Following the C3-amendment precedent (`LayoutOptionData*`):
`src/core/util/ElkUtil.ts` keeps the header, `DEFAULT_MIN_WIDTH/HEIGHT`, `printElementPath` and the `ElkUtil`
object composed from the section files; every section file carries `@see ElkUtil.java` and keeps Java order. Callers
import only `ElkUtil.ts`. T3: `ElkUtilPorts.ts` (`calcPortSide`, `calcPortOffset`), `ElkUtilSizing.ts` (both
`resizeNode`, `effectiveMinSizeConstraintFor`, `applyConfiguredNodeScaling`, `computeChildAreaDimensions`),
`ElkUtilJunctions.ts` (both `determineJunctionPoints`, private `getPoints` `:869` — its only callers),
`ElkUtilLabels.ts` (`getLabelsBounds`, both `computeInsidePart`). T6: `ElkUtilCoordinates.ts` (four `translate`,
`absolutePosition`, `toAbsolute`, `toRelative`, `createVectorChain`, `applyVectorChain`), `ElkUtilDefaults.ts`
(`configureDefaultsRecursively`, three `configureWithDefaultValues`, `ensureLabel`), `ElkUtilVisitors.ts`
(`applyVisitors`, `applyVisitorsWithValidation`, `debugFolderPath`, `createIdentifier`). Tests colocate per module.

### M11 — `ElkRectangle` in 5a

`ElkRectangle.java` (232 lines) needs no `Rectangle2D` shim (that is the `comments` package, still 5b); `equals`/
`hashCode` use the existing `JavaObjects`/`JavaDouble` shims, `Objects.hash` per its Javadoc (`Arrays.hashCode`).
T3 ports it to `src/core/math/ElkRectangle.ts` with the `ElkMathTest` rectangle-only cases that need no `ElkMath`
5b code, plus `getLabelsBounds(PortAdapter)` and `computeInsidePart(PortAdapter, double)` (`ElkUtil.java:625-670`).
M1's 5b list loses `ElkRectangle` (T20 records it in the roadmap).

### M12 — Lazy option constants in algorithm option classes

`CoreOptions.apply` calls `new {Fixed,Box,Random}LayouterOptions().apply(registry)`, so `CoreOptions.ts` imports those
classes, whose `static readonly` constants read `CoreOptions.*` at module evaluation: entering through `CoreOptions`
hits a TDZ (journal, T8). `tools/melk/emit.ts` therefore emits each option constant of every algorithm `*Options`
class as a cached static getter (`static get X() { return (this.#X ??= …); }`), emulating JVM lazy class
initialization; `CoreOptions.ts` and non-algorithm generated files keep their form. Applies to mission 6/7 bundles
too. T8 owns the emitter change and its `test/melk/**` tests.

### M13 — Registry-independent stub-registry tests

With `fixed` registered, `getInstance()` registers `org.eclipse.elk.fixed` (and creates the backup category `''`),
which broke three mission-3 assertions that expected only their stub algorithms. They are edited once (T8) to drop
`org.eclipse.elk.*` algorithms before comparing; the category-order assertion (`slice(-2)` = `['t.cat', '']`)
becomes "test categories are `['t.cat']`, exactly one backup category", because the backup may already exist.
`test/melk/core-registry.test.ts` keeps pinning the real registry against the JVM dump. No edits at T10/T12.

### M14 — Stub ids vs core suffixes

With `org.eclipse.elk.box` registered, the T9 test's `test.alg.box` made suffix `box` ambiguous (lookup returns
`null`, as Java). The fixture constants become `test.alg.stubbox`/`stubbox`; assertions unchanged. Rule for later
tests: no stub algorithm id may end in a core algorithm's suffix (`fixed`, `box`, `random`).

### M15 — Box split

`BoxLayoutProvider.java` (810 lines) does not fit the 500-line cap. C3-amendment naming: `BoxLayoutProviderGroup.ts`
holds the nested `Group` class (Java `:687-808`) with all its methods; `BoxLayoutProviderGrouping.ts` holds
`placeInnerBoxes`, `areaStdDev2`, `mergeAndPlaceDec/Mixed/Inc` (Java order) as module functions; the provider keeps
the five private methods as one-line delegates so the Java method boundaries stay visible. Each file `@see`
`BoxLayoutProvider.java`; nothing exported from `src/index.ts`. T13's write-set gains both files.

### M16 — Lazy dependency constants

Generated `CoreOptions.ts` evaluated `TOPDOWN_SIZE_CATEGORIES_DEP_TOPDOWN_SIZE_APPROXIMATOR_0 =
TopdownSizeApproximator.FIXED_INTEGER_RATIO_BOXES` eagerly, so entering through `TopdownSizeApproximator.ts` (which
imports `CoreOptions`) hits a TDZ. The emitter writes every `*_DEP_*` constant (all generated option files) as a cached
private static getter with the Java name. Landed as `fix(T14)`: `tools/melk/emit.ts`, regenerated option files,
`test/melk/**`, plus a load-order test entering through the enum first.

### M17 — Engine split

The faithful engine port is 807 lines. `src/core/RecursiveGraphLayoutEngineTopdown.ts` holds the topdown section of
`layoutRecursively` (Java `:224-404`) and its helpers as module functions plus `layoutTopdown(layoutNode, monitor,
nodeCount, execute)`; the engine keeps a private `layoutTopdown` delegate passing `this.executeAlgorithm` (subclass
overrides still apply). Tests: topdown cases in `RecursiveGraphLayoutEngineTopdown.test.ts`, shared stubs in
`test/helpers/`, every file < 500 lines. `@see RecursiveGraphLayoutEngine.java` on the new module.
