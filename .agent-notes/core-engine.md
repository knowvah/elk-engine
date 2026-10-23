<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — core-engine (mission 5a, 2026-10-23)

Planning-time notes are in `core-engine-planning.md`.

## Observation: `AbstractLayoutProvider.initialize` is typed `string`, Java passes `null`

- **Context**: T1 `AlgorithmFactory` (default parameter `null`, as `AlgorithmFactory.java`).
- **Finding**: `src/core/AbstractLayoutProvider.ts:20` declares `initialize(_parameter: string)`; Java's
  `initialize(final String parameter)` receives `null` from `AlgorithmFactory` and from `LayoutAlgorithmData`
  factories without a parameter. `AlgorithmFactory.create` casts `null as string`.
- **Impact**: a provider overriding `initialize` sees `null` despite the type; widen to `string | null` when that
  file is next touched.
- **Confidence**: High

## Observation: `IWhiteBoxTestable` and `TestController` are mutually dependent

- **Context**: T1 typecheck.
- **Finding**: `IWhiteBoxTestable.setTestController(TestController)` imports T7's class, so T1 cannot typecheck
  alone; T7 was pulled into batch 1.
- **Impact**: when planning, put an interface and the class its signature names in the same batch.
- **Confidence**: High

## Observation: `TestController.removeLayoutExecutionListener` adds instead of removing

- **Context**: T7 port.
- **Finding**: `TestController.java:180-182` body is `listeners.add(listener)`; ported verbatim and pinned by a test.
- **Impact**: no golden, vector or later test may expect listener removal; list as an upstream bug kept (T20).
- **Confidence**: High

## Observation: Java `instanceof <interface>` becomes a structural method check

- **Context**: T7 `TestController.install`.
- **Finding**: TS interfaces have no runtime identity; the port tests `typeof provider.setTestController ===
'function'`, slightly looser than Java (any provider with that method counts).
- **Impact**: reuse the pattern at other `instanceof <interface>` sites (engine: `ITopdownLayoutProvider`).
- **Confidence**: High

## Observation: progress monitor getters return `null` in Java; the TS interface says non-null

- **Context**: T2 `BasicProgressMonitor`/`NullElkProgressMonitor`.
- **Finding**: `NullElkProgressMonitor.begin` returns `false`; its `getTaskName`/`getSubMonitors`/`getLogs`/
  `getLoggedGraphs` return `null`, as do Basic's `getTaskName` before `begin` and `getLogs`/`getLoggedGraphs` with
  logging off. `IElkProgressMonitor.ts` types them non-null, so the ports return `null as never`.
- **Impact**: engine and tests must null-check these getters; widen the interface when it is next touched.
- **Confidence**: High

## Observation: `maxHierarchyLevels` N reports only N−1 levels up

- **Context**: T2 `internalWorked`.
- **Finding**: a monitor propagates work to its parent only when its own `maxLevels != 0`, and `doSubTask` decrements
  the level for the child; with `withMaxHierarchyLevels(1)` the root's children do not report to the root.
- **Impact**: tests of progress reporting through the engine must expect this.
- **Confidence**: High

## Observation: the oracle writes bare `NaN` for fixed layouts of most hierarchical ptolemy models

- **Context**: T4 choosing hierarchical fixed goldens.
- **Finding**: 57 of 60 hierarchical models (≤ 30 nodes, no multi-section edges) produce `NaN` port `y` / root
  `height` under the fixed retarget; the JSON exporter writes it unquoted, so `JSON.parse` rejects the output. Clean:
  `{de,aspect}_compositeqm_CheckExecutionTimeConstraints`, `gt_sinewaveoptimization_SinewaveOptimization`.
- **Impact**: T19's comparison needs a NaN-tolerant reader; the TS port must produce the same NaN (trace the mechanism
  when T19 compares).
- **Confidence**: High (symptom), Low (mechanism)

## Observation: every `variants.json` entry adds sweep cases

- **Context**: T4 adding `random-seed-1`.
- **Finding**: `tools/corpus/sweep.ts:120-136` plans native and generated cases per variant; retarget cases use
  `default` only.
- **Impact**: a variant added for goldens grows the next full sweep's native/generated tiers.
- **Confidence**: High

## Observation: tests reading a mutable-default core property need the metadata service

- **Context**: T3 `computeChildAreaDimensions` tests.
- **Finding**: `Property.getDefault` throws `IllegalStateException` ("Couldn't clone property
  'org.eclipse.elk.margins'") unless `LayoutMetaDataService.getInstance()` ran (it registers the `ElkReflect`
  cloners); Java tests do it in `@BeforeClass`.
- **Impact**: any test touching `MARGINS`, `PADDING`, `NODE_SIZE_MINIMUM` defaults needs it in `beforeAll`.
- **Confidence**: High

## Observation: `ElkUtil.determineJunctionPoints` checks the main edge inside the other-edge loop

- **Context**: T3, `ElkUtil.java:537-541`.
- **Finding**: the loop re-checks `edge.getSections().size()`, so an other edge with no sections throws
  `IndexOutOfBoundsException` at `get(0)`, never the documented `IllegalArgumentException`. Kept verbatim.
- **Impact**: do not fix; do not test for the documented exception on the other edge.
- **Confidence**: High (source), not exercised

## Observation: `CoreOptions` ↔ algorithm `*LayouterOptions` is an ESM import cycle

- **Context**: T8 un-holding `fixed`.
- **Finding**: `CoreOptions.apply` instantiates `FixedLayouterOptions`, whose `static readonly` constants read
  `CoreOptions.PADDING`; entering through `CoreOptions` throws `Cannot access 'CoreOptions' before initialization`,
  entering through `FixedLayouterOptions` works. Java hides it via lazy class init.
- **Impact**: generated algorithm option constants are cached static getters (M12); the same applies to every later
  algorithm bundle.
- **Confidence**: High (reproduced in an isolated worktree)

## Observation: `ElkUtil` sections must not import `ElkUtil.ts`

- **Context**: T6 composing sections.
- **Finding**: `ElkUtil.ts` imports every section; a section importing it (e.g. for `printElementPath`) cycles.
  `printElementPath` lives in `ElkUtilVisitors.ts`; shared helpers go in a section file.
- **Impact**: future ElkUtil callers import `ElkUtil.ts`; sections import sections only.
- **Confidence**: High

## Observation: `applyVisitorsWithValidation` returns `void`; `StringBuilder` shim has no `length()`

- **Context**: T6.
- **Finding**: Java `ElkUtil.java:1107` is `void … throws GraphValidationException` (warnings dropped, TODO);
  `src/java/lang/StringBuilder.ts` exposes `append`/`appendChar`/`appendObject`/`toString` only.
- **Impact**: T11/T16 must not expect a returned issue list; ports needing `length()` track state themselves.
- **Confidence**: High

## Observation: registering the first category-less algorithm creates the backup category

- **Context**: T8 `core-registry`/`JsonMetaDataConverter`/`LayoutMetaDataService` tests.
- **Finding**: `fixed` has no category, so the TS service creates `''`/`Other` at `getInstance()`; any test counting
  algorithms or categories on the plain registry shifts (M13 made the stub tests registry-independent).
- **Impact**: box/random shift `''`'s layouter list again; the `''` row in `JsonMetaDataConverter.test.ts` replays
  once all three are registered.
- **Confidence**: High

## Observation: candidate mechanism for the fixed-layout NaN outputs

- **Context**: T8 provider tests; T4 saw bare `NaN` in oracle fixed outputs.
- **Finding**: `resizeNodeTo` computes `ratio = newSize / oldSize`; a 0×0 parent gives NaN/Infinity ratios that move
  ports by NaN when ports exist.
- **Impact**: start T19's NaN trace at `ElkUtilSizing.ts` `resizeNodeTo` and the port-move code.
- **Confidence**: Medium (reasoned, not traced)

## Observation: `StringBuilder` shim silently ignores a constructor argument

- **Context**: T11 `GraphValidator.checkEdge` (`new StringBuilder("Edge should be contained in ")`).
- **Finding**: `src/java/lang/StringBuilder.ts` has no constructor parameter; TS accepts `new StringBuilder("x")` and
  drops the prefix at run time. No other `src` call site passes one today.
- **Impact**: port `new StringBuilder(s)` as `new StringBuilder().append(s)`, or add the constructor when the shim is
  next touched.
- **Confidence**: High

## Observation: `RandomLayoutProvider` treats every edge as a self-edge

- **Context**: T10, `RandomLayoutProvider.java:167`.
- **Finding**: `targetShape = edge.getSources().get(0)`, so start `(cx + w/2, cy)`, end `(cx, cy + h/2)`, and
  `bendsNum++` always runs; the border branches `:198-237` are dead in the JVM too. Port parent x is added twice
  (`:159-160`, `:175-176`); y offset uses `padding.getLeft()` (`:113`).
- **Impact**: random goldens exercise only this path; do not fix.
- **Confidence**: High

## Observation: stub algorithm ids must not end in a core algorithm suffix

- **Context**: T12, `LayoutAlgorithmResolver.test.ts`.
- **Finding**: two registered ids ending in `.box` make `getAlgorithmDataBySuffix('box')` ambiguous → `null`.
- **Impact**: test stubs avoid suffixes `fixed`, `box`, `random` (and later bundles' suffixes) (M14).
- **Confidence**: High

## Observation: box default aspect ratio is a float; one child gives NaN row width

- **Context**: T12.
- **Finding**: `ASPECT_RATIO_DEFAULT = Math.fround(1.3)`; only an explicit value ≤ 0 falls back to the double 1.3.
  With one child `areaStdDev` divides 0/0 → NaN max row width → `xpos + width > NaN` never wraps.
- **Impact**: goldens with the unset default use the float; keep the NaN path.
- **Confidence**: High

## Observation: arithmetic on a null `Double` property silently yields 0 in TS

- **Context**: T16 topdown scaling (`CHILD_AREA_WIDTH/HEIGHT`, no default).
- **Finding**: Java unboxing throws NPE; TS `null * x` is 0. The engine adds an explicit `unboxDouble` → `TypeError`.
- **Impact**: every port doing arithmetic on a default-less boxed property needs the same guard.
- **Confidence**: High

## Observation: engine facts for harnesses (T17–T19)

- **Context**: T16.
- **Finding**: a pre-set root `RESOLVED_ALGORITHM` skips the resolver for the whole graph (unresolved descendants then
  throw "Resolved algorithm is not set; …"); topdown size pre-computation fetches pool instances it never releases
  (`RecursiveGraphLayoutEngine.java:245,:253`); `BasicProgressMonitor.isCanceled()` is always false (cancellation tests
  need a subclass); `test/helpers/layout-provider-stubs.ts` registers 7 `test.engine.stub*` algorithms globally.
- **Impact**: resolve every level or none; don't count created providers on topdown paths.
- **Confidence**: High

## Observation: TS-vs-oracle export diffs depend on registry contents

- **Context**: T19 corpus comparison.
- **Finding**: `JsonExporter.getShortOptionKey` writes `elk.direction` when layered's `priority.direction` makes the
  suffix ambiguous (oracle) and `direction` with the CoreOptions-only registry; `omitUnknownLayoutOptions(true)` drops
  options of unported bundles. Geometry matched on all 2,282 cases both sides lay out (NaN included).
- **Impact**: rerun `tools/corpus/ts-layout-compare.ts` after 7h; `optionsOnlyMismatches` and the 18 TS-only throws
  (inside self loops on childless nodes resolve to default layered) should reach 0.
- **Confidence**: High

## Observation: fixed-layout NaN outputs come from `resizeNode` on a 0×0 parent

- **Context**: T19 (closes the T4/T8 open note).
- **Finding**: `ElkUtil.java:257-306` computes `newSize / oldSize`; a retargeted 0×0 parent gives Infinity/NaN ratios,
  and west/east ports without fixed constraints get `y * ratio` = NaN. TS reproduces it exactly.
- **Impact**: comparison tools need a NaN-tolerant JSON reader for oracle output.
- **Confidence**: High

## Observation: `tools/` tests are not discovered by vitest

- **Context**: T19.
- **Finding**: `vitest.config.ts` includes `src/**/*.test.ts` and `test/**/*.test.ts` only; `tools/corpus` tools are
  tested from `test/corpus/`, and coverage includes only `src/**` and `tools/melk/**`.
- **Impact**: put tests for `tools/corpus/*` under `test/corpus/`.
- **Confidence**: High
