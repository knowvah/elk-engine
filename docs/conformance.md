<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformance: what "match" means

@knowvah/elk-engine is validated against upstream Eclipse ELK (Java) built from
source. A TypeScript layout is **conformant** with the oracle when, after both
are parsed as ELK JSON, the structure and every non-numeric value are exactly
equal and every finite number agrees within an absolute tolerance of `1e-6`.
The comparator is [`test/golden/compare-json.ts`](../test/golden/compare-json.ts);
this document describes what it implements. Port rules live in
[`docs/translation-rules.md`](translation-rules.md).

| #   | Section                                                       | Answers                                          |
| --- | ------------------------------------------------------------- | ------------------------------------------------ |
| 1   | [Oracle](#1-oracle)                                           | What is "correct", and at which commit?          |
| 1a  | [Conformance unit](#1a-conformance-unit)                      | What is one case, and which cases exist?         |
| 2   | [Conformance bar](#2-conformance-bar)                         | What counts as equal?                            |
| 3   | [Goldens and corpus](#3-goldens-and-corpus)                   | Where do reference outputs come from?            |
| 4   | [Seam patches](#4-seam-patches)                               | How do we change the oracle?                     |
| 5   | [Oracle operations](#5-oracle-operations-runbook)             | What do I do when it breaks?                     |
| 6   | [Gates](#6-gates)                                             | What must pass before a change lands?            |
| 7   | [ELK Text](#elk-text-elkt)                                    | How is `.elkt` proven?                           |
| 8   | [ELK Textual JSON](#elk-textual-json-elkj)                    | How is `.elkj` proven?                           |
| -   | [Core layouts](#core-layouts-fixed-box-random)                | How are `fixed`, `box`, `random` proven?         |
| -   | [alg.common](#alg-common)                                     | How is `alg.common` part a proven?               |
| -   | [alg.common nodespacing](#alg-common-nodespacing)             | How is `alg.common` part b proven?               |
| -   | [alg.layered framework](#alg-layered-framework)               | How is the layered framework (7a) proven?        |
| -   | [alg.layered cycles and layers](#alg-layered-phases)          | How are the first two phases (7b) proven?        |
| -   | [alg.layered crossing minimization](#alg-layered-ordering)    | How is the third phase (7c) proven?              |
| -   | [alg.layered node placement](#alg-layered-placement)          | How is the fourth phase (7d) proven?             |
| -   | [alg.layered edge routing](#alg-layered-routing)              | How is the fifth phase (7e) proven?              |
| -   | [alg.layered running pipeline](#alg-layered-pipeline)         | How is the whole layered layout (7f) proven?     |
| -   | [alg.layered labels and comments](#alg-layered-labels)        | How are labels and comments (7f2) proven?        |
| -   | [alg.layered loops, wrapping, compaction](#alg-layered-loops) | How are loops, wrapping, compaction (7g) proven? |
| -   | [alg.layered compound graphs](#alg-layered-compound)          | How are compound graphs (7h) proven?             |
| -   | [Temporary gaps](#temporary-gaps)                             | What differs from the Java for now?              |

## 1. Oracle

The oracle (AD-3) is upstream ELK **built from source** in a detached git
worktree of `$ELK_SOURCE_DIR`, created at `$ELK_ORACLE_DIR` by
`tools/oracle/build.sh`. Both are outside this repository; neither is vendored.

| Item              | Where                                                                                |
| ----------------- | ------------------------------------------------------------------------------------ |
| Pinned ELK commit | `tools/oracle/ELK_COMMIT` (currently `8bca22f4afa3371562d2f702d59929818f7f7b71`)     |
| Patch series      | `tools/oracle/patches/*.patch`, applied in lexical order with `git am --3way`        |
| Build             | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho downloads p2 artifacts)         |
| Batch runner      | `tools/oracle/run.sh <outDir> <input>...` or `run.sh --cases <cases.jsonl> <outDir>` |
| Harness           | `tools/oracle/harness/ElkOracle.java`                                                |
| Build manifest    | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar per bundle)           |

**Build.** `build.sh` runs `mvn -P elk-meta clean install -DskipTests` (the melk
compiler) and then `mvn clean install -DskipTests -Dmaven.test.skip=true` from
`build/` in the worktree, then records the jar of each in-scope bundle
(`core`, `graph`, `graph.json`, `alg.common`, and the `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`,
`vertiflex` algorithms) in `oracle-build.json`. An existing worktree is reused
only if it descends from `ELK_COMMIT`, carries exactly the patch subjects in
`tools/oracle/patches/`, and is clean apart from build output,
`oracle-build.json` and the untracked cache roots `census/`, `sweep/` and
`vector-cache/`; otherwise `build.sh` exits `2` and leaves it untouched.

**Run.** `run.sh` compiles `ElkOracle.java` against the bundle jars plus the
third-party bundles (Gson, Guava, EMF, Xtext/Xtend libs) from the Tycho p2
cache (`P2_BUNDLES`, default `~/.m2/repository/p2/osgi/bundle`; the newest
version of each is used). One JVM lays out every input with
`RecursiveGraphLayoutEngine` and writes `<outDir>/<input basename>.json`
with layout, zero dimensions, and zero positions included and unknown layout
options omitted. A failing input prints `ERROR <input>: <message>`; the
JVM exits `1` if any input failed. Input basenames must be unique within one
run, since the output name is the basename.

**Patch series semantics.** The series holds four patches:

| Patch                                                                                                          | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Paired TS seam                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b)                                        | `JsonExporter` resolves id collisions with `"_g" + Random.nextInt(1000000)`; the patch seeds that `Random` from the system property `org.eclipse.elk.graph.json.exportSeed` (unset = ELK behavior). `run.sh` passes `EXPORT_SEED=1`                                                                                                                                                                                                                                                                                                                         | Optional `random` parameter of the `JsonExporter` constructor (J4, [elk-json.md](architecture/elk-json.md#exporter-random)); tests pass `new Random(1)` (the TS `Random` shim reproduces the stream: seed 1 gives 548985, 764588)                           |
| `0002-graph-seedable-GraphIdentifierGenerator-random.patch` (added with the `.elkj` harness modes, `9ec3d1d5`) | `GraphIdentifierGenerator` resolves id collisions with an unseeded `Random`; the patch seeds it from the system property `org.eclipse.elk.graph.util.identifierSeed` (unset = ELK behavior). Only the harness convert mode sets it                                                                                                                                                                                                                                                                                                                          | None: the TS port parses the converted files and needs no paired seam (D12, stated in the patch message)                                                                                                                                                    |
| `0003-alg.test-pluggable-label-text-measurer.patch` (row 10, TX1, TX2)                                         | In the test bundle `org.eclipse.elk.alg.test` only, `TestConfiguration.computeLabelSize` takes a label's size from `TextMeasurer.fromSystemProperty()`. The property `org.eclipse.elk.alg.test.textMeasurer` selects the measurer: unset or `awt` keeps the AWT font metrics (the default, unchanged), `fixed` gives `[length × 6, 12]`, any other value throws `IllegalArgumentException` naming it                                                                                                                                                        | `test/helpers/layout-test-text-measurer.ts` (`TextMeasurer`, `AWT_SNAPSHOT_TEXT_MEASURER`, `FIXED_ADVANCE_TEXT_MEASURER`, `textMeasurerFrom`); env `ELK_TEST_TEXT_MEASURER` with the same values and the same throw ([text-sizing-seam](#text-sizing-seam)) |
| `0004-Report-all-overlaps-of-a-node-inserted-into-the-over.patch` (issue #111)                                 | In `org.eclipse.elk.alg.common`, `ScanlineOverlapCheck`'s handler `insert` no longer ends its walk over the scanline at the first node that does not overlap the inserted node once an overlap was found. It ends at the first node whose left side is at or right of the inserted node's right side (`DoubleMath.fuzzyCompare(…, InternalProperties.FUZZINESS) >= 0`), so the scanline reports every overlapping pair. Only `sporeOverlap` (`OverlapRemovalLayoutProvider`) runs that check. The patch also adds two tests to `ScanlineOverlapRemovalTest` | None: a carried upstream fix (eclipse-elk/elk#1247), not a seam. It is ported at its site, `src/alg/common/spore/ScanlineOverlapCheckHandler.ts` ([carried upstream patches](#carried-upstream-patches))                                                    |

Patches are of two kinds. A **seam patch** (`0001`-`0003`) adds a narrowly scoped seam that makes JVM and JS behavior
comparable; each is paired with a TS-side seam (section 4). Patch `0002` is the one exception: it needs no TS seam, as its row
says. A **carried upstream patch** (`0004`) is a fix filed upstream as a pull request that the pin does not hold yet; it changes
what ELK computes, and the port follows the patched Java ([carried upstream patches](#carried-upstream-patches)).

**Why not elkjs?** elkjs is ELK compiled by GWT. It cannot carry our patch
series, and GWT emulation of the JRE differs from the JVM we are porting from.
It is not consulted as an oracle.

### Carried upstream patches {#carried-upstream-patches}

A fix that is filed upstream and not merged yet is carried as an oracle patch, as if it were merged (maintainer ruling of
2026-11-13, issue #111). The patch is the pull request's head commit, exported with `git format-patch` (never written by
hand), and the port follows the patched Java at its site, with a comment naming the pull request and the patch. Tests the
pull request adds are ported like any other JUnit test. A carried patch is dropped in the mission that moves the pin past
the pull request's merge ([elk-upgrade.md](architecture/elk-upgrade.md#elk-upgrade-patches)). If the pull request's head
moves or it is closed without a merge, the patch is neither refreshed nor dropped without a ruling.

| Patch  | Upstream                                                                                                                                                                                  | Head commit                                                             | What changes                                                                                                                                                                                                                                                                                                | Port site                                                                                                                                                         |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0004` | [eclipse-elk/elk#1247](https://github.com/eclipse-elk/elk/pull/1247), fixes [eclipse-elk/elk#1246](https://github.com/eclipse-elk/elk/issues/1246) (fork: knowvah/elk#19, knowvah/elk#26) | `1bf1da95561140eb78d70d5dd747dd46803ead2a`, parent `8bca22f4` (the pin) | `ScanlineOverlapCheck.java` (+5 −6): the walk in `OverlapsScanlineHandler.insert` ends at the first node that starts at or right of the inserted node's right side, where it used to end at the first node without an overlap after one with an overlap. `ScanlineOverlapRemovalTest.java` (+62): two tests | `ScanlineOverlapCheckHandler.insert` (`src/alg/common/spore/ScanlineOverlapCheckHandler.ts`); the two tests in `src/alg/spore/ScanlineOverlapRemovalTest.test.ts` |

**Refs that moved with `0004`** (regenerated by script on the patched oracle, 2026-11-20; every other ref is byte-identical):

- `test/golden/refs/java/alg-common.json`: 3 of the 8 `scanline` rows of the `spore` group gain handler calls, the old
  sequence staying a subsequence of the new one: `scanline-random-n16` 14 → 17, `scanline-random-n24` 40 → 51,
  `scanline-dense-n30` 84 → 166.
- `test/golden/refs/java/spore-layout.json`: 23 of 340 rows, all `sporeOverlap`: 14 `stops` rows (twelve of `deco10`,
  `grid4/default`, `scanlineHitboxes/default`) and 9 `minst` rows (`gridO3`, `gridO4`, `gridO5`, `polyO6`, `polyO8`,
  `randO12`, `deco10`, `plain14`, `randO20`). In the `stops` rows only `scanline`, `triangulation` and `tree` stops differ
  (more scanline pairs, and the candidate edges, hash classification and weights that follow); every `grow`, `update` and
  `end` stop is equal, so these rows end at the same positions. No `full`, `throws`, `jitter` or `objects` row and no
  `sporeCompaction` row changed.
- `test/golden/refs/elk-packing/sporeOverlap--overlapRemoval.maxIterations-1.json`: two node positions and one edge
  section. The other six `sporeOverlap--*.json` goldens are unchanged.
- The `patches` array of the ten `_meta.json` files under `test/golden/refs/` gains the patch's file name.

**Corpus sweep with `0004`** (`tools/oracle/sweep.sh --filter /sporeOverlap/ --out <scratch>`, 906 cases, 2026-11-20):
880 `ok` and 26 `throws` on the oracle; the port agrees on all 906 (880 `ok`, 26 `both-throw`, no mismatch). Against the
sweep before the patch, 609 of the 879 cases that lay out both times have a different output, and one case no longer
throws: `retarget/sporeOverlap/default/realworld/ptolemy/hierarchical/pn_brockackerman_BrockAckerman`. Its root holds two
compound nodes with `NaN` rectangles (the #108 cases). The scanline's `TreeSet` orders nodes by left side, then centre x,
then centre y (`ScanlineOverlapCheck.java:131-141`); the two share the left side and, from the second iteration, a `NaN`
centre y, so only the centre x can tell them apart. Before the patch both were 509.73 wide after their own layouts, the
centres tied, and the second insertion threw "Invalid hitboxes for scanline overlap calculation."; with the patch their
own layouts find more overlaps and end 643.34 and 442.99 wide, so the centres differ. The other 26 throws are unchanged. `docs/parity-report.md` and the full sweep cache it was generated from predate the
patch: their `sporeOverlap` rows (879 `ok`, 27 `throws`) describe the unpatched oracle until the next full sweep.

## 1a. Conformance unit

A **case** is `(algorithm, model, variant)` (D1). The parity dashboard has one row per
layout algorithm; the elk-models folder and census features are filters, not rows.

**Case id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, for example
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` is the algorithm id
without `org.eclipse.elk.`. For generated models `modelId` is `generated/<name>`.

**Model id and source (D3).** The model id is the path in elk-models without the extension.
A case reads the `.json` when one exists, else the `.elkt`; `.elkg` (EMF XMI) is never read.

**Variants (D6).** Named option overlays in `test/corpus/variants.json`, applied at the root:
`default` (none), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algorithm                                     | Models                         | Variants              |
| ------------ | --------------------------------------------- | ------------------------------ | --------------------- |
| native       | the model's own `rootAlgorithm`               | every census model             | all seven             |
| retarget     | every listed algorithm except the model's own | every census model             | `default` only (OR-1) |
| generated    | the algorithm named by the file prefix        | `test/corpus/generated/*.json` | all seven             |
| ported JUnit | per algorithm mission                         | upstream JUnit cases (AD-13)   | as ported             |

`tools/oracle/run.sh --list-algorithms` is the list of algorithm ids (14 today).

**Retarget (D2).** The harness sets `org.eclipse.elk.algorithm` on **every node that has
children**, replacing any declared value, and `org.eclipse.elk.randomSeed = 1` on the root. ELK
resolves the algorithm per node, and an unset node falls back to layered. A root without
children gets only the seed. The retarget tier skips each model's own `rootAlgorithm` (the
native tier covers it).

## 2. Conformance bar

AD-4, exactly as `compareLayout(expected, actual, { tol })` implements it:

| Rule                      | Behavior                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerance                 | Absolute, `DEFAULT_TOLERANCE = 1e-6`; finite numbers pass when `abs(e - a) <= tol`                                                                                            |
| Non-finite numbers        | `NaN` and `±Infinity` must be exactly equal (`Object.is` or `===`), even with `tol: Infinity`                                                                                 |
| Strings, booleans, `null` | Strictly equal, else `value`                                                                                                                                                  |
| Kind mismatch             | Different JSON kinds (`null`, array, object, number, string, boolean) give one `type` diff                                                                                    |
| Object keys               | Key set must be identical: a key only in expected is `missing`, only in actual is `extra`                                                                                     |
| Arrays                    | Matched **by `id`** when every element on both sides is an object with a string `id` and ids are unique per side (an empty array counts as keyed); otherwise **positionally** |
| Keyed arrays              | An id on one side only is a `structure` diff at `path[id=<id>]`; order is ignored                                                                                             |
| Positional arrays         | A length difference is one `structure` diff and elements are not compared further                                                                                             |
| Diff kinds                | `structure`, `value`, `type`, `missing`, `extra`; `path` is JSON-path-like (`children[id=n1].x`)                                                                              |

Consequences: element ids, element counts, edge-section topology, and
bend-point counts are exact because ids and array lengths are exact;
coordinates and sizes get `1e-6`. `formatDiffs` prints at most 20 diffs.

**Known-divergences policy.** A divergence is never absorbed by raising `tol`
or editing a golden (AD-13). Each one is recorded here with its cause and the
test or fixture it affects. Accepted classes:

- **ulp-level `Math.*` differences.** V8 and the JVM may differ in the last bit
  of `sin`, `cos`, `exp`, `log`, `pow` and friends; Java's `StrictMath` is
  specified bit-exact, `Math` is not. The case already hit: `nextGaussian`
  is specified to use `StrictMath.log`, so `src/java/util/Random.ts` carries a
  `StrictMath.log`-exact implementation instead of `Math.log`. Prefer a
  bit-exact port of the `StrictMath` algorithm over widening tolerance.
- **Identity-hash iteration (AD-10).** Iterating a `HashMap`/`HashSet` keyed by
  identity-hashed objects is non-deterministic in Java itself. Journal the site
  and port with insertion order; goldens must not depend on it. Value-hashed
  keys (String, Integer) must reproduce Java order.
- **Upstream typos in human-readable text.** A defect in ELK's own prose (a
  description, label, or message string nothing branches on) is corrected
  proactively rather than reproduced, with a comment at the site naming the
  upstream text. Each case is listed here; the ported test asserts the
  corrected string. Behaviour, identifiers, and oracle-compared values are
  never in this class (policy set 2026-10-12, `CLAUDE.md` carve-out).
  No case is open. The last one, the `GraphFeature.COMPOUND` description
  ("levelsand"), was fixed upstream by
  [eclipse-elk/elk#1202](https://github.com/eclipse-elk/elk/pull/1202) and
  closed by the pin move to `e7eaea57` (#99).
- **Time-seeded `Random`.** With `randomSeed = 0` ELK seeds from the clock
  (`core/Core.melk:608`), so output is not reproducible. Golden inputs must
  leave the seed unset or non-zero (layered default seed is `1`).

Concrete entries (add one only with the user's approval):

| #   | Divergence               | Cause                                                                       | Scope                                                                                                                                                 | Approved             |
| --- | ------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Parse-error message text | ANTLR messages are artifacts of the generated parser, which is never ported | Invalid grammar input (`.elkt`, `.elkj`, `.elkr`): only the _presence_ of a parse failure must match, not the message. Valid input must match exactly | D8, user, 2026-10-11 |

### Non-strict Math call sites (AD-4 known-divergences list) {#math-call-sites}

Every transcendental `Math.*` call in non-test `src/` (36 calls in 14 files), pinned by
`test/architecture/math-call-sites.json` and the fitness test `math-call-sites.fitness.test.ts` (TP7): a new call fails the test
until it has a row here. Row order is file, then line. The Java calls plain `Math` at every site (the pinned ELK source has no
`StrictMath` call), so HotSpot may use an intrinsic that differs from `StrictMath` in the last bit. Evidence names the tests that
reached the site when every test file was run with the `Math` functions wrapped to record the calling `src` line; it lists tests that
reach the call, not tests that would detect a last-ulp difference. The divergence column holds what is already recorded elsewhere in
this file.

| TS site                                                              | Java site                                                                                                          | Function | Java calls | Evidence that reaches the site                                                                                                                      | Observed last-ulp divergence                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:51`          | `org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java:632`                   | `atan2`  | `Math`     | disco: `test/golden/force-disco-goldens.test.ts`, `DiscoVectors.test.ts`; the 8b sweep rows named in the entry                                      | none observed (8b: 171 replayed inputs bit-identical in V8, `Math` and `StrictMath`)  |
| `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:55`          | `org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java:636`                   | `sin`    | `Math`     | disco: `test/golden/force-disco-goldens.test.ts`, `DiscoVectors.test.ts`; the 8b sweep rows named in the entry                                      | last-ulp, 32 numeric fields: [8b `getOrthogonalPoints`](#alg-force-disco-divergences) |
| `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:56`          | `org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java:637`                   | `cos`    | `Math`     | disco: `test/golden/force-disco-goldens.test.ts`, `DiscoVectors.test.ts`; the 8b sweep rows named in the entry                                      | last-ulp, 32 numeric fields: [8b `getOrthogonalPoints`](#alg-force-disco-divergences) |
| `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:57`          | `org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java:638`                   | `sin`    | `Math`     | disco: `test/golden/force-disco-goldens.test.ts`, `DiscoVectors.test.ts`; the 8b sweep rows named in the entry                                      | last-ulp, 32 numeric fields: [8b `getOrthogonalPoints`](#alg-force-disco-divergences) |
| `src/alg/disco/transform/ElkGraphTransformerGeometry.ts:58`          | `org.eclipse.elk.alg.disco/src/org/eclipse/elk/alg/disco/transform/ElkGraphTransformer.java:639`                   | `cos`    | `Math`     | disco: `test/golden/force-disco-goldens.test.ts`, `DiscoVectors.test.ts`; the 8b sweep rows named in the entry                                      | last-ulp, 32 numeric fields: [8b `getOrthogonalPoints`](#alg-force-disco-divergences) |
| `src/alg/layered/intermediate/wrapping/BreakingPointInserter.ts:322` | `org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/intermediate/wrapping/BreakingPointInserter.java:329` | `pow`    | `Math`     | layered wrapping: `test/corpus/loops-sweep.test.ts`, `test/helpers/layered-loops-sweep.test.ts`, `LayeredLoopsVectors.test.ts`                      | none observed                                                                         |
| `src/alg/layered/p5edges/splines/SplinesMath.ts:140`                 | `org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplinesMath.java:116`                 | `acos`   | `Math`     | layered splines: `SplinesMath.test.ts`, `LayeredRoutingVectors.test.ts` (JVM vectors `layered-routing-steps.json`)                                  | none observed                                                                         |
| `src/alg/layered/p5edges/splines/SplinesMath.ts:219`                 | `org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/p5edges/splines/SplinesMath.java:207`                 | `cos`    | `Math`     | layered splines: `SplinesMath.test.ts`, `LayeredRoutingVectors.test.ts` (JVM vectors `layered-routing-steps.json`)                                  | none observed                                                                         |
| `src/alg/mrtree/intermediate/FanProcessor.ts:87`                     | `org.eclipse.elk.alg.mrtree/src/org/eclipse/elk/alg/mrtree/intermediate/FanProcessor.java:96`                      | `log10`  | `Math`     | mrtree: `test/golden/tree-goldens.test.ts`, `FanProcessor.test.ts`                                                                                  | none observed                                                                         |
| `src/alg/radial/RadialUtil.ts:138`                                   | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/RadialUtil.java:156`                                    | `atan2`  | `Math`     | radial: `test/golden/tree-goldens.test.ts`                                                                                                          | none observed                                                                         |
| `src/alg/radial/RadialUtil.ts:151`                                   | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/RadialUtil.java:169`                                    | `atan2`  | `Math`     | radial: `test/golden/tree-goldens.test.ts`                                                                                                          | none observed                                                                         |
| `src/alg/radial/intermediate/EdgeAngleCalculator.ts:28`              | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/EdgeAngleCalculator.java:48`               | `atan2`  | `Math`     | radial: `test/golden/tree-goldens.test.ts`, `RadialVectors.test.ts`                                                                                 | none observed                                                                         |
| `src/alg/radial/intermediate/rotation/AngleRotation.ts:76`           | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/intermediate/rotation/AngleRotation.java:53`            | `atan2`  | `Math`     | radial: `test/golden/tree-goldens.test.ts`, `AngleRotation.test.ts`                                                                                 | none observed                                                                         |
| `src/alg/radial/p1position/EadesRadial.ts:79`                        | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/EadesRadial.java:101`                        | `cos`    | `Math`     | radial: `test/golden/tree-goldens.test.ts`, `RadialVectors.test.ts`                                                                                 | none observed                                                                         |
| `src/alg/radial/p1position/EadesRadial.ts:80`                        | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/EadesRadial.java:102`                        | `sin`    | `Math`     | radial: `test/golden/tree-goldens.test.ts`, `RadialVectors.test.ts`                                                                                 | last-ulp, one sweep case: [8a `EadesRadial` `sin`](#alg-trees-divergences)            |
| `src/alg/radial/p1position/EadesRadial.ts:110`                       | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/p1position/EadesRadial.java:108`                        | `acos`   | `Math`     | radial: `test/golden/tree-goldens.test.ts`, `RadialVectors.test.ts`                                                                                 | none observed                                                                         |
| `src/alg/radial/sorting/PolarCoordinateSorter.ts:57`                 | `org.eclipse.elk.alg.radial/src/org/eclipse/elk/alg/radial/sorting/PolarCoordinateSorter.java:74`                  | `atan2`  | `Math`     | radial: `test/golden/tree-goldens.test.ts`                                                                                                          | none observed                                                                         |
| `src/core/math/ElkMathBezier.ts:26`                                  | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/ElkMath.java:467`                                              | `pow`    | `Math`     | module-level constant, evaluated on import: every golden and sweep test that loads `ElkMath`                                                        | none observed                                                                         |
| `src/core/math/KVector.ts:68`                                        | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:95`                                               | `cos`    | `Math`     | layered splines and self loops: `test/corpus/loops-sweep.test.ts`, `test/corpus/compound-sweep.test.ts`, `test/helpers/layered-loops-sweep.test.ts` | none observed                                                                         |
| `src/core/math/KVector.ts:68`                                        | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:96`                                               | `sin`    | `Math`     | layered splines and self loops: `test/corpus/loops-sweep.test.ts`, `test/corpus/compound-sweep.test.ts`, `test/helpers/layered-loops-sweep.test.ts` | none observed                                                                         |
| `src/core/math/KVector.ts:294`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:381`                                              | `asin`   | `Math`     | layered splines: `SplinesMath.test.ts`, `LayeredRoutingVectors.test.ts` (JVM vectors `layered-routing-steps.json`)                                  | none observed                                                                         |
| `src/core/math/KVector.ts:297`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:383`                                              | `asin`   | `Math`     | layered splines: `SplinesMath.test.ts`, `LayeredRoutingVectors.test.ts` (JVM vectors `layered-routing-steps.json`)                                  | none observed                                                                         |
| `src/core/math/KVector.ts:300`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:385`                                              | `asin`   | `Math`     | layered splines: `SplinesMath.test.ts`, `LayeredRoutingVectors.test.ts` (JVM vectors `layered-routing-steps.json`)                                  | none observed                                                                         |
| `src/core/math/KVector.ts:352`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:443`                                              | `cos`    | `Math`     | radial rotation: `test/golden/tree-goldens.test.ts`, `AngleRotation.test.ts`, `GeneralRotator.test.ts`                                              | none observed                                                                         |
| `src/core/math/KVector.ts:352`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:443`                                              | `sin`    | `Math`     | radial rotation: `test/golden/tree-goldens.test.ts`, `AngleRotation.test.ts`, `GeneralRotator.test.ts`                                              | none observed                                                                         |
| `src/core/math/KVector.ts:353`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:444`                                              | `cos`    | `Math`     | radial rotation: `test/golden/tree-goldens.test.ts`, `AngleRotation.test.ts`, `GeneralRotator.test.ts`                                              | none observed                                                                         |
| `src/core/math/KVector.ts:353`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:444`                                              | `sin`    | `Math`     | radial rotation: `test/golden/tree-goldens.test.ts`, `AngleRotation.test.ts`, `GeneralRotator.test.ts`                                              | none observed                                                                         |
| `src/core/math/KVector.ts:364`                                       | `org.eclipse.elk.core/src/org/eclipse/elk/core/math/KVector.java:455`                                              | `acos`   | `Math`     | radial rotation: `test/golden/tree-goldens.test.ts`, `AngleRotation.test.ts`, `GeneralRotator.test.ts`                                              | none observed                                                                         |
| `src/core/options/TopdownSizeApproximatorUtil.ts:59`                 | `org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java:58`                        | `pow`    | `Math`     | unit tests only (`TopdownSizeApproximatorUtil.test.ts`, `TopdownSizeApproximator.test.ts`); no golden, ref replay or sweep test reaches it          | none observed                                                                         |
| `src/core/options/TopdownSizeApproximatorUtil.ts:66`                 | `org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java:65`                        | `log`    | `Math`     | unit tests only (`TopdownSizeApproximatorUtil.test.ts`, `TopdownSizeApproximator.test.ts`); no golden, ref replay or sweep test reaches it          | none observed                                                                         |
| `src/core/options/TopdownSizeApproximatorUtil.ts:66`                 | `org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java:65`                        | `log`    | `Math`     | unit tests only (`TopdownSizeApproximatorUtil.test.ts`, `TopdownSizeApproximator.test.ts`); no golden, ref replay or sweep test reaches it          | none observed                                                                         |
| `src/core/options/TopdownSizeApproximatorUtil.ts:67`                 | `org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java:66`                        | `exp`    | `Math`     | unit tests only (`TopdownSizeApproximatorUtil.test.ts`, `TopdownSizeApproximator.test.ts`); no golden, ref replay or sweep test reaches it          | none observed                                                                         |
| `src/core/options/TopdownSizeApproximatorUtil.ts:73`                 | `org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java:72`                        | `pow`    | `Math`     | unit tests only (`TopdownSizeApproximatorUtil.test.ts`, `TopdownSizeApproximator.test.ts`); no golden, ref replay or sweep test reaches it          | none observed                                                                         |
| `src/core/options/TopdownSizeApproximatorUtil.ts:79`                 | `org.eclipse.elk.core/src/org/eclipse/elk/core/options/TopdownSizeApproximatorUtil.java:78`                        | `pow`    | `Math`     | unit tests only (`TopdownSizeApproximatorUtil.test.ts`, `TopdownSizeApproximator.test.ts`); no golden, ref replay or sweep test reaches it          | none observed                                                                         |
| `src/core/util/BoxLayoutProvider.ts:316`                             | `org.eclipse.elk.core/src/org/eclipse/elk/core/util/BoxLayoutProvider.java:286`                                    | `pow`    | `Math`     | box layouts (`computeMaxRowWidth`): `test/golden/layout-goldens.test.ts`, `test/golden/packing-goldens.test.ts`, `RectPackingVectors.test.ts`       | none observed                                                                         |
| `src/core/util/BoxLayoutProviderGrouping.ts:220`                     | `org.eclipse.elk.core/src/org/eclipse/elk/core/util/BoxLayoutProvider.java:469`                                    | `pow`    | `Math`     | unit test only (`BoxLayoutProviderGrouping.test.ts`); no golden, ref replay or sweep test reaches it                                                | none observed                                                                         |

There is no `StrictMath.ts`. `src/java/lang/JavaMath.ts` `log` is the bit-exact `StrictMath.log` shim and its callers
(`Random.nextGaussian`, `EadesModel`) are not `Math.log` sites; every site above ports a Java `Math` call, and 8b measured V8
equal to `StrictMath` on all 160 `sin` and 160 `cos` inputs while HotSpot's `Math` differs from both, so a fdlibm port of
`sin`, `cos` or `atan2` would not match the oracle any better (TP7). Measuring each site's delta against the 0.01 px bar is
issue #74's audit.

**Verdicts.** Each case gets one verdict from two separate JVM runs of the oracle (D4, D5, OR-2):

| Verdict            | Meaning                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ok`               | Both runs laid out the model and the output files are byte-identical                                                                                         |
| `throws`           | Both runs threw the same exception: exact class, and exact message after `@[0-9a-f]+` becomes `@<hash>` (the message may be null, e.g. `StackOverflowError`) |
| `nondeterministic` | The runs disagree (output bytes, exception, or one `ok` and one `throws`)                                                                                    |
| `oracle-error`     | Harness fault (unreadable input, unknown variant/algorithm/option, lost result line); never acceptable                                                       |
| `timeout`          | A run exceeded `ELK_SWEEP_TIMEOUT_MS`                                                                                                                        |

Precedence: `oracle-error`, then `timeout`, then `ok`/`throws` when equal, else
`nondeterministic`. Before the byte comparison, every `@[0-9a-f]+` token in both outputs is
replaced by `@<hash>`, as in exception messages (D5a; `sameOutput` in `tools/corpus/sweep.ts`).
Cause: disco's programmatic `debug.discoGraph` option exports `...DCGraph@<identity hash>`,
which no seed can pin. The TS comparator applies the same replacement. Nondeterministic cases
are reported separately and excluded from pass counts, in line with the identity-hash policy above.

Genuine remaining source of `nondeterministic` (ELK behavior, not a harness fault; counts are in
the parity report): `random` (default `randomSeed` 0 is unseeded on nested composites; retarget
seeds only the root, D2, kept by user decision). spore was a second source until the `8bca22f4`
pin (#104): its jitter of coincident centres is seeded since
[eclipse-elk/elk#1242](https://github.com/eclipse-elk/elk/pull/1242) (`randomSeed`, default 1), and
only a seed of 0 draws from an unseeded generator (`ElkGraphImporter.java:133`). The exporter's
`_g<random>` id renames are not a source: the seam patch fixes them.

**Known flicker: `sporeOverlap` verdicts (#79, #86).** The two-run check calls a case deterministic
when its runs agree, and on inputs with coincident node centres the spore jitter sometimes lets
them agree. So the verdicts of those cases (`ok`, `throws` or `nondeterministic`), the report rows
built from them and the TS findings on them can change from one sweep to the next. A re-sweep
difference confined to such cases is not a regression. This holds until the seeded-generator fix
(knowvah/elk#14, upstream eclipse-elk/elk#1211) is carried; no sweep-side workaround is used.

## 3. Goldens and corpus

AD-5. Reference outputs are committed so CI needs no JVM.

| Item             | Where                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| Pinned corpus    | `eclipse-elk/elk-models` at the `commit` in `test/corpus/manifest.json` (not vendored)          |
| Models directory | `$ELK_MODELS_DIR`, default `../../eclipse-elk/elk-models` relative to this repo                 |
| Curated set      | `golden[]` in `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Refs             | `test/golden/refs/elk/<id>.json`, one per manifest `id`                                         |
| Provenance       | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Id to path mapping.** `golden[].path` is relative to `$ELK_MODELS_DIR`, and
the input is `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` runs the harness on
those inputs and stages each `<basename>.json` output as `refs/elk/<id>.json`.
Example: id `ptolemy-scrambler` is
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regeneration** (`tools/oracle/regen-goldens.sh`):

1. Requires the models clone to be at exactly the manifest commit (else exit `1`).
2. Requires a built oracle (`run.sh` needs `oracle-build.json`).
3. Stages all refs and `_meta.json` in `test/golden/refs/.elk-staging.*`, then
   swaps the directory in two renames, so a failed run leaves the old refs.
4. `_meta.json` has no timestamps (`builtAt` stays in `oracle-build.json`), so a
   regeneration with no inputs changed is a byte-for-byte no-op in git.

**When to regenerate:** after changing `ELK_COMMIT`, the patch series, the
manifest `golden[]` set or `commit`, or the harness. Never otherwise.

**Journaling rule.** Every regeneration that changes a ref is journaled with the
cause (the patch id, or the commit bump). Refs are never hand-edited. If a TS
assertion or golden can only pass by being changed, stop and journal (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` lays out nothing: it runs the oracle in parse mode
over every model and compares the result with the committed `test/corpus/census.json` (898
models: id, formats, source, root algorithm, feature counts). Exit `0` when equal, `1` on drift;
`--write` rewrites the file. It runs only in the pinned models clone and aborts on a harness
fault.

**Generated corpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` holds a seeded
grandom config; its sibling `.json` is the oracle-generated, unlaid-out input. Nine configs cover
the algorithm ids no elk-models model uses: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Each has at most 50 nodes and
no edge labels (`BlindTextGenerator` is unseeded). The harness names the generated root `root`,
because ELK's `JsonExporter` resolves an id collision with an unseeded random suffix. Regenerate
only with `tools/oracle/regen-generated.sh` (staging directory and rename; a failing config
leaves the old files); a rerun with nothing changed is a git no-op. The TS grandom port must
reproduce these `.json` files byte for byte; algorithm goldens never depend on it.

**Tree goldens (mission 8a).** `regen-goldens.sh --set trees` adds a set the way `--set layered` does: manifest
`test/golden/trees.json`, refs `test/golden/refs/elk-trees/` (40 refs, `-XX:hashCode=2` named in `_meta.json`), inputs read from
`test/golden/trees-inputs/` in the repository (`NEEDS_MODELS=0` skips the elk-models checks for this set only). An entry
without `retarget` records the default algorithm, so the generated corpus inputs have `*-generated-retarget` entries. The
sweep tool `tools/corpus/ts-layout-compare.ts` registers the three tree providers (`registerTreeAlgorithms()`); layered is
not registered there (row 9). See [alg-trees.md](architecture/alg-trees.md).

**Force, stress and disco goldens (mission 8b).** `regen-goldens.sh --set force-disco` is the same additive arm: manifest
`test/golden/force-disco.json`, refs `test/golden/refs/elk-force-disco/` (45 refs, `-XX:hashCode=2` named in `_meta.json`),
inputs under `test/golden/force-disco-inputs/`, `NEEDS_MODELS=0`. `ts-layout-compare.ts` registers force, stress and disco
(with `PolyominoOptions`) and layered. See [alg-force-disco.md](architecture/alg-force-disco.md).

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` plans every case, runs each twice in separate JVMs (shards default
to `min(cpus, 8)` concurrent `run.sh` processes), and writes
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` prints case counts per tier and runs nothing; `--filter` keeps case ids containing
the substring; `--limit` takes an even-stride sample. Exit `0` unless a case is `oracle-error`
(`1`); a tool failure exits `2`. Per-case outputs stay local (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(default `30000`, read only by `tools/`) bounds each case; `run.sh` restarts a JVM after a
timeout (JVM exit code 75) on the cases without a result line.

**Parity report (D9).** `docs/parity-report.md` is generated from the sweep cache and committed:
counts per algorithm and verdict, with the ELK and models commits and no timestamps. It describes
the sweep it was generated from and is regenerated only when a fresh report is asked for (#86);
sweeps may run as often as useful in between. Regenerate with
`npx tsx tools/corpus/parity-report.ts --write`; without `--write` the command exits `1` when the
committed report differs from the current sweep cache, which is expected after any later sweep
(the per-sweep timing columns alone differ). Never edit it by hand.

**Corpus tests.** `resolveModelsDir()` in `test/corpus/corpus.ts` returns a
`skip` reason when the clone is missing or at another commit; tests that need
it skip with the pinned sha in the message. Today `test/golden/oracle-refs.test.ts`
checks the committed refs only: one per manifest id, geometry on every node,
port, label, and edge, self-comparison, and that `_meta.json` matches
`ELK_COMMIT`, the manifest, and the generator. There is no TS-vs-oracle layout
test yet; it arrives with the first ported algorithm.

## 4. Seam patches

Seam patches change the oracle; they are rare and always paired with a TS seam. A carried upstream patch
([section 1](#carried-upstream-patches)) is installed by the same steps; in place of step 3 the patched Java is ported at
its site, and its tests with it.

1. Edit and commit in the oracle worktree (`$ELK_ORACLE_DIR`), or author the patch in a scratch
   clone at `ELK_COMMIT`. To add a finished patch to the existing worktree in place (keeps the
   `census/`, `sweep/` and `vector-cache/` roots, which removing the worktree deletes), apply it with
   `build.sh`'s identity:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` then verifies the series and rebuilds in place (about 3 minutes), so steps 4-5
   can be skipped. The rebuild rewrites `oracle-build.json`, which is part of every vector-cache
   salt, so each cached recorder still runs cold once after it.
2. Export:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (or only the new commits). Files are named `NNNN-<slug>.patch`; the numeric
   prefix fixes the apply order.
3. Add the matching TS seam (same behavior, injectable, in `src/`), with tests
   whose expected values come from the patched oracle (AD-13).
   A seam whose Java site lives in a test bundle has its TS twin in `test/helpers/`, beside that
   framework's port, not in `src/` (TX5; the row-10 precedent).
4. Otherwise remove the worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (add `--force` if build output makes it dirty).
5. Rebuild: `tools/oracle/build.sh` (re-applies the series from scratch).
6. Regenerate: `tools/oracle/regen-goldens.sh`; review `git diff test/golden/refs`.
7. Journal an entry naming the patch (`NNNN-<slug>.patch`) and listing every
   ref that changed. `_meta.json` `patches` records the series automatically.

Never leave an uncommitted edit in the worktree: `build.sh` treats it as stale
(exit `2`). Never edit `ELK_SOURCE_DIR` itself.

## 5. Oracle operations (runbook)

| Failure                                                                             | Detection                                                                                                                                                                                                                                                               | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho build fails (p2 unreachable, JDK, Maven version)                              | `tools/oracle/build.sh` exits non-zero; full Maven output in `.oracle-build.log` at the repo root. Exit `1` is a missing tool or wrong Maven; exit `3` means a bundle jar was not produced                                                                              | Maven must be **3.9.x**: Tycho 4.0.12 fails on Maven 3.10 (Homebrew's 3.10.0) with `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. A local 3.9.11 lives at `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Use JDK 21, or JDK 17 via `JAVA_HOME`. Check network (first run downloads p2 artifacts), then rerun. `build.sh --record-only` skips Maven and only rewrites `oracle-build.json` from jars already built. Exit `2`: follow the next row before you remove the worktree. Otherwise escalate with the log tail |
| `build.sh` exits `2` right after applying a patch                                   | Worktree reported stale                                                                                                                                                                                                                                                 | `build.sh` unfolds wrapped patch subjects (`git format-patch` folds those over about 78 chars) and ignores build output, `oracle-build.json` and the untracked root directories `census/`, `sweep/` and `vector-cache/`. Any other untracked directory at the worktree root (put run output under `sweep/`), a tracked change or an unlisted patch still gives exit `2`; `git -C "$ELK_ORACLE_DIR" status --porcelain` names the dirt. Fix the worktree (section 4); removing it (step 4) is the last resort, because it deletes the three caches                                                                             |
| Golden drift after a patch or commit bump                                           | `tools/oracle/regen-goldens.sh` followed by `git diff --exit-code test/golden/refs` is non-empty; `test/golden/oracle-refs.test.ts` fails on a stale `_meta.json` (`elkCommit`, `modelsCommit`); a TS conformance test, once present, fails with a `formatDiffs` report | Rebuild (`build.sh`), run `regen-goldens.sh`, review the diff, journal the patch id. Never hand-edit a ref or loosen `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Xtext/ANTLR jar missing from the p2 cache (`.elkt`, `.elkr`, or any `run.sh` start) | `run.sh` exits non-zero with `bundle <name> not in p2 cache <dir>` (e.g. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                           | Set `P2_BUNDLES` to the Tycho p2 cache that holds it, or run `build.sh` with network access so Tycho fetches it; rerun `run.sh`. Do not substitute jars from elsewhere                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sweep hang or OOM                                                                   | A case runs to the timeout and reports `timeout` (a stderr line names it); a run with no result line gives `oracle-error` and `sweep: shard <n> run <A or B> exited <code>` on stderr; the machine swaps under 8 concurrent JVMs                                        | Lower concurrency and batch size: `sweep.sh --shards 2`, narrow with `--filter` or `--limit`. Raise `ELK_SWEEP_TIMEOUT_MS` only for a model that is slow but correct. A reproducible `timeout` is a finding: journal the case id, do not widen the limit to hide it                                                                                                                                                                                                                                                                                                                                                           |
| Census drift after a pin bump (`ELK_COMMIT` or models `commit`)                     | `npx tsx tools/corpus/census.ts` exits `1` and lists the differing models; `test/corpus/census.test.ts` fails                                                                                                                                                           | Confirm the clone and oracle are at the new pins, rerun `census.ts --write`, review `git diff test/corpus/census.json`, journal the cause, then rerun `sweep.sh` and regenerate the parity report. Never hand-edit the census                                                                                                                                                                                                                                                                                                                                                                                                 |
| elk-models missing or wrong sha                                                     | Corpus tests skip with a message naming the expected sha; `regen-goldens.sh` exits `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                   | Run `test/corpus/fetch.sh` (clones and checks out the pinned commit). It exits `2` if an existing clone is at another commit and does not touch it: fix that clone yourself or point `ELK_MODELS_DIR` at a fresh path. Never move an existing clone's HEAD from a script                                                                                                                                                                                                                                                                                                                                                      |

Other `run.sh` failures: `oracle-build.json missing` or `oracle jar missing`
means run `build.sh` first; `bundle <name> not in p2 cache` means set
`P2_BUNDLES` to the Tycho p2 cache or rerun `build.sh` with network access.

## 6. Gates

Every change:

| Gate               | Command                                                   | Bar                                                                                                                                                                 |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types              | `npm run typecheck`                                       | exit 0                                                                                                                                                              |
| Tests and coverage | `npm run coverage`                                        | all tests pass; 90% statements, branches, functions, and lines over `src/**`                                                                                        |
| Architecture       | `test/architecture/*.fitness.test.ts` (run by `npm test`) | module boundaries, module globals, no Node builtins in `src/`, SPDX headers                                                                                         |
| Oracle refs        | `test/golden/oracle-refs.test.ts`                         | committed refs consistent with manifest and `ELK_COMMIT`                                                                                                            |
| CodeQL             | `npm run codeql`                                          | exit 0: every finding of GitHub Code Quality's suites (Java recorders and TypeScript) is in `tools/codeql/accepted.json` with a reason, and no entry there is stale |

Changes to `tools/oracle/`, the manifest, or the patch series also need:

| Gate             | Command                                                                       | Bar                                                               |
| ---------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Oracle build     | `tools/oracle/build.sh`                                                       | exit 0                                                            |
| Oracle run       | `tools/oracle/run.sh <outDir> <input.json>...`                                | exit 0, no `ERROR` lines                                          |
| Golden stability | `tools/oracle/regen-goldens.sh`, then `git diff --exit-code test/golden/refs` | no diff, unless the change is meant to move refs and is journaled |
| Shell            | `shellcheck tools/oracle/*.sh`                                                | clean                                                             |

Changes to `tools/oracle/` or `tools/corpus/` also need:

| Gate                | Command                                                                                    | Bar                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Census              | `npx tsx tools/corpus/census.ts`                                                           | exit 0 (no drift)                                       |
| Generated stability | `tools/oracle/regen-generated.sh`, then `git diff --exit-code test/corpus/generated`       | no diff                                                 |
| Sweep               | `tools/oracle/sweep.sh` (or `--filter`/`--limit` for a sample)                             | exit 0: no `oracle-error`                               |
| Parity report       | only when a fresh report is asked for: `parity-report.ts --write`, then `parity-report.ts` | exit 0 right after `--write`; not a standing gate (#86) |

## 7. ELK Text (`.elkt`) {#elk-text-elkt}

Port: `src/graph/text` over `src/xtext` (internal entry point `ElkGraphText`: `load`, `validate`,
`serialize`; design and runbook in [elk-text.md](architecture/elk-text.md)). Evidence is two-tier (G7):
the committed JVM vectors and 31 curated refs (inputs vendored in `test/corpus/elkt-curated/`) run in
CI, and the sweep below measures the whole corpus locally, because elk-models is not vendored.

**What is compared.** Every `.elkt` model under `$ELK_MODELS_DIR` (898) and every realworld `.json`
model (550), each with the oracle's output at the pinned ELK commit, every case in two separate JVM runs
compared byte for byte (a differing case would be `nondeterministic` and excluded; none occurred):

- `parse`: `exportLikeOracle(load(elkt).root)` against the oracle's parse, `compareLayout` at 1e-6. Where
  the oracle throws, the port must report at least one error (presence only, D8 #1).
- `validate`: `ElkGraphText.validate` issues against Xtext's `IResourceValidator` (`severity`, `message`,
  `line`, `code`), exactly and in emission order.
- `write`: `ElkGraphText.serialize` against `EcoreUtil.copy` plus `ISerializer.serialize(format())`, byte for
  byte, for the 898 `.elkt` (parsed, then written) and the 550 `.json` (via `ElkGraphJson`). Failures match by
  presence.
- `reparse`: `load(serialize(g))` equals `g` (`canonGraph`, properties sorted by id); where it cannot, it must
  equal the oracle's own reparse of the same text and the oracle's round trip must be lossy too.
- `D3`: a realworld `.json` and its `.elkt` give the same graph except for port positions (D3 as amended by
  D3a, user 2026-10-14).

**Registry mode.** The sweep always runs the oracle with `ORACLE_REGISTRY=core` (G3): the CoreOptions-only
registry, which is the TS registry (94 option ids on both sides). The default oracle registry changes the
export of 182 of the 898 models (layered and other algorithm keys), so default-mode output is not the
comparison. Missions 5 and 7 register more algorithms and regenerate these refs and this sweep; the
`MISSION5_ALGORITHMS` filter and the `mission5` vector rows go away then.

**Result** (oracle ELK `8aaa3c1`, elk-models `ac5af2b`, 2026-10-14; counts equal the graph-text decision
journal):

| Indicator                 | Bar         | Measured    | Deferred | Diffs |
| ------------------------- | ----------- | ----------- | -------- | ----- |
| parse-equal               | 898/898     | 898/898     | 0        | 0     |
| validate-equal            | 898/898     | 898/898     | 0        | 0     |
| writer byte-exact         | 1,448/1,448 | 1,448/1,448 | 0        | 0     |
| reparse-equal after write | 1,448/1,448 | 1,448/1,448 | 0        | 0     |
| D3 `.json` equals `.elkt` | 550/550     | 550/550     | 0        | 0     |

Validate-equal (2026-10-15): the 4 models that name `fixed` or `box` (G3: in the oracle's core registry, not
yet in the TS one) are validated with stand-ins registered (`test/helpers/mission5-stand-ins.ts`, the option
support of `Core.melk`, no layout code) and match exactly; without them they differ only by "No layout algorithm
with identifier … can be found". Mission 5 drops the stand-ins.

No case was nondeterministic and the oracle threw on none (all 898 `.elkt` parse, validate and write; all 550
`.json` import and write). Reparse: 1,447 reload equal to the written graph; 1 (`examples/user-hints/layered/reverseEdge.elkt`)
reloads as the oracle reloads it: `priority.direction` is a layered option, unknown under the core registry, and
the writer emits the short key `direction`, which is an ambiguous suffix on re-reading (the oracle's round trip is
lossy identically). The largest model (`realworld/ptolemy/hierarchical/de_trilateration_Trilateration.elkt`,
253 KB) loads in about 110 ms (budget 1 s) and the TS side of the sweep runs in well under the 2 minute budget.

**Deferrals.**

- G3, mission 5 (4 validate models): the core oracle registers the algorithms `fixed`, `box` and `random`,
  the TS registry defers them, so the port adds "No layout algorithm with identifier ... can be found." The
  models name them as `algorithm`: `tickets/core/457_boxLayouterIgnoresMinimumSize` (`box`),
  `tickets/core/475_fixedLayoutWithLongLabels` (`fixed`), `tickets/core/489_paddingAndMinSize_Large` and
  `_Small` (`org.eclipse.elk.box`). Closed by mission 5 (the same filter as the validator vectors).
- D3 port positions (D3a, all 550 realworld pairs): the `.elkt` of a realworld model carries port positions of
  a laid-out Ptolemy graph and its `.json` has none, and the oracle's two parses differ in exactly `ports[].x` and
  `ports[].y` for every pair. The user amended D3 on 2026-10-14 to "equal except port positions". Rule:
  `canonGraphWithoutPortPositions` trees equal (`test/helpers/elkt-canon.ts`: `canonGraph` with every port's x and
  y blanked), no tolerance, nothing else excluded — and only while those positions cannot change a layout: in both
  graphs every port has an explicit side and `port.index` and no node has `FIXED_POS`/`FIXED_RATIO` constraints
  (`portsWithLayoutRelevantPosition` empty; otherwise ELK infers side or order from the position). All 48,858
  realworld ports meet it.
- D8 #1, syntax-error text: matched by presence only. No corpus model has a syntax error, so no sweep row uses
  it; the vectors cover it.

**Writer quirk kept (G1).** `ElkGraphSemanticSequencer.isQuotingNecessary` always returns `false` (the
`map` result is unused, so the compiler drops the call), so property string values are never quoted or escaped:
a value such as `say "hi"` is written bare and does not re-parse. The port reproduces this (ELK behaviour kept);
the T5 vectors and the sweep agree byte for byte.

**Converter rows and diagnostic lines (text-follow-ups T2, T8).** The `.elkt` converter service replays 33 more
lexer rows (the `SIGNED_INT`, `FLOAT`, `ML_COMMENT`, `SL_COMMENT`, `ANY_OTHER` and `WS` terminals) through
`DefaultTerminalConverter` and the `EcoreFactoryImpl` EInt/EDouble/EString arms. Diagnostic lines of `.elkt` now
follow Xtext's node model like `.elkj` (a lone CR counts as a line break): the parser passes
`nodeModelLineSource(text)` and the reference lines in `ElkGraphParserEdges.ts` use `cursor.lineOf`. Evidence: 4 new
JVM scenarios (`link-cr-line-numbers`, `link-crlf-line-numbers`, `err-syntax-cr-line-number`,
`err-syntax-crlf-line-number`); `graph-text-parse.json` 301 to 305 cases (syntax-error cases 99 to 101), linking
diagnostic cases in `ElkGraphLinker.test.ts` 47 to 51, no existing row changed. Property keys
(`ElkGraphParser.ts`, `#parsePropertyKey`) followed in vector-cache-and-key-line T1 (F7): two JVM validate scenarios
(`checkPropertyKey-line-lone-cr`, `checkPropertyKey-line-crlf`), `graph-text-validate.json` 76 to 78 cases, no
existing row changed; before the fix the lone-CR row reported both key issues on line 2, the oracle on lines 3 and 5.

**Regenerate.** `tools/oracle/elkt-sweep.sh [--force]` writes `$ELK_ORACLE_DIR/sweep/elkt-<elkCommit>-<modelsCommit>/`
(`parse/`, `parse-json/`, `validate/`, `write/`, `results.jsonl`, `summary.json`; never in the repo, AD-5) and
skips when the stamp (oracle build, harness and tool sources, models commit, input hashes) is fresh. Then
`npx vitest run test/corpus/elkt-sweep.test.ts` (skipped with a message without elk-models or the sweep) logs
`elkt sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k>` (validate adds `standIns=<s>`) for each indicator and fails with the per-model
report. A mismatch outside the deferrals above is a defect to diagnose against the oracle, never a number to
adjust.

## 8. ELK Textual JSON (`.elkj`) {#elk-textual-json-elkj}

Port: `src/graph/json/text` over `src/xtext` and the EMF proxy subset in `src/emf` (internal entry point
`ElkGraphJsonText`: `load`, `validate`, `serialize`; design and runbook in
[elk-json-text.md](architecture/elk-json-text.md)). Evidence is two-tier (D8), as for `.elkt`: the committed JVM
vectors (lexer 554 rows, parse 439, validate 28, write 126, inverse-state 69 cases) and 34 curated entries (15
parse refs, inputs vendored in `test/corpus/elkj-curated/`) run in CI; the sweep below measures the corpus
locally. The pinned elk-models holds no `.elkj`, so the oracle produces them (D2).

**What is compared** (always `ORACLE_REGISTRY=core`, D4; every case in two JVM runs compared byte for byte):

- Tier 1, `tier1-parse-equal` / `tier1-validate-equal`: ELK's own `.elkj` conversion of an elk-models `.elkt` or
  realworld `.json` (the oracle's `convert` mode, `ConvertGraphHandler` steps, identifier seed 1, D12) read by the
  `.elkj` language. Parse is compared as ELK JSON at 1e-6; validate as `IResourceValidator` issues, exactly.
  Where the oracle rejects the file the port must report an error (presence, D6).
- Tier 2, `tier2-parse-equal`: every realworld `.json` and the repo's ELK JSON read as `.elkj` text.
- Writer, `writer-byte-exact`: `ElkGraphJsonText.serialize` against `EcoreUtil.copy` plus
  `serialize(format())`, byte for byte; where the oracle fails the port throws `ElkGraphJsonSerializationError`.
- `reparse-equal`: the port's own text read again gives what the oracle's reparse of its text gave.

**Size-capped selection** (D2 amendment, user 2026-10-16). The oracle's Xtext serializer needs 30 to 1,100
CPU-seconds per graph (9-graph sample: 113 to 678 s each, 57 min single-JVM), so converting and writing all
1,448 graphs twice is days of CPU. Tier 1 and the writer run on every corpus graph of at most 5 KB (345) plus 40
graphs sampled from the 1,103 larger ones in five size bands that double from the cap (11/16/7/4/2 graphs in
[5, 10), [10, 20), [20, 40), [40, 80) and [80, ∞) KB; 6.1 to 207 KB) = 385 graphs; tier 2 runs on all 666 ELK JSON
inputs; determinism is double-run on 30. The first run (graph-json-text T17) sampled only 6 graphs of 5 to 37 KB
(`--sample 6 --sample-max 40000`); the fuller sweep (text-follow-ups T11, follow-up F5) runs `--sample 40` with no
size limit. A full run is a parameter change (`--cap 100000000`).

**Result** (oracle ELK `8aaa3c1` plus patches `0001`, `0002`, elk-models `ac5af2b`; counts equal the
text-follow-ups decision journal, row T11, and the graph-json-text one, row T17):

| Indicator            | Bar     | 40 sampled (2026-10-20) | Exact | Presence / both reject                              | 6 sampled (2026-10-16) | Diffs |
| -------------------- | ------- | ----------------------- | ----- | --------------------------------------------------- | ---------------------- | ----- |
| tier1-parse-equal    | 378/378 | 378/378                 | 144   | 234 (syntax errors; oracle cannot reparse own file) | 344/344 (200 presence) | 0     |
| tier1-validate-equal | 378/378 | 378/378                 | 144   | 234                                                 | 344/344                | 0     |
| tier2-parse-equal    | 666/666 | 666/666                 | 591   | 75 rejected by both                                 | 666/666                | 0     |
| writer-byte-exact    | 385/385 | 385/385                 | 349   | 36 oracle failures matched                          | 351/351 (315 exact)    | 0     |
| reparse-equal        | 349/349 | 349/349                 | 139   | 210                                                 | 315/315                | 0     |
| nondeterministic     | 0       | 0 of 1,482 double runs  |       |                                                     | 0                      |       |

Cost of the fuller sweep: oracle 7 h 34 min wall on 6 serial-GC JVMs at `nice 10` (the convert, write and
tier-2 parse queue; parse 27 s, validate 9 s), with 21.9 h of summed per-graph `convert` time and 21.6 h of
`write` time; the largest sampled graph (207 KB) alone takes 4.5 h to convert and 4.3 h to write. The TS side
runs in 5.7 s. The first run took 2 h 04 min on 8 JVMs, TS side 4.2 s. 7 graphs, all at most 5 KB, fail `convert` in
the oracle (edge sections, a value the grammar cannot convert; the first run also counted 7), hence 7 fewer for
tier 1; 29 more fail `write` (missing or duplicate ids: that path has no id generator), part of the 36 matched
oracle failures. None of the 40 sampled graphs fails. Determinism needed one merge fix: Xtext error messages embed the
output URI, and `ElkjSweep.java` normalises the directory. Largest curated model (712 KB ELK JSON) loads in about
100 ms.

### Accepted divergences {#elkj-divergences}

- **D6, syntax errors, presence only.** The port stops at the first syntax error; ANTLR recovers. The JVM keeps
  recovered edges in 16 syntax rows, and recovered null-valued entries cause its NPE rows (the 5
  null-property-value rows); the port never builds them. A recorded conversion diagnostic that comes from ANTLR
  recovery after a syntax error (`err-syntax-cr-line-number`) is a presence row.
- **Unresolved-reference export** (extends the unknown-endpoint entry under "Behavioural divergences"). The
  `.elkj` exporter hits an unresolved proxy and the oracle throws a message-less `NullPointerException`; the port
  throws a message-less `IllegalArgumentException`, with the single recorded diagnostic left on the resource
  (30 parse rows, 1 curated entry). Linking diagnostics themselves are exact.
- **Converter rows: 5 not replayed.** Closed for the SIGNED_INT/FLOAT/comment/`ANY_OTHER` terminals (follow-up F1,
  text-follow-ups T4 and T8): `DefaultTerminalConverter` and the `EcoreFactoryImpl` datatype arms are ported
  (D6), so 43 of the 45 new `.elkj` rows now replay through the services (78 new rows in all: 33 `.elkt`, 45
  `.elkj`; 76 replay). The skipped set (`UNREPRESENTABLE_ROWS`) is 5 rows, each needing a Java box type a `number`
  cannot carry: `Number.toString(int:1)`, `StringValue.toString(float:2.0)` as in `.elkt`,
  `INT.toString(double:1.5)`, and, by user decision in T8, `FLOAT.toString(float:1.5)` (a `Float` is not `equals`
  the reparsed `Double`) and `FLOAT.toString(int:1)` (an `Integer` prints `1`, which lexes as `SIGNED_INT`).
- **Diagnostic lines versus token lines.** Diagnostics follow Xtext's node model (LF, lone CR, CRLF;
  `InternalNodeModelUtils.computeLineBreaks`); token rows follow ANTLR (LF only). Both languages pass the node-model
  `LineSource` (`.elkt` since text-follow-ups T2, F2, and its property-key lines since vector-cache-and-key-line T1, F7; see section 7). Where Java's `charAt(offset)` would throw at a text-final `\r`, the
  port treats the character as not `\n`.
- **`EObjectValidator` once.** `.elkj` has no registry default, so the registrar's `validator == null` branch
  builds a fresh composite holding one `EObjectValidator`, and each EMF constraint is reported once (code
  `org.eclipse.emf.ecore.14` per map-key collision); `.elkt` reports twice. No `LayoutOptionValidator` runs.
- **Round-trip lossy classes** (281 loadable inputs: 193 equal, 88 in asserted classes, 0 divergences): 34
  quoted unknown keys unwritable, 1 keyword string, 1 list value, 14 bare dotted keys, 4 empty elements written
  `{ "" : }`, 27 unresolved endpoints dropped by the copy (oracle-verified, see below), 1 copy failure, 5 int32 saturation or `-0.0`, 1 bare key that gains
  quotes. Each class is asserted per case in `test/golden/elkj-roundtrip.test.ts`.
- **Round-trip oracle vectors (T16b, 2026-10-18; re-recorded 2026-10-20, text-follow-ups T10).** `test/golden/refs/java/graph-json-text-roundtrip.json` holds
  281 rows from `tools/vectors/ElkjRoundTripVectors.java` (the oracle's loadable set equals the TS round trip's
  281: 16 curated + 265 T3 scenarios). Replay: 244/244 written texts byte-equal (226 reparse exact plus export
  equal, 18 presence), 37/37 error rows (36 serializer `RuntimeException` against
  `ElkGraphJsonSerializationError` by class, message text not comparable because Xtext embeds the object and
  URI; 1 copy failure `IndexOutOfBoundsException: targetIndex=1, size=1` with a byte-equal message) and 27/27
  unresolved-endpoint drops. The claim that the copy drops unresolved endpoints moved from source-derived
  (EMF `Copier.copyReference`) to oracle-verified; the class count is 27, not 28, because `ElkGraphCopy` now
  ports the bidirectional many-valued arm and `sources: ["a","a"]` throws like the JVM (the 28th, now
  `copy-failure`).
- **Lone surrogates reload as written (text-follow-ups T1/T10, F6).** The recorder reloads each written text
  from the `String` (`LazyStringInputStream`, which `XtextResource.createReader` reads through a `StringReader`),
  no longer via `getBytes(UTF_8)`, which turned a lone surrogate into `?`. The 2026-10-20 re-record changed one
  row of 281 (`input-lone-surrogate-escape`: reparse id `\ud800`, was `?`); the replay reloads every text as
  written, with no test-side transport.
- **Oracle conversions mostly do not reparse in the oracle itself.** Its serializer writes bare dotted option
  keys, `null` values, NaN, `4.9E-324` and unescaped quotes, and fails on edge sections and KVectorChain/List
  values; hence the 200 presence rows of `tier1-parse-equal`.
- **Proxy `toString` (text-follow-ups T3, F4; amends elkgraph-model D10).** The generated `toString` arms
  (`if (eIsProxy()) return super.toString();`, 9 `*Impl` classes including `ElkNodeImpl`) print EMF's
  ` (eProxyURI: <uri>)` suffix after the hashless class name; Java also prints `@<identityHash>`, which the
  vector recorder strips (`@<hex>` before `(eProxyURI:`) so the rows compare exactly. Evidence: scenarios
  `proxy-to-string` and `proxy-to-string-edge-with-proxy-source` in `graph.json` (42 scenarios, 674 steps).

No ELK prose typo was corrected in this mission, so nothing is listed under "upstream typos".

**Regenerate.** `tools/oracle/elkj-sweep.sh [--force] [--cap] [--sample] [--sample-max] [--determinism] [--jobs]`
writes `$ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>/` (never in the repo, AD-5), resumable and skipped
when its stamp is fresh; then `npx vitest run test/corpus/elkj-sweep.test.ts` logs
`elkj sweep: <indicator>=<n>/<total> deferred=<d> diffs=<k> nondeterministic=<m>`. A mismatch is a defect to
diagnose against the oracle, never a number to adjust.

## 9. grandom (`.elkr`) {#grandom-elkr}

Port: `src/core/debug/grandom` over a hand-written lexer and parser on `src/xtext` primitives (internal facade
`GRandomText`: `parse`, `validate`; generation through `RandomGraphGenerator`; design and runbook in
[grandom.md](architecture/grandom.md)). Evidence is the committed JVM vectors plus the nine generated corpus files;
there is no sweep (the inputs are small and fully enumerated).

**What is compared.** Vectors are recorded by `tools/vectors/elkr-vectors.sh` into
`test/golden/refs/java/grandom-*.json` (AD-13):

- `grandom-lexer.json`: 433 token rows, all exact.
- `grandom-parse.json`: 142 rows: 77 error-free rows compare the full model dump exactly, 65 syntax-error rows by
  presence (D8 #1); 9 rows carry conversion errors, compared exactly (message, offset, length).
- `grandom-validate.json`: 23 rows: 20 exact, 3 presence-only for the parser syntax issue (their check issues are
  still exact).
- `grandom-generate.json`: 58 seeded rows holding 62 graphs, each compared byte for byte as the JSON export of
  `CaseRunner.export` (`omitLayout(false)`, `omitZeroDimension(false)`, `omitZeroPositions(false)`,
  `omitUnknownLayoutOptions(true)`, `prettyPrint(true)`) plus a trailing newline; 6 unseeded rows holding 7 graphs,
  compared by count invariants only; 12 `RandVal` rows (20 draws each of `val`, `intVal`, `floatVal`), exact.

**Exit (D1).** All nine `test/corpus/generated/*.elkr` regenerate their sibling `.json` byte for byte
(`src/core/debug/grandom/GRandomCorpus.test.ts`), and every vector row above replays. This is the gate D7 of the
conformance corpus set for the generated tier; algorithm goldens never depend on it.

**Unseeded by contract (never compared exactly).** `BlindTextGenerator` edge-label text (a fresh `new Random()` per
call; masked, the 38 to 49 character length bound asserted), `RandomGraphGenerator.sample()` through the
one-argument `Collections.shuffle(list)` (cross-hierarchy edges), and a configuration without `seed`.

**Upstream typos.** None found in the grandom bundle's human-readable text, so nothing is listed under "upstream
typos".

**Regenerate.** `tools/vectors/elkr-vectors.sh <outDir>` (`ELK_VECTORS_CACHE=off` for a cold run) and
`tools/oracle/regen-generated.sh` for the corpus; a differing rerun is a defect to diagnose against the oracle,
never a ref to accept.

## Core layouts (fixed, box, random)

The three core algorithms are proven against the oracle over the corpus retargeted to each of them
(`tools/corpus/ts-layout-compare.ts`; the overlay and export flags are those of `layout-goldens.test.ts`:
`applyOverlay`, `RecursiveGraphLayoutEngine`, `omitLayout(false)`, `omitZeroDimension(false)`,
`omitZeroPositions(false)`, `omitUnknownLayoutOptions(true)`, `prettyPrint(true)`). Nothing from the sweep is
committed (AD-5): the oracle outputs stay under `$ELK_ORACLE_DIR/sweep/`, the summary under a path of your choice.

**Result** (oracle commit `8aaa3c1`, models `ac5af2b`; run A outputs; `random` has 7 extra generated-tier cases):

| Algorithm | Planned | ok  | mismatch | both-throw | ts-only-throw | oracle-only-throw | excluded |
| --------- | ------- | --- | -------- | ---------- | ------------- | ----------------- | -------- |
| `fixed`   | 898     | 687 | 175      | 29         | 7             | 0                 | 0        |
| `box`     | 898     | 710 | 181      | 0          | 7             | 0                 | 0        |
| `random`  | 905     | 388 | 141      | 0          | 4             | 0                 | 372      |

Every one of the 497 `mismatch` cases differs only in `layoutOptions` entries: no coordinate, size, section, bend
point or label differs (NaN included). So the port matches the oracle's geometry on all 2,282 cases that both sides lay
out (`ok` plus `mismatch`); the other 18 throw on the TS side only. Both groups are explained under "Known divergences
found" below and close when the layered bundle and the other algorithm bundles are registered (mission 7h). The 29
`both-throw` cases of `fixed` are the oracle's `IllegalArgumentException` "The edge needs to have exactly one edge
section. Found: 0"; the port throws the same class.

**Wall time** (sum over the cases; one local run on a loaded machine, indicative only). The oracle figure is the
harness's per-case time in a warm JVM (JVM start-up and the second determinism run excluded); the TS figure covers
import, overlay, layout and export of a case (file reads excluded):

| Algorithm | TS (ms) | Oracle (ms) |
| --------- | ------- | ----------- |
| `fixed`   | 4,836   | 4,839       |
| `box`     | 5,447   | 6,077       |
| `random`  | 3,469   | 5,064       |

**Excluded (372 `random` cases).** `random` with the default `randomSeed` (0) is unseeded: the algorithm draws from a
fresh `new Random()`. The retarget overlay seeds only the root (`randomSeed = 1`), so every nested composite stays
unseeded, and the oracle's two JVM runs disagree (`nondeterministic` in the sweep). Those cases cannot be compared and
are not run on the TS side. The 526 settled retarget cases and the 7 generated `random` cases compare normally.

**Reproduce.**

- `tools/oracle/sweep.sh` — the oracle sweep (all algorithms, about 2 minutes, needs the oracle build).
- `npx tsx tools/corpus/ts-layout-compare.ts --out /tmp/core-layouts.json` — the comparison.
- `npx tsx tools/corpus/ts-layout-compare.ts --algorithms box --filter examples/ --out /tmp/box-examples.json` — a
  subset.

The tool reads `$ELK_MODELS_DIR` and the sweep under `$ELK_ORACLE_DIR` (`--sweep-dir` overrides it), prints the counts
and the wall times, writes the per-case findings (first differences) to `--out`, and exits `1` while findings exist.
`optionsOnlyMismatches` in the summary counts the mismatches whose differences are all `layoutOptions` entries.

**Known divergences found.** None is a port defect; the first two are properties of the registry, not of a layout.

- **Short option key `direction` (295 entries, all three algorithms; 62 cases differ in nothing else).** The oracle exports `elk.direction`, the port
  `direction`. `JsonExporter.getShortOptionKey` (`JsonExporter.xtend:451-479`) shortens an id only while the suffix
  resolves to one option; layered's `priority.direction` (`Layered.melk:732`) makes the suffix `direction` ambiguous
  in the oracle's registry (`LayoutMetaDataService.getOptionDataBySuffix` returns `null` for a non-unique suffix,
  `:326-344`), so it writes `elk.direction`. The CoreOptions-only registry has one match. Every difference is the pair
  "missing `elk.direction`, extra `direction`" at the same node (295 pairs, none unpaired). Closes with layered (7h);
  same mechanism as the J10 note under "Temporary gaps".
- **Layout options of unported bundles (435 mismatches, 1,122 entries).** Options the model sets that belong to
  layered, force, mrtree, rectpacking and similar bundles (for example `layering.layerConstraint`,
  `crossingMinimization.strategy`, `edgeLabels.sideSelection`, `nodePlacement.strategy`, `spacing.nodeNodeBetweenLayers`,
  `desiredEdgeLength`) are written by the oracle and omitted by the port: `omitUnknownLayoutOptions(true)` drops options
  absent from the registry. All 43 distinct missing keys other than `elk.direction` resolve to no option in the port's
  registry (`getOptionDataBySuffix` returns `null`); no `value` or `type` difference exists. Closes as the bundles are
  registered.
- **TS-only throws (18 cases: 7 `fixed`, 7 `box`, 4 `random`).** All are
  `UnsupportedConfigurationException: Unable to load default layout algorithm org.eclipse.elk.layered for unconfigured
node ...` on the models `examples/edges/insideSelfLoops`, `tickets/core/562_insideSelfLoopAlgorithmResolving`,
  `tickets/layered/273_insideSelfLoopsWithLabels` and `tickets/layered/548_NPEWithInsideSelfLoops`. A childless node
  with inside self loops enters the algorithm resolver (`RecursiveGraphLayoutEngine.java:148-151`, ported at
  `RecursiveGraphLayoutEngine.ts:140-144`); the retarget overlay sets the algorithm only on nodes with children, so that
  node resolves to the default `layered`, which the oracle has and the port does not yet. Closes with layered (7h).
- **Bare `NaN` in `fixed` outputs.** 261 `fixed` oracle outputs (and 5 `box`/`random`) contain bare `NaN`, not valid JSON
  (Gson is lenient); the tool reads them with a `NaN`/`Infinity` tolerant parser and the port produces the same values.
  Mechanism: `ElkUtil.resizeNode` (`ElkUtil.java:257-306`) computes `heightRatio = newSize.y / oldSize.y`; the
  retargeted hierarchical models have a parent of size 0 x 0, the ratio is `Infinity` or `NaN`, and a west or east port
  without fixed port constraints gets `y = y * ratio`, so `0 * Infinity = NaN`. The port reproduces it
  (`ElkUtilSizing.ts:98-119,193`).
- **Last-ulp `Math.*` differences.** None found in these cases (every coordinate is within 1e-6).

**Upstream quirks of `core` kept (mission 5).** Each is read from the Java and reproduced; all are "kept: upstream
behaviour". Detail: [core-engine.md](architecture/core-engine.md).

- `TestController.removeLayoutExecutionListener` adds the listener instead of removing it
  (`TestController.java:180-182`).
- `FixedLayoutProvider` and `RandomLayoutProvider` call `sections.remove()` without `next()`, so an edge with more than
  one section throws `IllegalStateException`.
- `RandomLayoutProvider` reads the edge target from `getSources().get(0)` (`:167`), so every edge is treated as a
  self-edge; it adds the port parent's x twice (`:159-160`, `:175-176`) and offsets y by `padding.getLeft()` (`:113`).
- `ElkUtil.determineJunctionPoints` checks the main edge's section count inside the loop over the other edges
  (`ElkUtil.java:537-541`), so an other edge without sections throws `IndexOutOfBoundsException`, never the
  documented `IllegalArgumentException`.

**Update 2026-11-13 (roadmap row 9).** After every provider is registered, the same comparison over the oracle sweep of that
date (18,930 cases; see [TS corpus sweep](#ts-corpus-sweep)) gives `fixed` 869 `ok` and 29 `both-throw` of 898, `box` 898 `ok`
of 898, and `random` 534 `ok` and 372 `excluded` of 906. All three have 0 `mismatch`, 0 options-only mismatches and 0
`ts-only-throw`, so the 497 options-only mismatches and the 18 TS-only throws reported above have closed, as the section
predicted for the registration of the layered and the other algorithm bundles.

## Core remainder (mission 5b) {#core-remainder}

Mission 5b completed the `core` bundle (R1). Its evidence is JUnit ports, JVM vectors and oracle scenarios; there is
no corpus sweep, because nothing in 5b lays out a graph on its own.

**Evidence.**

- The JUnit ports are green: `LayoutConfiguratorTest`, `SpacingConfigurationTest`, `AlgorithmAssemblerTest`,
  `LayoutProcessorConfigurationTest`, `BezierSplineTest`, `CubicSplineInterpolatorTest` and the full `ElkMathTest`,
  including its 4 rectangle cases. The `.elkt` harness uses `LayoutConfigurator` (T12), and both golden sets
  regenerate byte-identical.
- Comments (R6): `tools/vectors/comment-vectors.sh` records 18 tie-free `CommentAttacher` scenarios in
  `test/golden/refs/java/comments.json` (best-minus-second margin 0.14 to 1.0, each run twice by the recorder). All 18
  replay equal as sorted `[commentId, targetId]` sets (R6 asked for about 10). `NodeReferenceMatcher` builds all 5,044
  `regex.json` pattern strings and flags exactly.
- JDK shims: `awt.json` (2,842 rows), `regex.json` (5,044), `character.json`, `regex-boundary.json` and
  `stream-sum.json` (1,035) replay with no row skipped. Recording is byte-stable (re-recorded by the orchestrator;
  the earlier vector files are unchanged).

**Known divergences found.** None numeric. The two behavioural differences below are open by design.

- `WrappedException(cause)` uses `String(cause)` as its message (`Name: message`); Java prints the qualified class
  name. Nothing branches on it (T1).
- `ElkGraphDataProvider(null)` and the other `Objects.requireNonNull` sites throw `TypeError` where Java throws
  `NullPointerException`; the Javadoc of `ElkGraphDataProvider` says `IllegalArgumentException`, the code does not (T13,
  T15).

Upstream prose typos corrected in this mission: none found.

### Upstream quirks kept (mission 5b) {#core-remainder-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour".

- `ElkSpacings.DOUBLE_EQ_EPSILON` is `10e-5` (that is `1e-4`) and the method is spelled `getDependendSpacingOptions`
  (identifier, kept verbatim) (T7).
- `ElkSpacings.ELK_OPTION_TARGET_FILTER` tests `property instanceof ElkGraphElement` (the property, never an element),
  so it accepts every option and never delegates to `LayoutConfigurator.OPTION_TARGET_FILTER`. `build()` with
  overwrite off pushes a `NO_OVERWRITE_HOLDER` onto the filter list on every call (T7).
- `IDataProvider.cached()`: the first `provideTargetsFor` call returns the uncached collection and later calls the
  multimap's set; an empty result never becomes a key, so it is recomputed every call (T13).
  `IBoundsProvider.cached()` checks `has()` first, so null results are cached.
- `Triple` and `Quadruple` `equals` cast without checking the type: a non-instance throws `ClassCastException`; their
  `hashCode` is the `Arrays.hashCode` formula (T1).
- `NodeReferenceMatcher.fuzzyRegexpFor`/`strictRegexpFor` size their buffers from the untrimmed target name
  (`targetName.length() * 2`) while reading the trimmed name (`NodeReferenceMatcher.java:337-339`); the port drops
  the capacity argument, which has no observable effect (T19).
- `DistanceMatcher.distance`: a comment touching the target's right edge with partial vertical overlap returns -1
  (the `else if` after the horizontal-overlap branch is never reached); the left side adds the comment width
  (left 110 vs gap 50) (T15).
- `CubicSplineInterpolator` closed splines: `even` selects `INTERP_COEF_ODD` (`CubicSplineInterpolator.java:82`) (T11).
- EMF `AbstractTreeIterator.hasAnyChildren()` shadows `nextPruneIterator` with a local, so pruning before the first
  `next()` with `includeRoot=false` has no effect (T18).
- `ElkMath.binomiall`'s `n == 0` branch is unreachable (the `k == 0` test matches first); `maxl()`/`minl()` start from
  `Integer.MIN_VALUE`/`MAX_VALUE` (T3).
- Matcher results in `CommentAttacher` are keyed by matcher class, so two matchers of one class overwrite each other;
  with explicit attachments and keep-heuristics off, `edgeify` drops every heuristic attachment (T14, T16).
- JDK 21 `\b` treats a combining mark after a word character as word, beyond its Javadoc definition; the port replays
  the recorded table (`regex-boundary.json`, T9). The JDK `\b` never matches before a non-ASCII leading letter.

## alg.common, part a (mission 6a) {#alg-common}

Mission 6a ported `alg.common` except `nodespacing/**` and `NodeMicroLayout` (AC1; design and runbook in
[alg-common.md](architecture/alg-common.md)). Its evidence is four JUnit ports, a new oracle recorder
(`tools/vectors/alg-common-vectors.sh`, AC3) for the packages without Java tests, and the vendored ticket model of
`Issue475Test`. No corpus sweep applies: nothing in 6a lays out a graph on its own.

**Evidence.**

- The JUnit ports are green: `RectilinearConvexHullTest` (T8), `NetworkSimplexTest` (T7), `OneDimensionalCompactorTest`
  (17 of 17, T9) and `Issue475Test` (T5).
- `test/golden/refs/java/alg-common.json` (234,053 bytes, seeds 7001, 7101, 7201, 7301, 7401; recorded twice,
  byte-identical, every scenario also run twice inside the recording). Every scenario replays exactly:

| Section         | Rows | Replayed equal | Notes                                                                                |
| --------------- | ---- | -------------- | ------------------------------------------------------------------------------------ |
| `triangulation` | 22   | 22             | edge iteration order and both cost trees, incl. the all-ties `constant` cost (V6-V8) |
| `polyomino`     | 108  | 108            | 3 rows expect `IndexOutOfBoundsException` and the port throws it                     |
| `overlaps`      | 34   | 34             | includes 8 deterministic `tie-*` rows                                                |
| `spore`         | 18   | 18             | 8 scanline, 10 depth-first compaction                                                |

- `Issue475Test` runs the vendored `tickets/core/475_fixedLayoutWithLongLabels.elkt` (elk-models `ac5af2ba`, SHA-256 row
  in `test/golden/inputs/manifest.json`); `TICKET_INPUTS` in `test/golden/algorithm-refs.test.ts` lists four ticket
  models (AC5, an AD-13 change approved by the user).
- Landed vectors, goldens and corpus are unchanged: `git diff --name-status main -- test/golden/refs/ test/corpus/` shows
  only the added `refs/java/alg-common.json`.

**Known divergences found.** None numeric. The differences below are open by design.

- **No debug file output (AC4).** `SVGImage.save`/`isave` (`SVGImage.java:252-301`), the `DebugUtil` writer and
  `NGraph.writeDebugGraph` keep their logic and write nothing, because `src/` is browser-safe. Every `/*d*/` call stays,
  because some compute values (`BowyerWatsonTriangulation.java:101-102`).
- **Iterative traversals (AC6).** `NetworkSimplex.tightTreeDFS` and `postorderTraversal` are explicit-stack loops; the
  behaviour is identical and proven against a verbatim recursive reference (`NetworkSimplexTree.test.ts`).
- **Exception class where Java dereferences null.** `SVGImage.addElementStr` after `removeGroup` of the current group:
  `IllegalStateException` (Java NPE; T2). Disconnected input to `NetworkSimplex` (`feasibleTree`): `TypeError` (Java
  NPE; T7). A null quadrant or `xMin` in `RectilinearConvexHull` and a null `lastX` in its event handler:
  `IllegalStateException` or `TypeError` (T8). Each site is unreachable from valid input; only an invalid input or a use after removal reaches it.
- **`CNode.toString`** without a delegate prints the shim's identity hash, which differs from the JVM's (debug only; T9).
- **`assert false` defaults** in `RectangleStripOverlapRemover` (`importRectangle`) were commented `default` arms
  (T10); since issue #45 they are `devAssert` calls (translation rules 6.8).
- **Prose typos corrected:** none found in this mission.

### Upstream quirks kept (mission 6a) {#alg-common-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour".

- `PlanarGrid.weaklyIntersectsArea` is not bounds tolerant, so `PolyominoCompactor.packPolyominoes` throws
  `IndexOutOfBoundsException` when an extension leaves the grid (3 of 108 recorded rows, aspect ratio 2.5; T4, T12).
- `RectangleStripOverlapRemover.computeOverlaps` keeps a `TreeSet` ordered by right border, so a rectangle with an equal
  right border is dropped from the scanline set; `exportRectangle` for `DOWN` adds `startCoordinate` to a `y` the
  strategy already wrote on the same rectangle. The `tie-*` rows pin both (T10).
- `exportRectangle(node, stripSize)` keeps its unused `stripSize` parameter (T10).
- `QuadraticConstraintCalculation` clears every node's constraints first (`QuadraticConstraintCalculation.java:30-32`),
  so only the scanline algorithm keeps predefined constraints (T9).
- `ScanlineConstraintCalculator.insert` reports an overlap on `System.err`, but `floor`/`ceiling` right after `add` return
  the node itself, so the message never fires (T9).
- `TwoBitGrid` words are Java `long` (cell 31's weak bit is the sign bit); reads past the width inside the last word
  return 0 while writes throw (T6).
- `NGraph.makeConnected` and `isAcyclic` overwrite `NNode.internalId` with the position in `nodes` (T3).
- `NetworkSimplex` guards a cut-value array with `cutvalue == null`; Java-null arrays are empty arrays here, so the test
  folds into the length check and the reuse `else` is unreachable but kept (T7).
- `PolyominoCompactor` compares polyominoes with `equals`, which is identity (no override in Java) (T12).
- `ElkMath.distance` traces rays of length `|v|`, so a vector shorter than the gap returns Infinity; spore callers pass a
  vector scaled to the underlap (T11).
- `UniqueTriple` declares no `equals`/`hashCode` (identity) but nothing hashes it (T6, T12).

### Deferred JUnit files (P5) {#alg-common-deferred}

Four of the eight `alg.common.test` files need algorithms that are not ported. Each is ported unchanged when its
algorithm exists.

- `InsidePortLabelTest`: needs layered; closed by mission 7a.
- `NextToPortLabelPlacementTest`: needs layered; closed by mission 7a.
- `PortLabelPlacementVariantsTest`: needs layered; closed by mission 7a.
- `NodeMicroLayoutTest`: needs layered, force, stress, mrtree, radial and rectpacking; closed by mission 8x. Update after
  mission 8a: layered, mrtree and radial are ported; it still needs force, stress and rectpacking (8x).

## alg.common, part b: nodespacing (mission 6b) {#alg-common-nodespacing}

Mission 6b ported `nodespacing/**` and `NodeMicroLayout`, which closes `alg.common` (design and runbook in
[alg-common.md](architecture/alg-common.md#nodespacing)). The package has no runnable Java tests: its 4 JUnit files
need layered (P5, [deferred](#alg-common-deferred)). The evidence is therefore an oracle sweep of `NodeMicroLayout`
(AC2, refined by NS1-NS6 in `plans/alg-common-nodespacing/decisions.md`): a new recorder,
`tools/vectors/node-micro-layout-vectors.sh`, stores each prepared input graph as ELK JSON inside the vector row (NS1),
and TS replays it through `ElkGraphJson` and the ported `NodeMicroLayout`, bottom-up over every node with children
(NS3). No model is vendored.

**Evidence.**

- `test/golden/refs/java/node-micro-layout.json` (1,118,635 bytes; JDK 21.0.1; oracle `8aaa3c14`): recorded twice,
  byte-identical, and every row built twice inside one recording. Each row's re-imported input gives the same output as
  the prepared original (the NS1 round-trip check). Every row replays within 1e-6 on the first run
  (`src/alg/common/NodeMicroLayoutVectors.test.ts`); identifiers, element counts and exceptions match exactly.

| Group      | Rows | Replayed equal | Source and configuration                                                                                                           |
| ---------- | ---- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `corpus`   | 16   | 16             | the 8 `tests/core/{node_size,label_placement}` models of elk-models `ac5af2ba`, as written; each `raw` and `sized`                 |
| `curated`  | 70   | 70             | the 31 `test/corpus/elkt-curated` models and the 4 vendored `tickets/core` models, as written; each `raw` and `sized`              |
| `variants` | 4    | 4              | `port_labels/variants.elkt` with `PORT_SIDE` on every port: `west`, `east` (the upstream providers) plus `north`, `south` (below)  |
| `sweep`    | 236  | 236            | synthetic node, 11 factors covered pairwise (`Random(6101)`); rows 233-235 each add one rejected placement and expect an exception |

- 23 rows expect an exception and the port throws it with the Java class name and message: 20 `IllegalArgumentException`
  ("Label and node size calculator can only be used with ports that have port sides assigned.": 10 models whose
  `.elkt` ports declare no `port.side`, `raw` and `sized` each) and 3 `UnsupportedConfigurationException` ("Invalid
  port label placement: [OUTSIDE, INSIDE]", "… [OUTSIDE, INSIDE, ALWAYS_SAME_SIDE, SPACE_EFFICIENT]", "Invalid node
  label placement: [H_CENTER, INSIDE, OUTSIDE]"; the sets print in enum-ordinal order).
- **Label sizes (NS4).** The JUnit framework sizes labels with AWT font metrics (`TestConfiguration.computeLabelSize`),
  which depend on the platform, so they cannot serve as an oracle. In `sized` rows every label with text and a 0×0
  size gets `width = 6.5 * text.length()` (UTF-16 code units) and `height = 13.0`; explicit sizes are kept. `raw` rows
  keep the sizes as written, so both the empty-label and the sized paths are recorded.
- **`variants` NORTH and SOUTH.** `PortLabelPlacementVariantsTest` only activates the WEST and EAST providers upstream
  (the other two are commented out). The oracle records all four; the NORTH and SOUTH rows complete without an
  exception and replay exactly, so the port covers configurations the upstream test does not run.
- Landed vectors, goldens and corpus are unchanged: `git diff --name-status main -- test/golden/refs/ test/corpus/
test/golden/inputs/` shows only the added `refs/java/node-micro-layout.json`.

**Known divergences found.** None numeric. The differences below are open by design.

- **Exception class where Java dereferences null.** `LabelCell.setHorizontalAlignment/setVerticalAlignment(null)`:
  `TypeError` with the Java `Objects.requireNonNull` message (T2). Fields Java leaves null until the algorithm sets
  them (`NodeContext.insideNodeLabelContainer`, `insidePortLabelCells.get(side)`, `PortContext.portLabelCell`) are
  non-null-asserted; calling a calculator before its cells exist throws `TypeError` where Java throws NPE (T3-T5). A
  `LabelCell` built from `NodeLabelLocation.UNDEFINED` would NPE in Java's `switch(null)` and leaves the coordinate at 0
  here; unreachable, because `NodeLabelCellCreator.java:80` returns first (T2). Each site is unreachable from
  `NodeMicroLayout`.
- **`assert` sites (NS5).** `PortLabelPlacementCalculator.java:208` is a `devAssert` call since issue #45
  (translation rules 6.8), `NodeContext.java:277` and `HorizontalPortPlacementSizeCalculator.java:212` since issue
  #127. A unit test and nine `adapters` sweep rows drive those two on purpose, where the Java asserts fire under `-ea`
  too (issue #113); they run that step with assertions off, and a second test pins the `AssertionError`.
- **Prose typos corrected:** none found in this mission.

**AD-13 re-derivation (mission 6c).** Five 6b unit tests had their hand-derived expectations corrected after a first
failure, and T4 wrote its port placement code before its tests. Mission 6c re-derived each site from the oracle. A
targeted recorder, `tools/vectors/nodespacing-site-vectors.sh` (`NodespacingSiteVectors.java`), rebuilds each scenario
by hand in Java with the same fixture and direct calls. It writes `test/golden/refs/java/nodespacing-sites.json`: 23
rows, JDK 21.0.1, oracle `8aaa3c14`. Each row stores its input graph as ELK JSON, plus `steps` for the in-memory
mutations ELK JSON cannot carry. `PortPlacementCalculator.PORT_RATIO_OR_POSITION` is one such mutation: no metadata
provider registers it, so the JSON importer drops it. The recorder output is byte-stable, and each re-imported input
plus its steps reproduces the hand-built result. `src/alg/common/nodespacing/NodespacingSiteVectors.test.ts` replays
every row within 1e-6 on the first run, with no `src/` divergence.

| Site                  | Rows | Outcome                                                                                                                                                                                               |
| --------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `labelLocation`       | 2    | 6b T2 flag. The original input `{OUTSIDE, V_TOP, H_LEFT, H_PRIORITY}` is OUT_L_T's own set: restored as its own case asserting `OUT_L_T`; `UNDEFINED` case kept                                       |
| `applyStuff`          | 1    | 6b T3 flag. Port order `[[10,20],[11,21]]` confirmed (NORTH sorts before WEST, `NodeContext.java:250-252`)                                                                                            |
| `fixedRatioMargins`   | 2    | 6b T4 flag. 3-port case confirmed; the original 2-port case is restored and asserts `[[0,0],[0,0]]`, size 24 (`spaceEfficientPortLabels`, `HorizontalPortPlacementSizeCalculator.java:276-277, :305`) |
| `sidelessPortMargins` | 1    | 6b T5 flag. Right margin 104 confirmed (port-edge label processed twice, `NodeMarginCalculator.java:205, :212`)                                                                                       |
| `insideLabels`        | 1    | 6b T6 flag. `[5,5]` and `[27,19]` confirmed (`ContainerCell.java:92-96`: a zero-content cell has height 0 despite padding)                                                                            |
| `allConstraints`      | 1    | 6b T6 flag. `[100,79]` and south `[79,0]` confirmed (same rule)                                                                                                                                       |
| `collapsedContainers` | 1    | 6b T6 flag. Collapsed containers and label positions confirmed (`CellSystemConfigurator.java:97-106` clears the overhanging cells' contribution)                                                      |
| `t4`                  | 14   | 6b T4 "implementation first": the 13 T4 test scenarios whose branches the 326-row replay never reaches, plus the `minSizeRequiredToRespectSpacing` tolerance cases; all confirmed                     |

Every corrected 6b value equals the oracle, and the only original value the oracle contradicts is the 2-port margin
case, which rested on an invalid premise. The `t4` scenarios exist because no `node-micro-layout.json` row sets a port
alignment. As a result, the replay alone never reaches the BEGIN/END/JUSTIFIED arms, border offsets on north and south
ports, `FIXED_RATIO` with surrounding margins, or the next-to-port and fixed label margin arms. The scenario table is in
`plans/ad13-rederivation/t4-unreached.md`. Landed vectors, goldens and corpus are unchanged; only
`refs/java/nodespacing-sites.json` was added.

### Upstream quirks kept (mission 6b) {#alg-common-nodespacing-quirks}

Each is read from the Java, reproduced, and pinned by a unit test and the oracle replay; all are "kept: upstream
behaviour".

- `NodeMicroLayout` throws `IllegalArgumentException` on any port without a side (`PortContextCreator.java:50`), so
  `.elkt` models that leave sides unassigned (layered normally assigns them) are recorded and replayed as throws (T1,
  T3).
- `NodeContext.portContexts` is a `TreeMultimap` whose value comparator reads only `getVolatileId()`
  (`NodeContext.java:257-282`): two contexts on one side with equal ids collapse to one. `PortContextCreator` assigns
  unique ids `0..n-1`, so the collapse is reachable only by inserting contexts directly (T3).
- `GridContainerCell.applyWidthToColumn` (non-tabular) loops over all rows, so the END row pass overwrites every
  column's x and width; tabular mode shares one `colWidths` array across its three row passes and adds the gaps into it
  each time (T2).
- `ContainerCell.minWidthOfCell`/`minHeightOfCell` return 0 for an `AtomicCell` with zero content size even when its
  padding is non-zero, while `StripContainerCell`'s cross-axis minimum counts the padding (T2, T6).
- `CellSystemConfigurator.java:118-119` sets `nodeContainerMiddleRow.setContributesToMinimumHeight(true)` twice and
  never the width flag; with `MINIMUM_SIZE` plus `MINIMUM_SIZE_ACCOUNTS_FOR_PADDING` alone the node width comes out 0
  (T6).
- With `OUTSIDE_NODE_LABELS_OVERHANG`, the outside label containers stop contributing on both axes, so N/S containers
  have height 0 and E/W containers width 0 and the labels are laid out in zero-size containers (T6).
- `setupPortMargins` treats a side with exactly 2 ports as space-efficient
  (`HorizontalPortPlacementSizeCalculator.java:276-277`) and also zeroes the first port's inner margin when its labels
  are not next to it (`:305`) (T4).
- One free, non-overhanging port whose space is too small falls back to CENTER and divides by `size() - 1 = 0`; the
  resulting −Infinity spacing is never read for a single port (`PortPlacementCalculator.java:110-209`) (T4).
- `constrainedOutsidePortLabelPlacement` calls `withGap(portLabelSpacingVertical, portLabelSpacingHorizontal)`, swapped
  relative to the inside variant (`PortLabelPlacementCalculator.java:459` vs `:250`) (T5).
- In simple outside placement a port without labels is skipped before `placeFirstPortDifferently` is reset
  (`:371-374`, `:437`), so the flag carries over to the next labelled port (T5).
- `ElkNodeAdapter.getOutgoingEdges/getIncomingEdges` include edges attached to the node's ports
  (`ElkGraphAdapters.java:303-311`), so `NodeMarginCalculator` processes a port edge's head/tail label twice: once
  relative to the port, once as a node edge (T5).
- `JsonExporter` writes a label `id` only when it is non-empty, so unnamed labels round-trip with a null identifier;
  the vectors record `null` and the replay compares it exactly (T1, T7).

## alg.layered, part a: the framework (mission 7a) {#alg-layered-framework}

Mission 7a ported the framework of `org.eclipse.elk.alg.layered` that the sub-missions 7b–7h build on: the options
package (32 enums, `InternalProperties`, `Spacings`, `LayeredSpacings`, the generated `LayeredOptions` and
`LayeredMetaDataProvider`), the LGraph model (13 classes), the ElkGraph ↔ LGraph transform, `LayeredLayoutProvider`,
`LayeredPhases`, `IHierarchyAwareLayoutProcessor` and `ComponentOrderingStrategy` (design, staged-class lifecycle and
runbook in [alg-layered.md](architecture/alg-layered.md)). No layout runs yet: `ElkLayered` and eight other forward
references are **staged** (`test/architecture/staged-classes.json`, L1) and throw `UnsupportedOperationException`
naming the mission that completes them (state at 7a; every staged class is ported since and the list is `[]` after 7h). Decisions: `plans/layered-framework/decisions.md` (L1–L7, S1–S4, X1–X7).

**Evidence.**

- `test/golden/refs/java/layered-framework.json` (2,654,156 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-framework-vectors.sh`): 272 rows, recorded twice byte-identical, every row built twice inside
  one recording, every ELK JSON `input` re-imported and compared with the directly built scenario. Replayed at the AD-4
  bar on the first run (numbers within 1e-6; ids, counts, enums, properties, exception class and message exact).

| Group       | Rows | Replayed equal | Source and configuration                                                                                                                                                                                                                                                                                                                         |
| ----------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transform` | 129  | 129            | 31 `elkt-curated`, 4 `tickets/core` and 9 realworld models as written, 18 `#include-children` variants, a pairwise sweep over 7 synthetic shapes and the importer/transferrer options; 12 rows expect an exception (8 `UnsupportedGraphException`, 4 `IllegalArgumentException`)                                                                 |
| `adapters`  | 142  | 142            | the same models with NS4 label sizes plus a pairwise sweep over port alignment (BEGIN 46, END 57, JUSTIFIED 47 rows), N/S and E/W `PORT_BORDER_OFFSET` (32), port and node size constraints, padding, label placements; nodes placed in one layer first (X4); 9 rows expect the "ports that have port sides assigned" `IllegalArgumentException` |
| `metadata`  | 1    | 1              | the `LayoutMetaDataService` state with core, labels and layered registered (449 layered calls equal `metadata.json`)                                                                                                                                                                                                                             |

- `test/golden/refs/java/layered-sites.json` (2,286 KB + 5 rows; recorder `tools/vectors/layered-site-vectors.sh`,
  JDK 21.0.1, oracle `8aaa3c14`): 330 rows in 22 scenario groups, one per group of branches the three replays leave
  untaken (`plans/layered-framework/unreached.md`, L4 under the user's literal reading X5/X6), every scenario built and
  run through the recorder's own step interpreter (146 ops) so the TS replay is exact by construction; 128 rows carry
  an ELK JSON `input` that is re-imported and compared; embedded ELK JSON maps Gson's bare non-finite doubles to the
  strings `"Infinity"`/`"-Infinity"`/`"NaN"` so the file is strict JSON (one row, `transform/misc/undefined-port-side-zero-size-graph`,
  has one). `LayeredSiteVectors.test.ts` replays all 330 rows (T11a); 330 colocated cases cite a row id (T11b–T11d).
- Per-class branch coverage after T11: 100 % for every non-staged 7a class except seven whose remainder is
  Java-unreachable or 7f-bound (`unreached.md` § Amendments); whole suite 99.25 / 97.34 / 99.0 / 99.26.
- Landed vectors, goldens and corpus are unchanged: `git diff --name-status main -- test/golden/refs/ test/corpus/
test/golden/inputs/` shows only the two added `refs/java/layered-*.json`.

**AD-10 sites.** `ElkGraphImporter.java:85` `nodeAndPortMap` (identity keys; insertion-ordered `Map`, never
iterated), `:239`/`:318` `HashSet<Integer>` (only `size()` read); `Tarjan.java:36` `HashMap<LNode,Integer>` and `:78`
per-SCC `HashSet<LNode>` (insertion order; a 7b replay mismatch traced to either is that mission's stop). No
`JavaHashMap` site.

**Divergences found during the mission, fixed at origin.** The first `adapters` recording was vacuous (nodes were
layerless, `LGraphAdapter.getNodes()` walks layers only): recorder and replay now layer the nodes first and the file
was re-recorded once (X4). The port-side view proxy returned `undefined`/`UnsupportedOperationException` where
`ArrayList.SubList.get/set` throw `IndexOutOfBoundsException` (X7; two T3 cases re-anchored to the oracle row).

**Known divergences found.** None numeric. Open by design:

- **Exception class where Java dereferences null** (D10, AD-16b): `LPort.setSide(null)` and the
  `insideSelfLoops/hierarchical-host-without-include-children` import throw `TypeError` where Java throws
  `NullPointerException`; the JDK 21 helpful-NPE message is not reproduced. The site replay compares those rows by
  class only and every other exception by class and message.
- **`assert` sites:** `ElkGraphImporter.java:205, 620-621, 789` are `devAssert` calls since issue #45
  (translation rules 6.8), `LNode.setGraph` and `LGraphUtil.createExternalPortDummy` ×2 since issue #127. Two unit tests
  and four site vectors drive those three on purpose, where the Java asserts fire under `-ea` too (issue #113); they
  run that step with assertions off, and a second test pins the `AssertionError`.
- **TS-only surface:** `isHierarchyAwareLayoutProcessor`'s null/primitive guards (the brand stands in for `instanceof`);
  the `getPortSideView` proxy's membership-by-index trap.
- **Staged boundary:** `LayeredLayoutProvider.layout` reaches `ElkLayered.doLayout`/`doCompoundLayout`, which throw
  naming 7f; the `isCanceled` arm after them is unreachable until then (X6). The oracle's layout output for the four
  `site/provider/*` rows is recorded for 7f to replay.
- **Prose typos corrected:** none found in this mission.

## alg.layered, part b: cycles and layers (mission 7b) {#alg-layered-phases}

Mission 7b ported the eleven cycle breakers (`p1cycles`), the nine layerers (`p2layers`), `IntermediateProcessorStrategy`
and the ten intermediate processors the two phases need (design, idioms and runbook in
[alg-layered.md § 8](architecture/alg-layered.md#part-b)). The pipeline still does not run (`ElkLayered` and
`GraphConfigurator` are 7f); every phase is proven by replaying what the oracle's pipeline recorded. Decisions:
`plans/layered-cycles-layers/decisions.md` (SC1–SC4, B1–B10, E1–E2a).

**Evidence.**

- `test/golden/refs/java/layered-phases.json` (1,958,962 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-phase-vectors.sh`, JVM flag `-XX:hashCode=2`): 651 rows, byte-stable; `models` 534 (the nine
  vendored ptolemy models at every hierarchy level and twelve `.elkt` models vendored from elk-models, run through the
  real Java pipeline to a P1 strategy, a P2 strategy or a 7b processor, the processor `prefix` recorded), `scenarios` 80
  (the Java tests' hand-built graphs as step rows, 10 of them pipeline rows), `sites` 37 (one step row per T9 branch
  scenario). `LayeredPhaseVectors.test.ts` replays all 651 at the AD-4 bar; the 81 step rows under ten nodes also match
  the full 7a dump.
- Eight JUnit invariant tests ported verbatim over the replayed graphs of their Java configurations.
- Breadth sweep (B6, gitignored): 32,652 oracle cases over all 550 ptolemy models and every strategy
  (30,074 ok, 1,983 refused, 595 timeout, 0 throws); the port's canonical phase-dump hash equals the oracle's for every
  ok case (stride 1).
- 40 anchored unit cases cite a site row (`// oracle: <row id>; <Java file:line>`); after them every 7b class is at 100 % branches except fourteen whose remainder is Java-unreachable or 7f-bound (`plans/layered-cycles-layers/unreached.md`, with the T11 and T12 corrections); whole-suite coverage 99.18 / 97.11 / 98.99 / 99.19.
- Landed vectors, goldens and corpus are unchanged: the refs diff against `main` is the new `layered-phases.json`,
  the twelve vendored `.elkt` inputs and their manifest rows.

**AD-10 sites.** `BFSNodeOrderCycleBreaker.java:121` iterates a `HashSet<LNode>` of sources: the port iterates in
insertion order and the oracle was recorded with a constant identity hash, which keeps `HashSet` insertion order only up
to ten entries, so the recorder refuses BFS rows with more sources. `NodePromotion`'s `BiLinkedHashMultiMap` and
`Tarjan`'s containers are insertion-ordered as in 7a.

**Divergences found during the mission, fixed at origin.** The replay helper set a row's options on the root rather
than the imported level (T3, found by T8's non-root rows). Three boxed-`Integer` reference comparisons had been ported
as value equality under decision E2; T8 and T10 showed the Java result depends on the `Integer.valueOf` cache
(`NodePromotion.java:541` never terminates otherwise; `Tarjan.java:86` finds components the Java does not), so the
four sites — the two above, `CoffmanGrahamLayerer.java:244`, `SCCNodeTypeCycleBreaker.java:80,88` — compare through
`JavaInteger.sameValueOfBox` (E2a; the 7a `Tarjan` fix is this mission's).

**Known divergences found.** None numeric. Open by design:

- **Components flag (B3):** every row runs with `SEPARATE_CONNECTED_COMPONENTS=false` because `ComponentsProcessor` is
  7h; 7f re-runs the rows under the default.
- **No `DefaultConfiguration` sizing (B5):** the Java test runner's node sizing is not reproduced; models are replayed
  with their own sizes.
- **`Integer` cache assumption:** `sameValueOfBox` assumes the JDK default `IntegerCache.high` (127), which the oracle
  runs with; a JVM started with `-XX:AutoBoxCacheMax` would behave differently.
- **Faithful non-termination:** `StretchWidthLayerer` never terminates on a zero-height normal node or a self-loop; the
  SCC cycle breakers never pop a component rooted at DFS index 128 or more (`Tarjan.java:86`), and
  `SCCModelOrderCycleBreaker` then loops. The sweep records those cases as `timeout` and the replay skips them.
  Candidate upstream reports.
- **Invariants the Java violates on its own output:** `testEdgesPointTowardsNextLayers` fails on the recorded
  left-to-right model-order promotion of a graph with external port dummies, and on BF/DF model-order layerings; the
  Java tests never run those configurations, so the ported invariant tests do not either (the rows still replay).
- **Sweep scope:** INTERACTIVE cases replay the models with the positions they carry on disk; the Java tests' seeded
  positions are not reproduced.
- **Label dummies:** 43 branches of the 7b classes need `LabelDummyInserter` (7f) and are measured there.
- **Prose typos corrected:** none found in this mission.

## alg.layered, part c: crossing minimization (mission 7c) {#alg-layered-ordering}

Mission 7c ported the third phase (`p3order` and `p3order.counting`), the eight intermediate processors a default
pipeline runs between P2 and P3 with their greedy-switch and preserve-order packages, and the ten
`IntermediateProcessorStrategy` arms that create them (design, idioms and runbook in
[alg-layered.md § 9](architecture/alg-layered.md#part-c)). The pipeline still does not run (`ElkLayered` and
`GraphConfigurator` are 7f); every class is proven by replaying what the oracle's pipeline recorded at the P3 stop.
Decisions: `plans/layered-crossing-min/decisions.md` (C1–C13).

**Evidence.**

- `test/golden/refs/java/layered-order.json` (3,761,948 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-order-vectors.sh`, JVM flag `-XX:hashCode=2`): 808 rows, byte-stable; `models` 657 (the nine
  vendored ptolemy models at every hierarchy level and 24 `.elkt` models vendored from elk-models — `north_south_ports`,
  `preserve_order`, ticket 528 — run through the real Java pipeline to a P3 strategy, a greedy-switch processor or one
  of the eight processors, the processor `prefix` recorded), `scenarios` 89 (the Java tests' hand-built graphs as step
  rows), `sites` 62 (step rows for the T9 branch scenarios). `LayeredOrderVectors.test.ts` replays all 808 at the AD-4
  bar, with the port order of every node (`ports`) compared exactly; step rows under ten nodes also match the full 7a
  dump.
- Ten JUnit invariant tests (`BasicCrossingMinimizationTest`, `ForsterConstraintResolverTest`,
  `ModelOrderBarycenterHeuristicTest`, `PortListSorterTest`, `LongEdgeSplitterTest`, `InvertedPortProcessorTest`,
  `PortSideProcessorTest`, `NorthSouthPortPreprocessorTest`, `SortByInputModelProcessorTest`,
  `BasicConsiderModelOrderTest`) ported verbatim over the replayed rows of their Java configurations.
  `InvertedPortProcessorTest.testValidNodeOrder` reaches no assertion on its 13 ptolemy rows (the nine vendored ptolemy
  inputs have no edge leaving a WEST port or entering an EAST port of a side-fixed node), so since 2026-11-21 (issue
  #49) the port of the test also runs on the 16 other rows that end at `INVERTED_PORT_PROCESSOR` behind
  `PORT_SIDE_PROCESSOR`: six of them execute assertions (`scenarios/InvertedPortProcessor/inverted-ports` 5 edges,
  `…/long-edges` 3, `sites/HeadLabels/invertedPort/{short, both}` and `sites/HeadLabels/westOutput` 1 each,
  `models/ticket-528-violatedNodeOrder/root` 1) and pass. `sites/InvertedPortProcessor/freePorts` omits
  `PORT_SIDE_PROCESSOR` on purpose and is outside the Java test's contract.
- Breadth sweep (B6, gitignored): 6,728 oracle cases at the P3 stop over the 1,682 edge-bearing hierarchy levels of
  all 550 ptolemy models, once per `CrossingMinimizationStrategy` (6,280 ok, 448 refused, 0 throws, 0 timeouts); the
  port's canonical order-dump hash equals the oracle's for every ok case (stride 1).
- 88 anchored unit cases cite a site row (`// oracle: <row id>; <Java file:line>`) and six pin Java constants; after them every 7c class is at or above 90 % branches except eight whose remainder is nested-graph (7h), label-dummy (7f), dead-by-construction or unreached with a named mechanism (`plans/layered-crossing-min/unreached.md`, with the T11 and T12 corrections); whole-suite coverage 99.01 / 96.96 / 99.03 / 99.01.
- Landed vectors, goldens and corpus are unchanged: the refs diff against `main` is the new `layered-order.json`, the
  24 vendored `.elkt` inputs and their manifest rows, and the sweep test.
- The hand-built JUnit suites (mission 7c-tests, T1–T9 of `plans/layered-crossing-min-tests/`): the three greedy-switch
  graph creators (`test/helpers/TestGraphCreator.ts` with `MockRandom`, `InLayerEdgeTestGraphCreator.ts`,
  `NorthSouthEdgeTestGraphCreator.ts`, 2,697 Java lines) and fourteen unit-level suites (p3order 6, counting 3,
  greedyswitch 5; 211 tests, 280 runs with parameters, 8 `@Ignore` methods kept as `it.skip`) ported verbatim with the
  Java tests' own literals as expectations (AD-13, decision T1). `tools/oracle/java-tests.sh` runs the same fourteen
  classes against the oracle build: 280 runs, 0 failures, per suite equal to the TS counts
  (`plans/layered-crossing-min-tests/coverage.md`). No port defect surfaced; the nested-graph cases are the first
  Java-derived check of the hierarchical sweep and the hierarchical greedy switch, and reach three of 7c's "U nested"
  arms (`LayerSweepCrossingMinimizer.ts:163 if[1]`, `SwitchDecider.ts:94,97 cond-expr[0]`).

**AD-10 sites.** `HyperedgeCrossingsCounter.java:216-217`, `ModelOrderNodeComparator.java:61,65,119-134,531-532`,
`ModelOrderPortComparator.java:69,73,112-127,442-443`, `ForsterConstraintResolver.java:72` (`LinkedHashMultimap`),
`ModelOrderBarycenterHeuristic.java:34,38`, `SweepCopy.java:97` and the greedy switch's changed-graph set are
insertion-ordered `Map`/`Set`s used for lookups or unions only. The hyperedge and corner comparators of
`HyperedgeCrossingsCounter` break ties on identity hashes, which the recorder's `-XX:hashCode=2` makes constant: the
port returns 0 there.

**Divergences found during the mission, fixed at origin.** A list-literal option default
(`considerModelOrder.groupModelOrder.cmEnforcedGroupOrders`, an Xtend `#[…]` → unmodifiable list) was stored by the TS
`getProperty` because every JS array is cloneable, so 25 `SortByInputModelProcessor` rows reported a changed root; the
melk emitter now freezes list-literal defaults and `ElkReflect.isCloneable` is false for frozen objects (C13, approved
by the user). Two replay-helper gaps, not port defects: the 7c order dump omitted baseline edges a processor detached
(`NorthSouthPortPreprocessor.java:652-653`), and `java.util.HashMap`-valued dumps are compared as `Map` twins
(`JAVA_CLASS_TWINS`, after a production `HashMap` shaped to the test convention was rejected).

**Known divergences found.** None numeric. Open by design:

- **Flat levels only (C3):** every row and sweep case is one hierarchy level; the nested-graph paths of the sweep
  driver (`GraphInfoHolder` children, `sweepInHierarchicalNodes`, the hierarchical greedy switch,
  `LayerSweepTypeDecider` past the root: 89 branches, 36 functions) are measured in 7h.
- **Components flag (B3) and no `DefaultConfiguration` sizing (B5):** as in part b.
- **Refused rows (C2):** prefixes naming `LABEL_DUMMY_INSERTER`, `COMMENT_PREPROCESSOR`, `DIRECTION_PREPROCESSOR`
  (7f), `SELF_LOOP_PREPROCESSOR` or `BREAKING_POINT_INSERTER` (7g) are not recorded; the `preserve_order` models with
  edge labels and the 448 self-loop sweep cases are among them. Three branches of the 7c classes need label dummies
  (7f).
- **Hand-built JUnit suites (C1):** `TestGraphCreator`, the three greedy-switch graph creators and the 16 suites built
  on them, `ConcreteSortByInputModelTest` and `AllowNonFlowPortsToSwitchSidesTest` are the sibling brief 7c-tests.
- **Full-layout JUnit suites (7c-tests T8):** `ConcreteSortByInputModelTest` (32) and
  `AllowNonFlowPortsToSwitchSidesTest` (6) call `LayeredLayoutProvider.layout` and assert coordinates and edge
  intersections; both pass on the oracle and move to 7f. The root `org.eclipse.elk.alg.layered.TestGraphCreator`
  (1,217 lines) is referenced by no Java file and stays unported.
- **Randomness scope (C4):** INTERACTIVE and semi-interactive rows replay the seeded positions of the Java test
  configurators; sweep cases use the positions the models carry on disk.
- **Unreached arms with a named mechanism:** 20 arms no recorded graph reaches (`plans/layered-crossing-min/unreached.md`
  § T11 corrections, with the scans that failed), kept as U. The 19 of them that went to issue #59 by way of 7h are
  settled since mission layered-arm-search: 2 reached through layout, 9 by a site scenario only, 8 proven dead (part i,
  "The 25 handed-over arms").
- **`Integer` cache assumption:** as in part b (`ModelOrderBarycenterHeuristic.java:90-91`).
- **Prose typos corrected:** none found in this mission.

## alg.layered, part d: node placement (mission 7d) {#alg-layered-placement}

Mission 7d ported the fourth phase (`p4nodes`: `SimpleNodePlacer`, `InteractiveNodePlacer`, `LinearSegmentsNodePlacer`,
`NetworkSimplexPlacer`; `p4nodes.bk`: the seven Brandes-Köpf classes), the five intermediate processors a P4 stop needs
(`InnermostNodeMarginCalculator`, `LabelAndNodeSizeProcessor`, `InLayerConstraintProcessor`,
`HierarchicalPortDummySizeProcessor`, `NodePlacementRepeater`; N1 moved them from 7f) and the 5 + 5 enum arms that
create them (design, idioms and runbook in [alg-layered-placement.md](architecture/alg-layered-placement.md)). The
pipeline still does not run (`ElkLayered` and `GraphConfigurator` are 7f); every class is proven by replaying what the
oracle's pipeline recorded at the P4 stop and at each processor. Decisions: `plans/layered-node-placement/decisions.md`
(N1–N12).

**Evidence.**

- `test/golden/refs/java/layered-placement.json` (5,311,993 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-placement-vectors.sh`, JVM flag `-XX:hashCode=2`): 610 rows, byte-stable; `models` 494 (the
  vendored ptolemy models and `.elkt` inputs at every edge-bearing hierarchy level, the 22 `tests/layered/node_placement`
  `.elkt` newly vendored, run through the real Java pipeline to the P4 class per `NodePlacementStrategy`, to each of the
  five processors, and on the variant set to the BK straightening × alignment matrix, `favorStraightEdges`,
  `deflectionDampening` and the three flexibility defaults with and without `recomputeNodePlacement`), `scenarios` 84
  (step rows: two or more small graphs per strategy, BK configuration, flexibility value and processor), `sites` 32
  (step rows for the T9 branch scenarios, and since 2026-11-21 the six `sites/HierarchicalPortDummySizeProcessor/*` rows
  of issue #49). Every row carries `geometry` (node position, size and margin; layer sizes;
  port and label positions where the stop moves them or a node is flexible, N3). `LayeredPlacementVectors.test.ts`
  replays all 610 at the AD-4 bar (coordinates within 1e-6, orders exact); step rows under ten nodes also match the
  full 7a dump.
- `HierarchicalPortDummySizeProcessor`'s `delta` (twice `spacing.edgeEdgeBetweenLayers`) and the `step` of `setWidths`
  are oracle values since 2026-11-21 (issue #49): the six `sites/HierarchicalPortDummySizeProcessor/*` rows
  (`two-north`, `two-south`, `three-north`, `three-south`, `two-south-out`, `mixed`) put two or three north or south
  external-port dummies in one layer (spacing 7: widths `[0, 14]`, `[14, 0]`, `[0, 14, 28]`, `[28, 14, 0]`; the dummy's
  EAST port moves to its width).
  Every earlier row held at most one such dummy per layer.
- The JUnit invariant `BasicNodePlacementTest.testProperCoordinates` ported verbatim over the `models` P4 rows of its
  15 runs (14 configurator providers and the default; 236 row cases); the Java suite runs on the oracle with
  `MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh …BasicNodePlacementTest`: `runs=8008 failures=0` at
  mission start and end.
- Breadth sweep (N10, gitignored): 8,410 oracle cases at the P4 stop over the edge-bearing hierarchy levels of all 550
  ptolemy models, once per `NodePlacementStrategy` (1,970 ok, 6,440 refused — 5,880 `HYPEREDGE_DUMMY_MERGER` (7e),
  560 `SELF_LOOP_PREPROCESSOR` (7g) —, 0 throws, 0 timeouts); the port's canonical dump hash, geometry included, equals
  the oracle's for every ok case (stride 1 and stride 2).
- 27 anchored unit cases cite a site row (`// oracle: <row id>; <Java file:line>`); after them every 7d class is at
  100 % branches with the generic replay except seven whose remainder is dead by construction or unreachable with a
  named mechanism, two of them below 90 % (`LinearSegmentsNodePlacer` 83.3, `BKNodePlacerFeasibility` 60;
  `plans/layered-node-placement/unreached.md` with the T11 and T12 corrections); whole-suite coverage
  99.02 / 96.99 / 99.05 / 99.02.
- Landed vectors, goldens and corpus are unchanged: the refs diff against `main` is the new `layered-placement.json`,
  the 22 vendored `.elkt` inputs and their manifest rows, and the sweep test. The 7a/7b/7c vector scripts reproduce
  their refs byte for byte.

**AD-10 sites.** `BKCompactor.java:55` (`sinkNodes`, iterated at `:341,378`) is an insertion-ordered `Map`, the order
the recorder's `-XX:hashCode=2` gives the Java up to 10 entries; `BKNodePlacer.java:140` (`markedEdges`),
`ThresholdStrategy.java:55` (`blockFinished`), `NetworkSimplexPlacer.java:175,190` (`portMap`,
`flexibleWhereSpacePermitsEdges`) are membership-only; `BKNodePlacer.java:517-548` keep their `LinkedHash*` order.

**Divergences found during the mission, fixed at origin.** None reached the oracle rows: a draft chained
`.origin(lEdge)` on two network-simplex auxiliary edges where the Java (`NEdge.java:59-61`) discards the argument
(removed before commit); hand-built tests with Java-derived behavioural literals were removed under L4 and routed
through site rows. No numeric divergence between the port and the oracle in 610 rows and 1,970 sweep cases.

**Known divergences found.** None numeric. Open by design:

- **Flat levels only (C3) and the components flag (B3):** as in parts b and c; no untaken 7d site needs nested graphs.
- **Refused rows (N1):** prefixes naming the label processors, `COMMENT_NODE_MARGIN_CALCULATOR`,
  `ALTERNATING_LAYER_UNZIPPER` (7f), `HYPEREDGE_DUMMY_MERGER` (7e), the self-loop, wrapping and breaking-point
  processors (7g) and 7c's five before-P3 categories are not recorded: 32 accepted refusals in the recorder, most
  ptolemy P4 levels (a port with two or more edges) among them; the sweep proves them after 7e.
- **The 5 MiB cap:** the ref is 644 bytes under it after the variant-set trim (one ptolemy model plus three `.elkt`;
  the BK matrix on two of them) and six unrecorded variant rows whose arms other rows reach. The cap was raised to
  16 MiB on 2026-11-03 (roadmap revision "caps raised"); the trimmed rows may return when a later mission re-records.
- **Chain-forced site rows:** the six `externalPortLabels` rows omit `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR` and the
  greedy switch (a real plan replaces labelled N/S external dummies by label-less copies), and `inLayerEdges/westOutput`
  omits `INVERTED_PORT_PROCESSOR`; every other site row equals its pipeline twin.
- **Unreached arms with a named mechanism:** `plans/layered-node-placement/unreached.md` § T11 and T12 corrections
  (the BK infeasible-layout arms, proven unreachable on 52,000 random graphs; the `improveTwoPath` "neither case" arm;
  three dead-by-construction confirmations).
- **Randomness scope:** INTERACTIVE rows replay the 7c seeded positions; sweep cases use the on-disk positions; no 7d
  class draws from `Random`.
- **Prose typos corrected:** none found in this mission.

## alg.layered, part e: edge routing (mission 7e) {#alg-layered-routing}

Mission 7e ported the fifth phase (`p5edges`: `EdgeRouterFactory`, `OrthogonalEdgeRouter`, `PolylineEdgeRouter`;
`p5edges.orthogonal` with `direction`: the routing generator, hyperedge segments, dependencies, splitter and cycle
detector, the three direction strategies; `p5edges.splines`: `SplineEdgeRouter`, `SplineSegment` (unstaged),
`SplinesMath`, `Rectangle`, `NubSpline`, `NubsSelfLoop`), the six intermediate processors a routed result needs
(`HyperedgeDummyMerger`, `HierarchicalPortPositionProcessor`, `LayerSizeAndGraphHeightCalculator`, `LongEdgeJoiner`,
`NorthSouthPortPostprocessor`, `FinalSplineBendpointsCalculator`; R1 moved the last three from 7f) and the 3 + 6 arms that
create them (design, idioms and runbook in [alg-layered-routing.md](architecture/alg-layered-routing.md)). The pipeline
still does not run (`ElkLayered` and `GraphConfigurator` are 7f); every class is proven by replaying what the oracle's
pipeline recorded at the P5 stop of each router and at each processor. Decisions: `plans/layered-edge-routing/decisions.md`
(R1–R14).

**Evidence.**

- `test/golden/refs/java/layered-routing.json` (5,190,239 bytes) and `layered-routing-steps.json` (1,789,169 bytes;
  JDK 21.0.1; oracle `8aaa3c14`; recorder `tools/vectors/layered-routing-vectors.sh`, JVM flags `-XX:hashCode=2
-XX:-OmitStackTraceInFastThrow`): 950 rows, byte-stable; `models` 666 (the vendored models at every edge-bearing
  hierarchy level, the 32 `tests/layered/{splines,hyperedge_merging,hierarchical_ports}` and ticket inputs newly
  vendored, run through the real Java pipeline to `LAYER_SIZE_AND_GRAPH_HEIGHT_CALCULATOR`, `P5` under each of the three
  routers, `LONG_EDGE_JOINER`, `NORTH_SOUTH_PORT_POSTPROCESSOR`, `FINAL_SPLINE_BENDPOINTS_CALCULATOR`,
  `HIERARCHICAL_PORT_POSITION_PROCESSOR`, and `HYPEREDGE_DUMMY_MERGER` + `P4` on the hyperedge levels 7d refused; on the
  variant set the bend-point, merge-edges, sloppy-spline, polyline-zone, spacing and feedback-edge families),
  `scenarios` 94 (step rows: eleven graph shapes per router, the option families, the six processors), `sites` 32 (the
  T11 branch scenarios, and since 2026-11-21 the seven splitter rows of issue #49), `calls` 158 (direct calls of the
  spline geometry classes and the self-loop factories). Every
  row carries `geometry` with the graph size and offset, every edge's bend and junction points and, at a SPLINES P5
  stop, the spline segment summaries (R3). `LayeredRoutingVectors.test.ts` replays all 950 at the AD-4 bar
  (coordinates within 1e-6, orders exact); step rows under ten nodes also match the full 7a dump.
- The JUnit invariants `BasicEdgeRouterTest.checkEdgeRouteIsOrthogonal` (orthogonal configurator only, as upstream),
  `Issue726Test.testOrthogonalEdges` and `LayerSizeAndGraphHeigthCalculatorTest.testAllNodesContained` ported verbatim
  over the `models` rows (97, 1 and 97 rows; 575 edges, 727 nodes); the Java suites run on the oracle with
  `MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh …`: `runs=550 / 550 / 1 failures=0` at mission start and
  end.
- Breadth sweep (R11, gitignored): 6,728 oracle cases over the 1,682 edge-bearing hierarchy levels of all 550 ptolemy
  models at `P4` (BK), `P5/ORTHOGONAL`, `P5/POLYLINE` and `FINAL_SPLINE_BENDPOINTS_CALCULATOR/SPLINES` (6,280 ok, 448
  refused — all `SELF_LOOP_PREPROCESSOR` (7g) —, 0 throws, 0 timeouts; the hyperedge levels 7d refused are accepted
  now); the port's canonical dump hash, geometry included, equals the oracle's for every ok case (stride 1 and stride 2).
- 62 anchored unit cases cite a site or call row (`// oracle: <row id>; <Java file:line>`); the
  replay-alone coverage map `plans/layered-edge-routing/unreached.md` classifies the 309 untaken branches and 94
  uncovered functions (170 S in 20 scenarios after T13's corrections, 164 J, 65 U, 4 X); after them 20 of the 46 7e files are at 100 % branches with the generic replay and the class tests, and every remainder below 90 % is a named 7f/7g path or a dead arm (`HyperedgeDummyMerger` 77.1, `LongEdgeJoiner` 80, `BaseRoutingDirectionStrategyForRoutingDirection` 75, `FinalSplineBendpointsCalculator.ts` 89.7, the two N/S direction strategies 0); whole-suite coverage 98.86 / 96.88 / 99.01 / 98.86.
- Landed vectors, goldens and corpus are unchanged: the refs diff against `main` is the two new routing refs, the 32
  vendored inputs and their manifest rows, and the sweep test. The 7a–7d vector scripts reproduce their refs byte for
  byte.

**AD-10 sites.** `SplineSegment.java:60-121` (`edges`, iterated by the bend-point calculator) and
`SplineEdgeRouter.java:588-589` (`upEdges`/`downEdges`, the `Pair<…>` sets the segment constructor iterates) are
insertion-ordered `Set`s. They were identity-hashed `HashSet`s at the old pin, whose JVM `Pair` order proved
unobservable on the rows; upstream made all three `LinkedHashSet`s
([eclipse-elk/elk#1229](https://github.com/eclipse-elk/elk/pull/1229)), so since the `e7eaea57` pin (#99) the port's
order is the Java's.
`BaseRoutingDirectionStrategy.java:44` and `PolylineEdgeRouter.java:188` (`createdJunctionPoints`) use `KVector.equals`
semantics, membership only; `HyperEdgeCycleDetector.java:152` keeps its `TreeSet` order by `mark`;
`OrthogonalRoutingGenerator.java:164`, `SplineEdgeRouter.java:156-159` are lookup maps.

**Divergences found during the mission, fixed at origin.** None reached the oracle rows: `SplineSegment.anchorY` let a
null `SPLINE_NS_PORT_Y_COORD` flow where the Java unboxes and throws (explicit `TypeError`, AD-16); the landed 7a dump
context named a removed node as a fresh `ref` and the enum registry lacked `EdgeRouting` (both twinned in the 7e
helpers, the landed helpers untouched); one hand-derived test expectation (`isStraight(10, 10.2)`) was wrong in
floating point and was replaced by a twin (L4). No numeric divergence between the port and the oracle in 950 rows and
6,280 sweep cases.

**Known divergences found.** None numeric. Open by design:

- **Flat levels only (C3) and the components flag (B3):** as in parts b–d.
- **Refused rows (R1):** prefixes naming the label and comment processors, the hierarchical orthogonal router, the
  hypernode and constraints processors (7f), the self-loop, wrapping and compaction processors (7g) and 7c's before-P3
  categories are not recorded: 23 accepted refusals; ticket 341 (`elk.direction: UP`) has no rows.
- **Oracle throws:** six `hierarchical_ports` levels (hierarchy03–07, 09 / `Compound`) throw a `NullPointerException`
  in `BetweenLayerEdgeTwoNodeCrossingsCounter` under POLYLINE and SPLINES because only the orthogonal router adds
  `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`; the recorder skips them (`ORACLE_THROWS`), the port has no rows for them and
  would fail the same way (candidate upstream report).
- **The caps:** `layered-routing.json` is 52,641 bytes under 5 MiB after the R2 trimming order (a four-model variant
  set, ptolemy POLYLINE/SPLINES rows and `LONG_EDGE_JOINER` stops on the trim set); the recorder is at 2,998 of 3,000
  lines (the sweep modes live in a sibling launcher). Both caps were raised on 2026-11-03 (16 MiB per ref, 5,000 lines
  per recorder; roadmap revision "caps raised"), so a later row or recorder change no longer needs a cap decision.
- **Chain-forced site rows:** the three `sites/SelfLoop/*` rows omit `SELF_LOOP_PREPROCESSOR` (7c S13 precedent) and the
  two `sites/FinalSplineBendpoints/compaction/*` rows set the compaction option without the 7g compactor; every other
  site row equals its pipeline twin.
- **Unreached arms with a named mechanism:** `plans/layered-edge-routing/unreached.md` § T13 corrections (the far arms of
  `segmentAllowsSloppyRouting`, provably unreachable by the horizontal placement). The three Medium splitter arms it
  lists (`HyperEdgeSegmentSplitter.ts:220`, `:400`, `:406`) are reached since 2026-11-21 (issue #49) by the layout rows
  `sites/HyperEdgeSegmentSplitter/noFreeArea/{unbounded, finite, consumed}`,
  `…/areaStartRounding/{single, consumed}` and `…/areaEndRounding/{single, consumed}`: a segment with no free area in
  reach is split at its centre, and a new area is dropped when rounding puts `centre ∓ threshold` one ulp outside the
  used area. Breakpoints on the oracle JVM confirm each arm; the generic replay now takes every branch of the splitter.
  Mechanisms, counts and the corrections to the earlier record: `plans/layered-evidence-gaps/unreached.md`.
- **Randomness scope:** the two draws (`HyperEdgeCycleDetector`, `SplineEdgeRouter.breakCycles`) come from the graph's
  `Random`; rows replay the recorded prefix under seed 1, the `tie` rows under seeds 1 and 4096; no 7e class creates a
  `Random`.
- **Prose typos corrected:** none found in this mission (`QUATER_PI` and `LayerSizeAndGraphHeigthCalculatorTest` are
  identifiers, kept).

## alg.layered, part f: the running pipeline (mission 7f) {#alg-layered-pipeline}

Mission 7f ported the driver (`ElkLayered`, `GraphConfigurator`), the connected-components package except
`ComponentsCompactor` (staged, 7g), `GraphTransformer`, `HierarchicalPortOrthogonalEdgeRouter`, `EndLabelSorter`,
`HypernodesProcessor` and `ConstraintsPostprocessor`, and the six arms that create them; `LayeredLayoutProvider.layout`
now runs whole layouts (design, idioms and runbook in [alg-layered-pipeline.md](architecture/alg-layered-pipeline.md)).
Decisions: `plans/layered-pipeline/decisions.md` (F1–F16, FX1–FX8).

**Evidence.**

- `test/golden/refs/java/layered-pipeline.json` (10,156,153 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-pipeline-vectors.sh`, `-XX:hashCode=2`): 1,311 rows, byte-stable; `full` 199 (whole layouts
  through `RecursiveGraphLayoutEngine` with every level's plan: the 4 goldens, 79 vendored models, routing × direction,
  components, options and 20 issue rows), `models` 905 (stops at the six new arms through `ElkLayered`'s test API),
  `scenarios` 165, `sites` 42. `LayeredPipelineVectors.test.ts` replays all of them at the AD-4 bar (at 7f it pinned 58
  to the throw of a later mission's stage, FX7; `PINNED_PIPELINE_ROWS` is empty today). The four `refs/elk/ptolemy-*`
  goldens equal the flagged recorder byte for byte
  and the TS layout at AD-4.
- Port alignment and port border offsets through layered layouts (2026-11-21, issue #49): 72 `scenarios` rows,
  `scenarios/PortAlignment/*` (27 graphs: `portAlignment.default` × BEGIN, CENTER, END, JUSTIFIED, DISTRIBUTED; each
  side's option × BEGIN, CENTER, END, JUSTIFIED; a default with two side overrides; single-port sides; overhanging
  ports) and `scenarios/PortBorderOffset/*` (9 graphs: `port.borderOffset` +5 and −5 on north and south ports, alone,
  under BEGIN and END, on every side, and mixed), each graph recorded at `LABEL_AND_NODE_SIZE_PROCESSOR` (`…/ports`:
  every port position is compared) and at the end of the plan (`…/end`). Layered sizes nodes through
  `NodeDimensionCalculation`, never `NodeMicroLayout`, so this evidence belongs here and not in
  `node-micro-layout.json`. An unset side is placed DISTRIBUTED (`NodeContext.getPortAlignment` reads the `CoreOptions`
  default, not the JUSTIFIED default `LayeredOptions` declares); the rows record it.
- SC4: the 2,351 `models` rows of the 7b–7e refs replay through the real driver with plan equality, 2 pinned (FX6);
  `normalise` and the real configurator are state-equal on all of them.
- 28 Java suites ported with their own assertions (allocation in `plans/layered-pipeline/suite-allocation.md`: 7f 28,
  7f2 11, 7g 10, 7h 9), on a runner subset that applies the JVM's label metrics (`layered-label-metrics.json`, 1,380
  texts, FX8). The oracle runs of this brief's 24 baseline suites and the four S1 suites equal
  `plans/layered-pipeline/java-baseline.md` at mission start and end (`failures=0`).
- Breadth sweep (F6, gitignored): 7,246 oracle cases over every edge-bearing ptolemy level × three routers and every
  whole model × four directions; 6,646 `ok` cases hash-match exactly at stride 1; 600 refused, all self loops (7g); 0
  throws. Cross-check against an unflagged JVM: 4,902 layered cases equal, 21 mismatches none of which is a layout, 0
  nondeterministic.
- 58 anchored unit cases cite a site row; the replay-alone coverage map `plans/layered-pipeline/unreached.md` partitions
  169 untaken branches and 46 uncovered functions (S 73, J 44, U 92, X 6; 7 S moved to U by T15).
- Landed vectors, goldens and corpus are unchanged; the refs diff adds `layered-pipeline.json`,
  `layered-label-metrics.json`, the sweep test, 26 vendored inputs and their manifest rows.

**What still throws, and which mission lifts it.** Edge labels, comment boxes, `layerUnzipping`, a monitor with logging
enabled (`DebugUtil`): 7f2. Self loops, wrapping, post compaction, `compaction.connectedComponents`: 7g.
`INCLUDE_CHILDREN`: 7h. Each throws `UnsupportedOperationException` naming the class and mission, at plan build. (State at 7f;
7f2, 7g and 7h lifted them, and nothing throws since 7h.)

**Known divergences.** None numeric. Open by design: the pinned rows (FX6, FX7); the `ComponentGroup` key order follows
the oracle's flag (FX3) and is unobservable in final layouts on the corpus; `EndLabelSorter`'s map order is insertion
order pending 7f2's scenario (FX2); the label metrics are a macOS JVM snapshot (FX8).

## alg.layered, part g: labels, comments and debug output (mission 7f2) {#alg-layered-labels}

Mission 7f2 ported the label family (`LabelDummyInserter`, `LabelDummySwitcher`, `LabelDummyRemover`,
`LabelSideSelector`, `EndLabelPreprocessor`, `EndLabelPostprocessor`, `LabelManagementProcessor`), the comment
processors, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` and the debug utilities (`DotDebugUtil`,
`JsonDebugUtil`, `DebugUtil`), and the 12 arms that create them. `LayeredLayoutProvider.layout` now runs labelled and
commented layouts, layer unzipping and logging (design, idioms and runbook in
[alg-layered-labels.md](architecture/alg-layered-labels.md)). Decisions: `plans/layered-labels/decisions.md` (G1-G12,
G3a, G11a).

**Evidence.**

- `test/golden/refs/java/layered-labels.json` (14,315,720 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-labels-vectors.sh`, `-XX:hashCode=2`): 1,305 rows, byte-stable; `rowCounts` `full` 399,
  `models` 640, `scenarios` 224, `sites` 42. `LayeredLabelsVectors.test.ts` replays 1,316 cases (journal, T16) at
  the AD-4 bar; logged DOT and JSON graphs are compared per G3 and G3a (identity-hash tokens normalised, property lists
  unordered, everything else exact).
- The 59 rows pinned by 7f (57 in `layered-pipeline.json`, 2 in `layered-phases.json`) are unpinned and replay their
  recorded expectations; one row stays pinned to 7g
  (`models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN`). `site/provider/flat` and
  `site/provider/cancelled` compare their recorded layout (FX5). FX2's parallel-edge end-label rows equal the oracle
  with `END_LABELS` in insertion order and reversed.
- Java suites: the 11 of `plans/layered-labels/java-baseline.md` (12, 3, 4, 550, 551, 1, 1, 2, 2, 5 and 3 oracle runs)
  ported with their own assertions. Oracle runs at mission start equal the baseline (`failures=0`); at mission end:
  equal to the start run, all 11 suites `failures=0`. Corpus-wide, `LabelDummyRemoverTest` and `LabelSideSelectorTest` fail
  132 cases, all `SelfLoopPreProcessor is ported in mission 7g`.
- Breadth sweep (G7, gitignored): 221 label- or comment-bearing models × {`default`, `RIGHT`, `LEFT`, `DOWN`, `UP`} =
  1,105 oracle cases; ok 935, refused 155 (7g 105: `SELF_LOOP_PREPROCESSOR` 75, `HORIZONTAL_COMPACTOR` 25,
  `COMPACTION_CONNECTED_COMPONENTS` 5; 7h 50: `INCLUDE_CHILDREN`), throws 15 (three rectpacking models, equal on both
  sides). TS at stride 1: 935 of 935 hashes match, 15 of 15 throws match. Final run: exit 0 in 4 s, the same 935 / 155 / 15 split; the TS comparison passes.
- Label metrics (G8): `layered-label-metrics.json` grew append-only to 2,258 entries; the 1,380 entries of 7f are
  proven unchanged by a test.
- Coverage map `plans/layered-labels/unreached.md`: over the 15 classes (34 files), 131 untaken branches and 13
  uncovered functions partitioned S 87, J 10, U 42 (7g 3, 7h 7, dead by construction 32), X 5; 42 site rows and 86
  anchored cases (T17a 40, T17b 46) close S and J; mutation checks killed 29 of 37 flips, the survivors being equivalent.
  Whole-suite coverage after batch 8: 99.05 / 97.17 / 99.12 / 99.06 (lines / branches / functions / statements).
- Issue #48 (2026-11-19, `plans/label-switcher-mutants/`): `layered-labels.json` gained two site rows, append-only
  (`sites` 44, 1,307 rows, 14,353,655 bytes, oracle `8bca22f4`): `sites/LabelDummySwitcher/spaceEfficient-fitsAndTies`
  and `…-vertical`, with 8 anchored cases. Over a fixed set of 29 one-edit mutants of
  `LabelDummySwitcherSpaceEfficient.ts` the switcher cases and the labels replay kill 26; 2 are equivalent with proofs,
  and 1 is open: it differs from the Java only on a NaN potential width, which a recorder refuses (issue #123). This
  replaces T17a's "5 survivors equivalent" above.
- Landed vectors and goldens are unchanged; the refs diff adds `layered-labels.json`, the sweep test, 123 vendored
  inputs under `inputs/labels/` and their manifest rows, and appends keys to `layered-label-metrics.json`.

**Upstream defects found (G10).** `EndLabelSorter.java:194` adds a list to itself (`this.labels.addAll(labels)`, a
no-op) and its `HashMap<LEdge, LabelGroup>` order makes parallel end labels nondeterministic on an unflagged JVM
(`h0` at y 40 or 54). Two fix branches, `fix/end-label-group-self-add` and `fix/end-label-group-order`, exist as
worktrees of the local `../elk` checkout: local, unsigned, not pushed. An issue draft (never filed) covers
`BF_MODEL_ORDER`/`DF_MODEL_ORDER` leaving same-layer or backward edges under the default cycle breaker. All three were
later fixed upstream ([#1216](https://github.com/eclipse-elk/elk/pull/1216),
[#1217](https://github.com/eclipse-elk/elk/pull/1217): `LinkedHashMap`;
[#1219](https://github.com/eclipse-elk/elk/pull/1219): the two layerers now throw `UnsupportedGraphException` for such
an edge); the port follows the fixes since the `e7eaea57` pin (#99).

**Upstream typos (CLAUDE.md carve-out).** `LabelManagementProcessor.java`: the comment "edge Unand tail labels" is
corrected to "edge head and tail labels" at the port site (T5); nothing branches on it.

**What still throws, and which mission lifts it.** Self loops, `MULTI_EDGE` wrapping, post compaction and
`compaction.connectedComponents`: 7g (9 pending arms and the staged `ComponentsCompactor`). `INCLUDE_CHILDREN`: 7h (1
pending arm, `HierarchicalNodeResizingProcessor`, and the compound stages). The enum tally is 49 ported, 10 pending
(7g 9, 7h 1). Each throws `UnsupportedOperationException` naming the class and mission, at plan build. (State at 7f2; 7g
and 7h lifted them: 59 ported, 0 pending.)

**Known divergences.** None numeric. Open by design: the debug-JSON property order follows the landed `JavaHashMap`
and is compared as a multiset (G3); identity hashes in debug strings are normalised on both sides (G3a); the group and
`END_LABELS` orders are insertion order (G4, FX2); the label metrics remain a macOS JVM snapshot (FX8).

**Reference platform (#52 ruling, row 10).** macOS on Apple Silicon (arm64) with JDK 21.0.1 is the reference platform for
JVM measurements. `layered-label-metrics.json` (the FX8 snapshot) was recorded there and is never re-recorded on another OS,
JDK or CPU; CI uses it as stored. Its file records only `jdk`, so this paragraph is where the platform is recorded. The
text-sizing seam leaves it unchanged ([Text-sizing seam](#text-sizing-seam)).

## alg.layered, part h: self loops, wrapping and compaction (mission 7g) {#alg-layered-loops}

Mission 7g ported the self loop package (`intermediate/loops` with `ordering` and `routing`) and the four self loop
processors, `DummySelfLoopProcessor`, graph wrapping (`intermediate/wrapping`), `HorizontalGraphCompactor`
(`intermediate/compaction`), the layered `compaction` package (`oned`, `components`, `recthull`) and
`ComponentsCompactor`, and wired the nine arms that create them. `LayeredLayoutProvider.layout` now runs graphs with
self loops, `SINGLE_EDGE` and `MULTI_EDGE` wrapping, post compaction and `compaction.connectedComponents` (design, idioms
and runbook in [alg-layered-loops.md](architecture/alg-layered-loops.md)). Decisions:
`plans/layered-loops-wrapping-compaction/decisions.md` (W1-W14). The pending notes of the earlier parts above (7f and 7f2:
"self loops, wrapping, post compaction, `compaction.connectedComponents`: 7g") are left as they were written; this
section states the state after 7g.

**Evidence.**

- `test/golden/refs/java/layered-loops.json` (16,511,138 bytes; JDK 21.0.1; oracle `8bca22f4`; recorder
  `tools/vectors/layered-loops-vectors.sh`, `-XX:hashCode=2`): byte-stable; `rowCounts` `full` 731 (self-loops 227,
  wrapping 156, compaction 184, compaction-splines 80, components-compaction 79, converted 1, issues 4), `models` 307,
  `scenarios` 525, `sites` 79 (1,642 rows). `LayeredLoopsVectors.test.ts` replays every row of the four groups through
  the real provider and enum at the AD-4 bar with 0 mismatches and no row skipped or pinned (1,652 tests, about 8 s
  alone); `LayeredLoopsSites.test.ts` replays the 79 `sites` rows again under their scenario titles (80 tests). Accepted 7h refusals in
  the ref: 0. The 51 rows where the oracle throws inside ELK are not recorded.
- Evidence rows of mission layered-loops-evidence (issue #55), 15 `sites` rows appended to the 64 of 7g (112,037 bytes,
  every earlier row byte-equal): `PortSideAssigner/oddCornerSplit/EQUALLY`, `PortRestorer/freeDistribution/*` (4),
  `BreakingPointInserter/improveCutsTie`, `NetworkSimplexCompaction/{negativeSeparationDelta,westInvertedPortEdge}`,
  `LGraphToCGraphTransformer/southExternalPortMargin/{INSIDE,OUTSIDE}`,
  `ComponentsCompactor/externalEdgeOffset/{west,northFlush,northAbove}` and
  `ComponentsToCGraphTransformer/southPlaceholderExtent/{south,southWest}`. Each of the ten mutation survivors that 7g
  named in #55 is killed by one of them (`plans/layered-loops-evidence/mutants.md`).
- An oracle throw the port reproduces, without a row (the loops recorder drops a row whose oracle run throws):
  `edgeRouting=SPLINES` with `layerUnzipping.strategy=ALTERNATING` on an inverted port inside a cycle throws
  `NullPointerException` at `SplineEdgeRouter.java:956` (`getSplinePath`); the port throws a `TypeError` in
  `SplineEdgeRouter.getSplinePath`, pinned by `SplineEdgeRouter.sites.test.ts` against two oracle probes (issue #148,
  `needs-ruling`; `plans/layered-loops-evidence/unreached.md`).
- The row pinned by 7f, `models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN`, is unpinned: the fresh row
  equals the landed `layered-pipeline.json` row and replays with `PINNED_PIPELINE_ROWS` empty (W4).
  `full/labels/ticket-213_componentsCompaction`, refused by `layered-labels.json`, is the row
  `full/converted/labels/ticket-213_componentsCompaction`.
- Java suites: the 10 of `plans/layered-loops-wrapping-compaction/java-baseline.md` (16, 2, 5, 3, 2, 1, 1, 1, 1 and 1
  oracle runs: `CompactionTest`, `RectlinearConvexHullTest`, `SelfLoopPreprocessorTest`, `SelfLoopHolderTest`,
  `PolylineSelfLoopRouterTest`, `RoutingDirectorTest`, `Issue433Test`, `Issue444Test`, `Issue463Test`, `Issue870Test`)
  ported with their own assertions. Oracle runs at mission start equal the baseline (`failures=0`); at mission end: equal
  to the start run, all 10 suites `failures=0`.
- Corpus-wide runs (`PIPELINE_SUITES_FULL=1`, `ELK_MODELS_DIR` set): `InLayerConstraintProcessorTest` 550,
  `LongEdgeJoinerTest` 550, `NodeMarginCalculatorTest` 2,200, `LabelDummyRemoverTest` 550 + 1 non-vacuity,
  `LabelSideSelectorTest` 551 + 1, `PortListSorterTest` 1,114: 0 failures, counts equal to the oracle's. The 195 + 132
  failures on `SelfLoopPreProcessor` that 7f and 7f2 recorded are gone. `NodeMarginCalculatorTest` runs all 13 vendored
  ptolemy models with all four hooks; the `SelfLoopRouter` hook fires on 1 of 13.
- Breadth sweep (W5, gitignored, issue #53): part a 600 cases (the pipeline sweep's refusals), part b 105 (the label
  sweep's refusals), part c 2,368 (an option family): 3,073 oracle cases, 2,997 ok, 76 throws (all part c), 0 refusals, 0
  timeouts. TS at stride 1: 3,073 checked, 2,997 hash-equal, 0 mismatches, 76 throws on both sides. Dropped as out of
  scope: 6,646 part a and 935 part b cases with no 7g arm in the plan, 50 part b cases refused by `INCLUDE_CHILDREN` (7h),
  15 that throw `UnsupportedConfigurationException` before a plan holds an arm. The hash treats every NaN as the one
  canonical NaN; every other value keeps its raw IEEE bits.
- Twins (W6, W7): every iterated identity-keyed container of the 7g classes replays its rows with the iteration reversed:
  `ComponentsToCGraphTransformer` (`externalExtensions` 86 rows, `externalPlaceholder` 86, `LEFT_RIGHT`/`UP_DOWN` 86),
  `ComponentsCompactor` (`externalExtensions` 86, union extensions 110), `SelfHyperLoop.slPortsBySide` 331 rows,
  `SelfHyperLoop.getSLEdges()` 125 router and 125 post-processor rows, `LGraphToCGraphTransformer` maps, and
  `NetworkSimplexCompaction.lEdgeMap` 4 rows: all order-independent. R9 (issue #54): `SplineEdgeRouter.getSplinePath` 254 rows,
  all equal the oracle reversed; `collectVerticalSegmentsSplines` 203 rows, 49 of the 56 with a multi-edge segment equal
  reversed and 7 match only in insertion order, which the port keeps.
- Coverage map `plans/layered-loops-wrapping-compaction/unreached.md`: over the 7g classes (89 files), 284 untaken
  branches and 88 uncovered functions partitioned S 97, J 43, U 211, X 21; 64 site rows close S (31 of 34 scenarios); 174
  anchored cases; mutation checks killed 121 of 137 mutants (5 equivalent or dead, 11 survivors named in follow-up issue
  #55). Whole-suite coverage after batch 10: 98.78 / 96.75 / 98.77 / 98.79 (lines / branches / functions / statements).
- Label metrics: `layered-label-metrics.json` grew append-only from 2,258 to 2,301 keys (43 texts), no existing value
  changed.
- Landed vectors and goldens are unchanged; the refs diff adds `layered-loops.json`, the sweep test, 40 vendored inputs
  under `inputs/loops/` and their manifest rows, and appends keys to `layered-label-metrics.json`.

**Known divergences.** None numeric beyond the maintainer's rulings: issue #53 (the NaN-canonical sweep hash amends W5's
raw IEEE hex for NaN only; the landed sweeps are untouched) and issue #54 (the port keeps insertion order for the spline
segment's representative edge, as the flagged oracle does). The ELK oddities the port copies are drafted in the journal's
T22 row (issue #56).

**Upstream typos (CLAUDE.md carve-out).** None: the journal records no prose typo in the 7g sources.

**What still throws, and which mission lifts it.** `INCLUDE_CHILDREN`: 7h (1 pending arm,
`HierarchicalNodeResizingProcessor`, and the compound stages `CompoundGraphPreprocessor`, `CompoundGraphPostprocessor`,
`CrossHierarchyEdge`). The enum tally is 58 ported, 1 pending (7h). Each throws `UnsupportedOperationException` naming the
class and mission, at plan build. (State at 7g; 7h lifted them: 59 ported, 0 pending, `staged-classes.json` is `[]`; see
[the 7h section](#alg-layered-compound).)

## alg.layered, part i: compound graphs (mission 7h) {#alg-layered-compound}

Mission 7h ported the `compound` package (`CrossHierarchyEdge`, `CrossHierarchyEdgeComparator`,
`CompoundGraphPreprocessor`, `CompoundGraphPostprocessor`) and `HierarchicalNodeResizingProcessor`, wired the last pending
arm of `IntermediateProcessorStrategy`, and proved the hierarchical driver ported in 7f (`doCompoundLayout`,
`hierarchicalLayout`, `ElkLayeredHierarchy.ts`) against the oracle. `LayeredLayoutProvider.layout` now runs every
hierarchy-handling mode, `INCLUDE_CHILDREN` included (design, idioms and runbook in
[alg-layered-compound.md](architecture/alg-layered-compound.md)). Decisions: `plans/layered-compound/decisions.md`
(H1-H14). The pending notes of the earlier parts above ("`INCLUDE_CHILDREN`: 7h") are left as they were written, each with
a dated note; this section states the state after 7h: the enum tally is **59 ported, 0 pending**,
`test/architecture/staged-classes.json` is `[]`, and nothing in the layered algorithm throws a "ported in mission" error.

**Evidence.**

- `test/golden/refs/java/layered-compound.json` (12,237,513 bytes; JDK 21.0.1; oracle `8aaa3c14`; recorder
  `tools/vectors/layered-compound-vectors.sh`, `-XX:hashCode=2`): byte-stable; 540 rows. Row counts per group and family:

  | Group       | Rows | Families                                                                                                                                                                                                                                                                                          |
  | ----------- | ---: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | `full`      |  355 | issues 17, include-children 253, ptolemy-include 48, hierarchy-aware 16, resizer 21                                                                                                                                                                                                               |
  | `models`    |   73 | `edge_label_placement-hierarchy01` 30, `ticket-455_longHierarchicalEdges` 27, `ptolemy-clockdrifthierarchy` 6, `ticket-160` 5, `ticket-552` 5; by processor: resizer 41, preprocessor 10, postprocessor 10, `LAYER_SWEEP` 9, `MEDIAN_LAYER_SWEEP` 1, one-sided and two-sided greedy switch 1 each |
  | `scenarios` |   88 | `CompoundGraphPreprocessor` 48, `CompoundGraphPostprocessor` 28, `ElkLayered` 12                                                                                                                                                                                                                  |
  | `sites`     |   24 | 19 run rows (one logged: `sites/JsonDebugUtil/loggedCompound`, 89 DOT and JSON pairs) and 5 throw rows                                                                                                                                                                                            |

  `LayeredCompoundVectors.test.ts` replays every row of the four groups through the real driver and enum at the AD-4 bar
  with 0 mismatches (542 tests, 5.3 s alone at batch 7; budget 30 s); `LayeredCompoundSites.test.ts` replays the 24 `sites`
  rows again under their scenario titles (27 tests). A `models` row is a stop of the hierarchical run with the whole `LGraph`
  tree dumped from the root (the preprocessor, each hierarchy-aware processor on the root, the resizer on every graph, the
  postprocessor). The dump carries `layerNodes` (the node objects of layer-only nodes), added by T1 before any TS existed;
  with it removed the second recording equals the first on all 516 rows. The five throw rows pin `ElkLayered.java:344`,
  `SplineSegment.java:247` (`DOWN`, `UP`), `ElkGraphImporter.java:1205` and `LGraphUtil.java:944`; the three older groups
  are byte-identical to the recording made before the `sites` group existed.

- Goldens (H4): `tools/oracle/regen-goldens.sh --set layered` writes `test/golden/refs/elk-layered/`: 24 refs (four
  ptolemy hierarchical models × `direction-right`, `-left`, `-down`, `-up`, `hierarchy-include`, `hierarchy-separate`),
  `_meta.json` naming `jvmFlags` `-XX:hashCode=2`, manifest `test/golden/layered.json`. A second run is byte-identical;
  `refs/elk` (4) and `refs/elk-algorithms` (9) regenerate unchanged. The 24 cases run without the flag are byte-equal to
  the committed refs on all 24 ids. `test/golden/layered-hierarchy-goldens.test.ts` (27 tests) compares each at AD-4.
- Java suites, at mission start (load 11) and at mission end (the `End` column is runs / failures of the
  mission-end run; the start counts equal `plans/layered-compound/java-baseline.md`, `failures=0` for all):

  | Suite                                                    | Oracle runs (start) | Failures (start) | TS cases | End   |
  | -------------------------------------------------------- | ------------------: | ---------------: | -------: | ----- |
  | `issues.Issue316Test`                                    |                   4 |                0 |        4 | 4 / 0 |
  | `issues.Issue455Test`                                    |                   2 |                0 |        2 | 2 / 0 |
  | `issues.Issue552Test`                                    |                   1 |                0 |        1 | 1 / 0 |
  | `issues.Issue596Test`                                    |                   1 |                0 |        1 | 1 / 0 |
  | `issues.Issue628Test`                                    |                   4 |                0 |        4 | 4 / 0 |
  | `issues.Issue665Test`                                    |                   1 |                0 |        1 | 1 / 0 |
  | `issues.Issue700Test`                                    |                   4 |                0 |        4 | 4 / 0 |
  | `issues.Issue701Test`                                    |                   6 |                0 |        6 | 6 / 0 |
  | `issues.Issue734Test`                                    |                   3 |                0 |        3 | 3 / 0 |
  | `org.eclipse.elk.graph.json.test.EdgeCoordsTest`         |                   1 |                0 |        1 | 1 / 0 |
  | `org.eclipse.elk.graph.json.test.LayoutOptionsTest`      |                   4 |                0 |        4 | 4 / 0 |
  | `org.eclipse.elk.graph.json.test.IndividualSpacingsTest` |                   3 |                0 |        3 | 3 / 0 |

  The nine issue suites run through the F7 runner with the Java's own assertions (`Issue628Test`'s four `@Configurator`s
  kept). The graph.json suites run through a scratch copy of `tools/oracle/java-tests.sh` with
  `org.eclipse.elk.graph.json.test` added (the landed script is not edited); the three methods deferred to 7h are ported
  into the existing files and their "Deferred" header lines are "Ported" lines. All 97 `alg.layered.test` Java files now
  have a port. The TS case counts of `Issue665Test` and `Issue700Test` equal the oracle's since the ruling on issue #58 was
  carried out (mission layered-stress-cases); at the end of 7h they were 0 and 2, below the oracle's by the three H13 cases.

- The three H13 cases, issue #58, resolved (ruling of 2026-11-13, mission layered-stress-cases): `Issue665Test` (1 case,
  `tickets/layered/665_includeChildrenDoesntStop.elkt`) and `Issue700Test` (2 of 4 cases, the same file and
  `examples/hierarchy/hierarchicalLayoutMixing.elkt`) lay a child out with `elk.stress`. 7h ported the suites whole and held
  these cases back behind a filter, `STRESS_PENDING`, until stress was ported (8b). The filter, its helper and its pin test
  are deleted. The layout-test runner registers `elk.force` and `elk.stress` next to layered, as `PlainJavaInitialization`
  does for every runner suite; the two models are vendored under `test/golden/inputs/compound/`; and
  `layered-label-metrics.json` gained the four label texts they need (`insideOtherLayout`, `child1`, `child2`,
  `insideOtherDirection`), appended by script with the 2,317 earlier entries byte-identical. Both suites run every case with
  the Java's assertions, 1 and 4, in default mode, under `PIPELINE_SUITES_FULL=1` and with the fixed measurer; the oracle
  gives `runs=1 failures=0` and `runs=4 failures=0`. The port's layout of each of the two models is byte-equal to the
  oracle's JSON export. A third `elk.stress` input, `tickets/layered/588_hierarchicalLayoutNPE.elkt`, is read by no suite
  and is never vendored.
- Breadth sweep (H5, gitignored `test/corpus/.compound-sweep/`): part a 45 cases swept (50 candidates before the stress
  filter), part b 100 (115 candidates), part c 1,024 (256 ptolemy hierarchical files with `INCLUDE_CHILDREN` applied at the
  root × 4 directions; no file sets it itself): 1,169 oracle cases, 1,164 ok, 5 throws (part b: all
  `tickets/layered/425_selfLoopInCompoundNode.elkt`), 0 timeouts, 0 refusals. TS at stride 1: 1,164 hash-equal, 5 throws
  equal (a `TypeError` at the import step against the oracle's `NullPointerException`), 0 mismatches, 47.8 s. Out of scope
  for `elk.stress`: 1 model in part a, 3 in part b. The hash is 7g's (raw IEEE hex, NaN canonical, issue #53).
- Twins (H3): every iterated identity-keyed container of the 7h classes replays its rows with the iteration reversed, over
  the 516 rows of `full`, `models` and `scenarios`: preprocessor `dummyNodeMap.entrySet()` 369 rows reached, 0 differ;
  preprocessor `crossHierarchyMap.keySet()` 297, 0; preprocessor values before the sort 67, 0; postprocessor values 197, 0;
  postprocessor `dummyEdges` 321, 0; postprocessor `crossHierarchyMap.keySet()` 238, of which 7 differ (13 ids with the six
  `sites` run rows). The one observable order: re-attaching the original edges in key order lists a shared port's edges in
  key order in the intermediate tree; the exported layout of both runs is string-identical. Largest containers: `dummyNodeMap`
  23 (47 rows above 10), `dummyEdges` 29 (62 rows), `crossHierarchyMap` keys 16 (4 rows), sorted value lists 6; the observable
  site has at most 6 keys. The order a treeified bucket would use is not established.
- Coverage map `plans/layered-compound/unreached.md`: in-scope untaken items S 43, J 31, U 187, open 26 (E 721 not listed);
  7h classes from the whole compound evidence 99.6 % statements, 98.0 % branches, 100 % functions, 99.6 % lines (the five
  untaken arms are dead by the Java). 16 site scenarios (`Sc1`-`Sc16`) plus 17 H8 closure rows. 42 anchored cases. Of the
  26 open items, `CrossHierarchyEdge.toString` was closed in 7h and the 25 arms were settled by mission layered-arm-search
  (issue #59; the paragraph on the 25 handed-over arms below).
- Mutation checks (T15): 206 mutants in scratch copies of the worktree; the replay stage killed 168, class tests and twins 17
  more, 21 survived. The survivors are equivalent mutants, or reached but not observed by any recorded field; the latter are
  follow-up issue #60 with probe-verified oracle graphs. The anchored files alone kill 129 of the 206.
- Whole suite after batch 8: coverage 98.82 / 96.83 / 98.78 / 98.82 (lines / branches / functions / statements), 956 files,
  45,206 tests. `npm test` at mission start: 923 files, 44,185 tests, 82.4 s at load 11.
- Label metrics: 16 label texts appended to `layered-label-metrics.json` by its script (16 added keys, no existing value
  changed). Landed vectors, goldens and refs are unchanged; the refs diff adds `layered-compound.json`, `refs/elk-layered/**`,
  `golden/layered.json`, 31 vendored inputs under `inputs/compound/` with their manifest rows, and the sweep test.

**Known divergences.** None found. Checked: every one of the 540 rows at the AD-4 bar (numeric within 1e-6, everything else
exact, tree level paths and `crossHierarchyMap` included); the 24 goldens, with and without `-XX:hashCode=2`; the 1,164 ok
and 5 throw sweep cases; the reversal twins of every hashed container of the 7h classes. Two reports that disagreed during the
run were reconciled and are not divergences: `ticket-425_selfLoopInCompoundNode` completes through the recorder's inline export
and throws in the sweep's `.elkt` load, on the oracle and in the port alike. Helper defects found by the replays (the
comparator's value forms, the `layerNodes` encoding) and the missing `toString` of the TS multimaps (`src/guava/Multimap.ts`,
the debug JSON printed `LinkedHashMultimap@H` for the root's `crossHierarchyMap`) were fixed at their origin; none was a
layout divergence.

**Oracle throws the port reproduces (issue #61, `needs-ruling`).** U1: `SPLINES` in `DOWN` or `UP` under `INCLUDE_CHILDREN`
throws `NullPointerException` at `SplineSegment.java:247` (inputs `040`, `160`, `701`; the port throws a `TypeError` in
`SplineSegment.anchorY`). U2: `425_selfLoopInCompoundNode.elkt` throws `NullPointerException` at `ElkGraphImporter.java:1205`.
U3: `FIXED_RATIO` with a hierarchical port throws `NullPointerException` at `LGraphUtil.java:944`, because
`CompoundGraphPreprocessor.java:182-185` passes `null` for `portNodeSize`. Each is pinned by a `sites` throw row. U4
(`LayerSweepCrossingMinimizer.java:193-194` tests one option twice; fixed upstream by
[#1210](https://github.com/eclipse-elk/elk/pull/1210), followed since the `e7eaea57` pin, #99) and U5 (`moveExternalPorts`, `HierarchicalNodeResizingProcessor.java:207-220`,
is overwritten for every nested graph) are oddities the port keeps. Nothing is filed upstream.

**The 25 handed-over arms (issue #59), settled by mission layered-arm-search (2026-11-23).** The six arms of
`NorthToSouthRoutingStrategy`/`SouthToNorthRoutingStrategy` and the 19 arms of 7c's list were searched constructively: each
guard was written out from the Java, and then an input was built backward from it or an invariant was found that excludes
it. Each arm has one outcome in `plans/layered-compound/unreached.md` § "Search outcomes (issue #59, layered-arm-search)":
reached through layout 8, reached by a site scenario only 9, proven dead 8, unreached and not proven dead 0. The arms stay
ported verbatim; no production file changed.

- **Reached (17 arms), rows withheld.** Every reached arm has a candidate input under `tools/arm-search/`, built by a
  deterministic generator, that takes the arm on an instrumented copy of the oracle and in the port. The candidates were
  recorded once as ten oracle rows (six in `layered-order.json`, four in `layered-compound.json`), and each row replayed at
  the AD-4 bar. The rows are not in the refs: three existing tests pin exact lists of row ids that the new rows join, and
  extending those lists waits for a ruling (issue #156, `needs-ruling`; the recorder entries are kept in
  `plans/layered-arm-search/withheld/record-rows.patch`). Until then these 17 arms have no oracle row.
  - North/south routing, through layout: `NorthToSouthRoutingStrategy.ts` and `SouthToNorthRoutingStrategy.ts` `:38 if[0]`
    and `:78 if[0]` (candidates `sites/HierarchicalPortOrthogonalEdgeRouter/splitSegment/{north,south}`: two ports whose
    segments conflict both ways, so one is split) and `:58 if[1]` (`…/straightEdge/{north,south}`: a port 5e-4 from one of
    its layer dummies).
  - Model-order comparators: `ModelOrderPortComparator.ts:148 if[1]` through layout
    (`scenarios/ModelOrderPortComparator/noModelOrderPorts`: a node with `considerModelOrder.noModelOrder`). By a site
    scenario only, each with the reason no real layout produces its state: `ModelOrderNodeComparatorHelperDummies.ts`
    `:120 if[1]`, `:172 if[0]` and `binary-expr[1]`, `:175 if[1]`, `:178 if[0]` and `binary-expr[0,1]`
    (`sites/ModelOrderNodeComparator/{sourceThenTargetFeedback,targetFeedbackPair}`),
    `ModelOrderPortComparatorIncoming.ts:157 if[1]` (`sites/ModelOrderPortComparator/westLongEdgeSources`) and
    `ModelOrderPortComparatorOutgoing.ts:107 if[1]` (`…/edgesWithoutModelOrder`).
  - Forster: `ForsterConstraintResolver.ts:323 if[0]` through layout
    (`scenarios/ForsterConstraintResolver/equalFloatBarycenter`: a filled-in barycenter and a merged group's mean are the
    same double).
- **Proven dead (8 arms), each from the Java text, none resting on JVM sort order, hash order or float rounding:**
  - `ModelOrderNodeComparatorHelperDummies.ts:178 if[1]` (class `ModelOrderNodeComparator`, `:456` false): a long-edge
    dummy that is neither a source nor a target feedback dummy cannot share a reference node with another dummy, because
    every dummy before the sort has exactly one incoming and one outgoing edge (`LongEdgeSplitter.java:116`,
    `InvertedPortProcessor.java:183,253`).
  - `AbstractBarycenterPortDistributor.ts:272 if[1]` (`AbstractBarycenterPortDistributor.java:270`): `inLayerPorts` only
    ever holds `EAST` or `WEST` ports (`:89`, `:155`, `:189-216`), for any graph state.
  - `ModelOrderBarycenterHeuristic.ts` `:77`, `:179`, `:184`, `:189`, `:194 if[0]` (`ModelOrderBarycenterHeuristic.java:76`,
    `:152-167`): the comparator runs only inside the class's insertion sort, which starts with empty maps, and no recorded
    relation ever holds between a pivot and the prefix element it is compared with.
  - `ForsterConstraintResolverConstraintGroup.ts:115 if[0]` (class `ForsterConstraintResolver`, `:427`): a merged pair
    `(P, G)` has `P` processed before `G`, and `G → P` would need the reverse; a group is processed once per round and only
    after every predecessor (the incoming-count invariant of `:197-213`, `:332-340`, `:422-435`).
- **Unreached, not proven dead:** none.

**Upstream typos (CLAUDE.md carve-out).** None: the journal records no prose typo in the 7h sources.

**What still throws.** Nothing in the layered algorithm. The enum tally is 59 ported, 0 pending; the staged list is empty.
The three cases that waited for `elk.stress` (row 8b) run since the ruling on issue #58 was carried out (mission
layered-stress-cases).

## Tree algorithms: mrtree, radial, vertiflex (mission 8a) {#alg-trees}

Mission 8a ported the bundles `alg.mrtree`, `alg.radial` and `alg.vertiflex`, generated their option classes and providers,
and proved them against the oracle (design, splits, shims and runbook in [alg-trees.md](architecture/alg-trees.md)).
Decisions: `plans/alg-trees/decisions.md` (TR1-TR10). `test/architecture/staged-classes.json` is `[]` and `PENDING_TYPES`
is `[]`. The providers are registered explicitly (`registerLayoutMetaDataProviders`), not by `getInstance()` (TR5, deviated:
staged provider classes, not `PENDING_TYPES`, because of the tripwire `test/melk/model-algorithms.test.ts:121-123`).

**Evidence.**

- Vector refs under `test/golden/refs/java/` (oracle `8aaa3c14`, `-XX:hashCode=2`, two cold JVMs byte-identical; the mission-end
  cold re-records are `cmp`-identical):

  | Ref                 | Rows | full | stops | throws | Recorder                              |
  | ------------------- | ---: | ---: | ----: | -----: | ------------------------------------- |
  | `mrtree.json`       |  188 |  122 |    54 |     12 | `tools/vectors/MrTreeVectors.java`    |
  | `mrtree-extra.json` |  213 |  140 |    68 |      5 | the same launcher, second output      |
  | `radial.json`       |  309 |  148 |   150 |     11 | `tools/vectors/RadialVectors.java`    |
  | `vertiflex.json`    |  471 |  247 |   216 |      8 | `tools/vectors/VertiFlexVectors.java` |

  `mrtree-units.json` (`tools/vectors/MrTreeUnitVectors.java`): 2,656 rows: `edgeRouter` 422, `cyrusBeck` 46, `orderBalance` 18,
  `average` 2,170. The two files beyond the three refs the brief names were added during the run (journaled; queue gate 6).
  The recorded throws of `mrtree.json` are 9 `IllegalArgumentException` at `ElkUtil.java:938`, 2
  `StringIndexOutOfBoundsException` at `FanProcessor.java:128` and 1 `NullPointerException` at `NodePlacer.java:219`.

- Replays: `MrTreeVectors.test.ts` (both mrtree refs, 401 rows), `RadialVectors.test.ts` (309), `VertiFlexVectors.test.ts` (471)
  run every row through the real provider: 0 mismatches except the two classified radial rows below. Isolated transitions
  for each mrtree processor (88 each) and for every radial and vertiflex step match at 1e-6.
- Goldens (TR2): `tools/oracle/regen-goldens.sh --set trees` writes `test/golden/refs/elk-trees/`: 40 refs (the `trees` set
  of `test/golden/trees.json`; 37 from T4 and 3 retargeted `*-generated-retarget` entries added by T4's `fix`), equal to the
  TS layout at AD-4 in `test/golden/tree-goldens.test.ts`. `default`, `algorithms` and `layered` regenerate byte-identically.
- JUnit: `MrTreeGraphSizeTest` 6 of 6 and `CenterOnRootTest` 2 of 2 ported with the Java's assertions; the oracle runs at the
  start and at the end of the mission are 6 / 0 and 2 / 0 (`plans/alg-trees/java-baseline.md`). `alg.vertiflex` has no
  test bundle.
- Sweep (TR6), 906 cases per algorithm (898 retarget and 8 generated); oracle throws mrtree 89, radial 365, vertiflex 553 and
  1 timeout (`de_trilateration_Trilateration`, counted, not chased). With layered registered in a scratch driver (what row 9
  will do): mrtree ok 814, mismatch 3, both-throw 89; radial ok 538, mismatch 3, both-throw 365; vertiflex ok 350, mismatch 2,
  both-throw 553, excluded 1; 0 `ts-only-throw`, 0 `oracle-only-throw`. With the tool as committed (core and the three tree
  providers): mrtree ok 657, mismatch 153, both-throw 89, ts-only 7; radial ok 417, mismatch 131, both-throw 358; vertiflex
  ok 279, mismatch 73, both-throw 553, excluded 1. Every non-ok case is diagnosed: option keys of providers the tool does
  not register (153 / 124 / 73), seven models that need layered as the child default, the eight residual cases listed under
  the divergences, nothing else. A both-throw case compares the class.
- Coverage: whole project 98.87 / 96.91 / 98.82 / 98.87 (lines / branches / functions / statements); mrtree 99.6 / 98.7 /
  99.5 / 99.6, radial 99.3 / 96.7 / 98.8 / 99.3, vertiflex 99.5 / 97.4 / 100 / 99.5. The branches and functions no recorded
  scenario reaches are in `plans/alg-trees/unreached.md`.
- Hashed containers (TR3): vertiflex has none; mrtree's iterated sites are `ComponentsProcessor.java:240-262` (`JavaHashMap`,
  `PROPERTY`) and `FanProcessor.java:39, 42, 123` (`JavaHashMap`, `STRING`; a reversed twin reproduces all 88 stops, so the
  order is unobservable); radial's iterated identity sets are the I30 sites (`RadialUtil.java:77, 224`), whose order is
  observable on one treeified row (see below). Two JVMs without `-XX:hashCode=2` differ from the mrtree ref on 0 of 188 rows
  and from the radial ref on 54 rows.
- Recursion (TR7): kept verbatim; a 2,000-deep path and caterpillar per algorithm complete in oracle and port, with and without
  `--jitless`, with layouts equal at 1e-6.

### Upstream quirks kept (mission 8a) {#alg-trees-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour". Java paths are under
`org.eclipse.elk.alg.<bundle>`.

mrtree:

- `ComponentsProcessor.java:240-262`: the doubled `!isHierarchical()` test and the never-read `broadestRow`.
- `ElkGraphImporter.java:213`: the private `toNodeBorder`, never called.
- `TGraph.toString`: the text starts with "null"; an empty graph returns null.
- `TEdge.toString`: the `hashCode()` fallback prints `e_<identityHashCode>`, stable per edge and not the JVM's number (never
  compared with the oracle).
- `TreeUtil.java:115-116, 163-164`: `TREE_LEVEL` compared by boxed reference (the `Integer` cache boundary at 127 is visible: an
  edge between two nodes of one level above 127 routes with bend points; the oracle and the port agree).
- `ComponentsProcessor.java:249`: a property default compared by reference (unobservable, see alg-trees.md § 5).
- `FanProcessor.java:105`: `String` reference comparison; the port models the identity of the `String` objects.
- `FanProcessor.java:128`: `substring` throws `StringIndexOutOfBoundsException` (BFS two-parent rows); `CompactionProcessor.java:53-55`
  returns after `begin` without `done`; its direction `switch` (`:78`, `:110`) has no case for `UNDEFINED`; `indexOf` by
  `Pair.equals` can return an earlier level with equal bounds.
- `NodeOrderer.java:116` sorts ascending although the comment says the leaves go last, so the fill-gaps loop (`:151-160`)
  never runs.
- `OrderBalance` is referenced by nothing at the pin and `OrderBalance.process` never calls `done()`; `NodePlacer` threads a
  `level` through `firstWalk` and `apportion` and never reads it; `NodePlacer.java:341` recurses forever on a node that is its own
  right sibling (`StackOverflowError`).
- `NeighborsProcessor.java:104`: a node with two parents in one level becomes its own sibling (BFS treeifying).
- `DirectionProcessor.java:41`: `UNDEFINED` rewrites unchanged values; `NodePlacer.java:101-105` writes `DIRECTION = DOWN` into the
  graph.
- `LevelProcessor.java:50` (journaled as `:48-49`): a double lookup with a fallback to 0 that no node reaches.
- `EdgeRouter.java:215` `start.y < first.x` mixes axes; `:695` `scale(1 / 2)` is an integer division (scales by 0); `:698`
  `i += 2*2*2*2*2`; `:648` a non-short-circuit `&`; `:368-371` the final `else` also takes `DOWN` and `UNDEFINED`; gap bend
  placeholders stay (0, 0) when both neighbours are null; unused `root` and `nodeBendpointPadding` locals (the `getRoot` call stays,
  it can throw); `cyrusBeck` (`:603`) is private and has no caller.
- `MultiLevelEdgeNodeNodeGap` reads `LEVELMIN` and `LEVELMAX` from `neighborTwo` in the first-node arm.
- `EdgeRouter.java:313-315, 328-330`: `DoubleStream.average` (a compensated sum; vector-proven, alg-trees.md § 6).
- `edgeRoutingMode=NONE` with an edge throws `IllegalArgumentException` at `ElkUtil.java:938` (9 recorded rows).
- `MrTree.java:77-83` and `:184-193` are `elkjs-exclude` blocks, dropped (core-engine M2). `InteractiveMrTreeGraphVisitor`
  is referenced by no class; the `interactive` rows are inert. `TreeUtil.depth`, `rootDistance`, `getSubtree`, `turnLeft`,
  `turnRight`, `TLabel`, `CompactionMode` and `GraphProperties` are ported and unused.
- `GraphBoundsProcessor.java:35-41`: the `min` throw shadows the `max` arm.

radial:

- `EadesRadial.java:108`: operator precedence (`currentRadius / currentRadius + radius`), so `tau` is NaN for every child while
  `RADIUS > 0` and the `tau < maxAlpha - minAlpha` arm is reached only for a negative `RADIUS`.
- `CrossingMinimizationPosition.java:64` computes `rootY` from `root.getX()`; `:71-73, 83-85` mutate the node's `POSITION`
  vector in place across the evaluations.
- `GeneralRotator.java:30-45` calls `begin` and never `done`.
- `RadiusExtensionOverlapRemoval.java:91` sorts and discards the result; `:73` cannot be false inside `:59`.
- `RadialUtil.shiftClosestEdgeToRadi` (`:277`) and `AbstractRadiusExtensionCompaction.getCompactionStep` (`:184`) have no
  caller; `OverlapRemovalStrategy` is unused and ported anyway (TR9).
- The fuzzy polar comparator is not transitive, so a list of 32 or more elements could sort differently from Java's `TimSort`
  (no recorded row is that large; the sweep is the check).
- `PolarCoordinateSorter.java:84`: the `arc <= DEGREE_135` false arm is reachable only for a NaN arc.
- Radial position-based options need `org.eclipse.elk.position` on every node (`NullPointerException` at `RadialUtil.java:154`
  otherwise); `compactor=RADIAL_COMPACTION` with `sorter=POLAR_COORDINATE` throws it too.

vertiflex:

- `RelativeXPlacer.java`: the fall-through in `splitNodesWithModelOrder`; the `splitGroup` loop that never advances `i`; the
  always-true `if (i < childrenSize)` (`:352`); `considerNodeModelOrder` read once on the root and once as a node property
  (`:197`).
- `NodeComparator.java:45-46` and `RelativeXPlacer.java:455-456` unbox `NODE_MODEL_ORDER`, null for nodes reached through
  hierarchy-crossing edges: a `NullPointerException`, a `TypeError` in the port (the shim `src/java/lang/Unbox.ts`).
- `BendEdgeRouter.java:70` unboxes `EDGE_BEND_HEIGHT` (null: `NullPointerException`); the BEND epsilon `1e-4` is not
  distinguished by any recorded row.
- The vertiflex throws at `:65` (cycle without a root), `:72` (two parents, self loop), `:151` (vertical constraints) and `:147`
  (`ClassCastException` for an edge to a port) are reproduced by class.

### Known divergences (mission 8a) {#alg-trees-divergences}

- Radial `stops/i30/rand-chain-big` and `full/i30/rand-chain-big` of `radial.json` (issue #64, `needs-ruling`). The next-level
  sets of levels 2 and 3 hold 12 identity-hashed nodes each; under `-XX:hashCode=2` they share one bin of the oracle's `HashSet`
  and iterate in that bin's tree order, which sets the cyclic neighbour pairs `overlapLayer` tests and so the number of
  extension steps (`n16.x` expected 299.01798935, port 305.85611690). The port keeps insertion order (AD-10). 449 of 3,000 seeded
  permutations of the three `getNextLevelNodeSet` results reproduce the oracle stop at 1e-6. Both rows are classified in
  `TREEIFIED_DIVERGENCES` (`RadialVectors.test.ts`), which asserts the stops row equals the oracle up to the step before
  `RadiusExtensionOverlapRemoval` and differs at it, so the list cannot hide another defect. The other two treeified rows
  (`shapes/binary4-sym`, `i30/four-parents-big-12`) match.
- The last-ulp `Math.sin` case in the sweep: `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2`. HotSpot's
  `Math.sin(1.6073462520335293)` is ...4178, V8 and `StrictMath` give ...4177 (`EadesRadial.java:102`); the only difference
  is the string `layoutOptions.childAreaHeight` ("2561.1171089266686" against "2561.117108926668"); geometry agrees within 1e-13
  and no discrete decision flips. Known-divergences list of AD-4.
- Seven sweep cases whose option keys belong to unported providers: `hierarchicalLayoutMixing` (mrtree) and
  `interactiveRectpacking_{hierarchy,oneBigNode}` (each algorithm), `missing layoutOptions.desiredPosition` and
  `desiredEdgeLength` (rectpacking and force; mission 8x). With the three mislabelled golden entries (`*-generated`,
  recorded with layered) they are issue #68 (`needs-ruling`).
- Stack depth: the port overflows at 2,500-3,500 deep in four of six probe shapes where the oracle overflows at 3,500-7,000
  (issue #67, `follow-up`).

**Upstream typos (CLAUDE.md carve-out).** Two progress-monitor task names, message strings nothing branches on and no ref
records: `AbsoluteXPlacer.java:32` "AbsolutPlacer" is "AbsolutePlacer" in the port (asserted by `VertiFlexPhases.test.ts`), and
`GeneralRotator.java:30` "General 'Rotator" (a stray quote) is "General Rotator" (asserted by `GeneralRotator.test.ts`). Each
port site carries a comment naming the upstream text.

**Upstream defects the ports copy (issue #65, `needs-ruling`).** BFS two-parent trees, `edgeRoutingMode=NONE`, the boxed and
`String` reference comparisons, `EadesRadial.java:108`, cyclic graphs that pass the tree checks and others; drafts for upstream,
nothing filed upstream.

**What still throws.** Nothing in the three algorithms is staged. `NodeMicroLayoutTest` still needs force, stress and
rectpacking (mission 8x).

## Force, stress and disco (mission 8b) {#alg-force-disco}

Mission 8b ported the bundles `alg.force` (the force layout `elk.force` and the stress layout `elk.stress`) and `alg.disco`,
generated their option classes and providers, and proved them against the oracle (design, evidence tables, `JavaMath.log`, the
hashed-container table and runbook in [alg-force-disco.md](architecture/alg-force-disco.md)). Decisions:
`plans/alg-force-disco/decisions.md` (FD1-FD10). `test/architecture/staged-classes.json` is `[]` and `PENDING_TYPES` is `[]`.
The providers are registered explicitly (`registerLayoutMetaDataProviders`), not by `getInstance()` (FD5); `PolyominoOptions` is
registered beside `DisCoMetaDataProvider`, as `ElkOracle.java:218-221` does.

**Evidence.**

- Vector refs under `test/golden/refs/java/` (oracle `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`; three cold runs
  by the recording agent and one by the orchestrator `cmp`-identical to each committed ref):

  | Ref           |   Rows | full | stops | throws | log    | Recorder                          |
  | ------------- | -----: | ---: | ----: | -----: | ------ | --------------------------------- |
  | `force.json`  | 20,804 |  594 |   194 |      2 | 20,014 | `tools/vectors/ForceVectors.java` |
  | `stress.json` |    431 |  320 |   108 |      3 |        | the same launcher, second output  |
  | `disco.json`  |    185 |   92 |    88 |      5 |        | `tools/vectors/DiscoVectors.java` |

  The recorded throws: force `UnsupportedGraphException` "Graph must not contain hyperedges." at `ElkGraphImporter.java:122`
  (force 2 rows, stress 3); disco `IndexOutOfBoundsException` at `TwoBitGrid.java:95` and `:225`, `NullPointerException` at
  `ElkGraphComponentsProcessor.java:108`, `IllegalArgumentException` "Passed edge is not 'simple'." at `ElkGraphUtil.java:633`
  and `NegativeArraySizeException` "-4" at `TwoBitGrid.java:117`.

- Replays: `ForceVectors.test.ts` (594 full, 194 stops, 2 throws: 259,243 hex doubles, all raw-bit identical),
  `StressVectors.test.ts` (320, 108, 3: 135,229 hex doubles, all raw-bit identical), `DiscoVectors.test.ts` (92, 88 with all
  seven stops, 5: 75,002 fields raw-bit identical and 32 within 1e-6 only, maximum 8.5e-14, none beyond; the known divergence
  below). Isolated replays of the graph classes: 906 force and stress stops raw-bit identical; 518 polyominoes raw-bit
  identical.
- Goldens (FD2): `tools/oracle/regen-goldens.sh --set force-disco` writes `test/golden/refs/elk-force-disco/`: 45 refs (force 15,
  stress 10, disco 20), twice byte-identically; `resolvedAlgorithm` equals the entry's algorithm in 45 of 45;
  `test/golden/force-disco-goldens.test.ts` (51 tests) compares every entry with its ref at AD-4. `default` (4), `algorithms`
  (9), `layered` (24) and `trees` (40) regenerate byte-identically.
- JUnit: `ForceImportTest` 3 of 3 and `TwoBitGridTest` 3 of 3 ported with the Java's assertions; the oracle runs at mission start
  are 3 / 0 and 3 / 0 (`plans/alg-force-disco/java-baseline.md`); at mission end:
  3 / 0 and 3 / 0 again.
- Sweep (FD6), oracle `sweep.sh --filter /<alg>/`, TS through `ts-layout-compare.ts` (layered registered): force planned 906,
  ok 815, mismatch 2, both-throw 89; stress planned 898, ok 807, mismatch 2, both-throw 89; disco planned 906, ok 0, mismatch
  819 (all `optionsOnly`), both-throw 87; 0 `ts-only-throw` and 0 `oracle-only-throw` in all three. The oracle throw counts
  (89, 89, 87) equal `docs/parity-report.md`. 0 mismatches are without a mechanism (below).
- Coverage: the two bundles 99.93 % statements (1,480 of 1,481), 98.67 % branches (298 of 302), 100 % functions (295 of 295),
  99.93 % lines; the whole project at the batch 5 gate 98.9 / 96.94 / 98.86 / 98.91 (statements / branches / functions /
  lines) over 47,912 tests; at mission end 98.9 / 96.95 / 98.86 / 98.91 over 47,913 tests.
- Hashed containers (FD4): the one order-observable site is `ElkGraphTransformer.java:70-71` (`incoming/outgoingExtensionsMapping`,
  read at `adjustedPorts`). A reversed-order twin changes the result in 2 of the 41 `stops` rows with extension entries
  (`stops/extShared/default`, `stops/extSharedInOut/default`) and there differs from the oracle beyond 1e-6, so the oracle used
  insertion order; the other 39 are bit-identical either way; no row matches neither order. The force bundle has none.
- `Math.log` (FD3): `EadesModel.attractive` calls the fdlibm `JavaMath.log`; the 20,014 `log` rows are raw-bit equal (native V8
  differs on 101, 0.50 %); proven on the oracle's arm64 JVM 21.0.1, unverified on x86_64.
- Recursion (FD7): kept verbatim; a 2,000-node path completes in the oracle, in TS and under `--jitless` for force, stress and
  disco. Beyond it TS overflows before the oracle (issue #70, `follow-up`).
- `U` rows: `plans/alg-force-disco/unreached.md` lists the 16 `U` rows (branches proven dead from the Java, each with its Java
  line and whether a unit test forces the arm); "neither reached nor proven dead" is empty. The four branches coverage reports
  unreached are rows 7, 8, 12 and 16.

### Upstream quirks kept (mission 8b) {#alg-force-disco-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour". Java paths are under
`org.eclipse.elk.alg.<bundle>`.

force:

- `AbstractForceModel.java:187-208` `avoidSamePosition`: `triedForBendPoints` is declared inside the `while` body, so it is
  always `false` at its test, and `triedForBendPoints = true` (`:189-196`) is a dead write. For two coincident `FBendpoint`s
  (antiparallel edges, `repulsivePower` > 0) the loop never ends: the port hangs on the same input (issue #69). `uVector ==
vVector` (`:184` block) compares two distinct objects and is always false, so the `-2` arm of `:200` is dead.
- `ComponentsProcessor.java:136-139` `dfs` lists an edge that closes a cycle twice in `component.getEdges()`, as the same
  object; the first `rebuildGraph` of a replay creates two `FEdge`s for it unless it rebuilds by name.
- `ComponentsProcessor.recombine` with several components returns an `FGraph` whose bend-point list is empty (`moveGraph`
  does not fill it).
- `ComponentsProcessor.java:227`, `:238`: `broadestRow` is written and never read. `:222` multiplies in binary32 after a
  `(float)` narrowing, then widens into `Math.max`.
- `ComponentsProcessor.split`'s `separate == null` arm, `ForceLayoutProvider.java:96` (`else` of `randomSeed != null`) and
  `FBendpoint.java:53` (`"b_" + hashCode()`) cannot be reached (`U` rows 4, 5, 7).
- `ElkGraphImporter.java:122` rejects hyperedges with `UnsupportedGraphException`.
- `ElkGraphElement.getProperty` stores a copy of a cloneable default (`ElkPadding`, `ElkMargin`) on first read, so reading
  `CoreOptions.PADDING` mid-run changes what `ElkGraphImporter.applyLayout` later reads for `ForceOptions.PADDING`.
- stress: `StressMajorization.java:261` (the final `else` throw of `getOther`) is dead through the API (`U` row 15).

disco:

- `DisCoPolyominoCompactor.java:224` builds `new Polyominoes<>(polys, aspectRatio, fill)`, a fresh holder, so
  `polyomino.lowLevelSort`, `highLevelSort` and `traversalStrategy` have no effect (issue #69; 12 goldens pin it).
- `ElkGraphUtil.firstEdgeSection(edge, false, false)` creates a (0,0)-(0,0) section for an edge without one; it does not
  throw (rows `noSection` and `corpus20` are `full` and `stops` rows).
- `ElkGraphComponentsProcessor.java:108`: `sameHierarchyLevel` dereferences `getParent()` of a parentless layout node, so a
  parent-port edge on a root layout node throws `NullPointerException` (port: `TypeError` with the HotSpot message; the
  `ext*` rows nest `g` in a root).
- `CoreOptions.ASPECT_RATIO` defaults to null, so an unset aspect ratio takes `compact()`'s null arm.
- `DCPolyomino.fillCells` blocks only the cells that cross or contain the shape boundary: a grid-aligned component blocks none,
  `getFilledBounds` then returns sentinels and `applyToDCGraph` wraps in 32 bits (the `extBoundary*InRange` rows), so `Int32`
  operations are mandatory there. A negative `aspectRatio` makes `TwoBitGrid` allocate a negative-size array
  (`NegativeArraySizeException`, `TwoBitGrid.java:117`).
- `DEBUG_DISCO_POLYS` and `DEBUG_DISCO_GRAPH` are set on the layout node (programmatic options, recorded in the rows' `debug`
  list) and are kept (FD9). `DisCoLayoutProvider.java:78-79` has a `default` arm with a `System.out.println` that one enum value
  makes unreachable (`console.log` in the port). `DisCoPolyominoCompactor.java:187` `denominator == 0.0`, `JUNCTION_POINTS !=
null` and `adjacentNodes != null` false arms are dead (`U` rows 10-14).
- Parallel streams in `ElkGraphComponentsProcessor` rethrow a copy whose stack is the caller's; the recorded throws use the
  root cause. The port is sequential in encounter order.

### Known divergences (mission 8b) {#alg-force-disco-divergences}

- Last-ulp `Math.sin` and `Math.cos` in `ElkGraphTransformer.getOrthogonalPoints` (`ElkGraphTransformer.java:627-642`), inside
  the 1e-6 bar (AD-4 known-divergences list). 32 numeric fields, all in `import` stops of `multi6/spacing60`, `multi6/combo2`
  and `bends/{default,thickness3,thickMixed,junctions}` (edge contours); every later stop is bit-exact. A controlled experiment
  replayed the 491 distinct call inputs of the 88 disco runs in the oracle JVM (21.0.1, arm64): `atan2` (171 inputs) is
  bit-identical in V8, `Math` and `StrictMath`; V8 equals `StrictMath` on all 160 `cos` and all 160 `sin` inputs; HotSpot's
  `Math.cos` differs from it on 9 and `Math.sin` on 5, by one ulp. No tolerance was loosened; no contour cell flips in any
  row.
- `layoutOptions.debug.discoGraph` (issue #71 item 1, `needs-ruling`): the oracle writes the `Object.toString()` of the
  `DCGraph` (`DisCoLayoutProvider.java:86`; no `toString`), `...DCGraph@1` under `-XX:hashCode=2`; the port writes
  `[object Object]`. In all 20 disco goldens and every disco sweep row that lays out (819 of 906; 1,503 occurrences). The
  goldens test asserts the ref value matches the identity pattern and neutralises that one key; geometry is compared in full.
  The 819 disco sweep mismatches are options-only for this key; a scratch classification finds 817 equal in full, and the
  other 2 are the rectpacking models below. A TS `toString` would add what the Java lacks.
- Option keys that depend on the unported rectpacking provider (issue #71 item 2, `needs-ruling`; issue #68's family): golden
  `force--iterations-50` (the ref names the option `force.iterations`, the port `iterations`, because
  `rectpacking.packing.compaction.iterations` shares the suffix; an explicit `SUFFIX_DIFFERENCES` row with a tripwire that
  fails once rectpacking is registered) and 6 sweep cases `retarget/{force,stress,disco}/default/examples/user-hints/
interactive-constraints/interactiveRectpacking_{hierarchy,oneBigNode}` (`layoutOptions.desiredPosition`). Closed by 8c.
- Upstream defects the ports copy (issue #69, `needs-ruling`): the `avoidSamePosition` hang and DisCo's no-op polyomino options,
  as listed under the kept quirks; drafts for upstream, nothing filed upstream.
- Stack depth: TS overflows on a path of 16,000 nodes (4,000 under `--jitless`) where the oracle completes (issue #70,
  `follow-up`).
- `Math.log` is bit-exact on the oracle's arm64 JVM 21.0.1 and unverified on x86_64 (FD3).
- The held-back stress cases (issue #58), resolved after this mission. 8b left `STRESS_PENDING` untouched and showed that
  the three cases pass from temporary copies with `elk.force` and `elk.stress` registered, and it named two further blockers:
  `layered-label-metrics.json` (four label texts missing) and the two models that were not vendored. Mission
  layered-stress-cases carried out the ruling of 2026-11-13: the filter is deleted, the runner registers both providers, the
  four texts are appended and the two models are vendored (see the 7h section).

**Upstream typos (CLAUDE.md carve-out).** None: the journal records no prose typo in the `alg.force` and `alg.disco` sources.

**Landed code fixed at the origin.** `TwoBitGrid.newWords` now throws `NegativeArraySizeException` (new shim
`src/java/lang/NegativeArraySizeException.ts`) for a computed negative size; `JsonExporter` writes a list-valued option as
`AbstractCollection.toString`. No landed expected value changed. See [translation-rules.md](translation-rules.md).

**What still throws.** Nothing in force, stress or disco is staged. `NodeMicroLayoutTest` still needs rectpacking (mission 8x);
`PlainJavaInitializationTest` and `ElkReflectTest` wait for the remaining algorithms (8x, after 8c).

## Rectpacking, spore and topdownpacking (mission 8c) {#alg-packing}

Mission 8c ported the bundles `alg.rectpacking` (`elk.rectpacking`), `alg.spore` (`elk.sporeOverlap` and `elk.sporeCompaction`) and
`alg.topdownpacking` (`elk.topdownpacking`), generated their option classes and providers, and proved them against the oracle
(design, evidence tables, decisions as built and runbook in [alg-packing.md](architecture/alg-packing.md)). Decisions:
`plans/alg-packing/decisions.md` (PK1-PK12). `test/architecture/staged-classes.json` is `[]` and `PENDING_TYPES` is `[]`. The
providers are registered explicitly, not by `getInstance()` (PK8); `SporeMetaDataProvider` registers both spore algorithms.

**Evidence.**

- Vector refs under `test/golden/refs/java/` (oracle `8aaa3c14` with patches 0001 and 0002, `-XX:hashCode=2`; an orchestrator cold
  rerun of each recorder is `cmp`-identical to the committed ref):

  | Ref                   |  Rows | full | stops | throws | other                          | Recorder                                   |
  | --------------------- | ----: | ---: | ----: | -----: | ------------------------------ | ------------------------------------------ |
  | `rectpacking.json`    | 1,356 |  558 |   151 |      7 | sort 640                       | `tools/vectors/RectPackingVectors.java`    |
  | `spore-layout.json`   |   339 |  113 |    60 |      4 | minst 95, jitter 4, objects 63 | `tools/vectors/SporeLayoutVectors.java`    |
  | `topdownpacking.json` |   898 |  296 |   288 |     18 | predicted 296                  | `tools/vectors/TopdownPackingVectors.java` |

  Two of the counts are the result of additive extensions (rows appended at the end of the scenario lists; every earlier row
  byte-identical as JSON text and in the same order): `rectpacking.json` 1,343 to 1,356 and `spore-layout.json` 274 to 276
  (T14b: arms no row reached), then 276 to 339 (the `objects` group).

- Replays: `RectPackingVectors.test.ts` (at T12, before the extension: 552 full rows with 66,304 doubles bit-exact, 145 stops
  rows with 1,069 stops and 132,339 doubles bit-exact, 6 throws; now 558, 151, 7, and the sort group), `SporeLayoutVectors.test.ts`
  (at T11: full 111 of 112, stops 59, minst 95, throws 4, jitter 4 by invariants; 67,980 doubles, all raw-bit identical),
  `TopdownPackingVectors.test.ts` (296 full, 288 stops with the real row-list lengths, 296 predicted, 18 throws).
  `JavaObjects.test.ts` replays the 63 `objects` rows. Isolated replays of the classes: rectpacking p1 165 stops (149 greedy),
  p3 34 stops (2,960 hex values bit-exact), p2 165 stops; spore 34,992 hex doubles over the stops and 13,636 over the `minst` rows.
- Goldens (PK2): `tools/oracle/regen-goldens.sh --set packing` writes `test/golden/refs/elk-packing/`: 44 refs (rectpacking 17,
  sporeCompaction 13, sporeOverlap 7, topdownpacking 7), regenerated `diff -r` identical by the orchestrator; `resolvedAlgorithm`
  equals the entry's algorithm in 44 of 44; `test/golden/packing-goldens.test.ts` (49 tests) compares every entry at AD-4 and the
  four `--minst-ties-<n>` entries are named in one test title. The five landed sets regenerate byte-identically.
- JUnit: `PaddingTest` 4, `CompactionTest` 10, `Issue583Test` 1, `UtilsTest` 3, `ScanlineOverlapRemovalTest` 1,
  `TopdownPackingTest` 4, `TopdownLayoutTest` 5, `PortPlacementCalculationTest` 2: 30 runs ported with the Java's assertions;
  the oracle runs at mission start are the same 30 runs, 0 failures (`plans/alg-packing/java-baseline.md`).
- Sweep (PK9), oracle `sweep.sh --filter /<alg>/` under `-XX:hashCode=2`, TS through `ts-layout-compare.ts`:

  | Algorithm       | planned |    ok | mismatch | both-throw | ts-only-throw | oracle-only-throw | nondeterministic (excluded) |
  | --------------- | ------: | ----: | -------: | ---------: | ------------: | ----------------: | --------------------------: |
  | rectpacking     |     919 |   830 |        0 |         89 |             0 |                 0 |                           0 |
  | sporeOverlap    |     906 | 94-97 |      0-3 |      20-21 |             0 |               0-1 |                         788 |
  | sporeCompaction |     906 |    99 |        0 |          0 |             0 |                 0 |                         807 |
  | topdownpacking  |     906 |   906 |        0 |          0 |             0 |                 0 |                           0 |

  The sporeOverlap ranges are four cases (below). No timeout and no hang; nothing from the sweep is committed (AD-5). The 6
  residual cases of 8b (`interactiveRectpacking_{hierarchy,oneBigNode}` under force, stress and disco) and the 7 tree
  residuals of issue #68 item A are `ok` with every provider registered. The `force--iterations-50` row of `SUFFIX_DIFFERENCES`
  in `test/golden/force-disco-goldens.test.ts` is removed (51 tests pass against the unchanged ref).

- Coverage, each bundle from its own tests: rectpacking 99.38 % statements, 98.12 % branches (418 of 426), 98.46 % functions;
  spore 99.21 %, 100 % (85 of 85); topdownpacking 98.61 %, 96.42 % (54 of 56); the whole project at the batch 5 gate 98.92 / 96.99 /
  98.84 / 98.92 (statements / branches / functions / lines) over 49,156 tests. `plans/alg-packing/unreached.md` lists 18 `U` rows and
  one arm neither reached nor proven dead (`Compaction.java:364`, issue #81).

### Upstream quirks kept (mission 8c) {#alg-packing-quirks}

Each is read from the Java and reproduced; all are "kept: upstream behaviour". Java paths are under
`org.eclipse.elk.alg.<bundle>`.

rectpacking:

- Fixed upstream by [eclipse-elk/elk#1239](https://github.com/eclipse-elk/elk/pull/1239) and followed since the `8bca22f4` pin
  (#104): `p2packing/Compaction.java:413` sets `nextBlock.setParentRow(row)` in `placeNextBeside`. Until then the block kept its
  old parent row (the other two sites set it, `:165` and `:323-324`) and was appended out of x order; when the row was compacted
  again (`RowFillingAndCompaction.java:117` `rowIdx--`), `wasFromNextRow` (`Compaction.java:101`) was true for a block already in
  the row, the block was added twice, and `absorbBlocks` (`:266-269`) moved a rectangle from a block into itself forever: a hang
  on the oracle and in the port (issue #73). The input of #73 and the input of the upstream test
  (`CompactionTest.testPlaceBlockFromNextRowRightWithRowHeightReevaluation`) now terminate on both sides.
- `util/RectRow.java:170-178` `removeBlock` reduces the row width even when the block is not in the row; the Compactor sets row
  width and height directly, so 35 of 381 recorded row widths (at T6) differ from `notifyAboutNodeChange`; block `minWidth`,
  `maxHeight` and `averageHeight` depend on the call history.
- `Compactor.java:69-93`: with `compaction.iterations` above 1 the ROWS list at `after:Compactor` is the first iteration's
  while node positions are a later accepted iteration's.
- `util/BlockStack.java:155-168` `placeRectsIn` stores `currentY` (with the trailing spacing) as the stack height.
- `util/RectRow.java:98-108` `calculateBlockStacks` has no caller; until the `8bca22f4` pin it did not rebuild the recorded
  stacks on four recorded rows (below).
- `p2packing/Compactor.java:193-194` `copyPosition`'s child loop is dead: `clone()` copies only direct children.
- `p1widthapproximation/AreaApproximation.java:154-157` `findBestCandidate` returns null when more than two placement options
  tie, and `:98` dereferences it: two 0 by 0 children with `spacing.nodeNode = 0` throw `NullPointerException` (a `TypeError` in the
  port; row `throws/arm/noBestCandidate`). Fixed upstream by
  [#1215](https://github.com/eclipse-elk/elk/pull/1215) (more than two tied options compare the first two); followed since
  the `e7eaea57` pin (#99).
- `RectPackingLayoutProvider.java:223-224` adds `MIN_SIZE_POST_PROCESSOR` before P2. `InteractiveRectPackingGraphVisitor` is
  applied by no code under `plugins/` (so `interactiveLayout` has no effect in a headless run), and its `endsWith` at `:47` tests
  the id against the option value in the reversed direction (kept).
- `Compaction.java:74` writes "There should not be an empty block..." to `System.err` on recorded inputs: `console.error`.
- `util/Block.java:176` (the `rows.size() > 0 ? ... : 0` else arm) is dead: `getLastRow()` at `:168` has already thrown.

spore:

- `ElkGraphImporter.java:178`, `:263-268` `shiftUntilUnique`: `(random.nextDouble() - 0.5) * 0.001` shifts a centre that equals
  one already in `nodeMap`. `random` is seeded with `randomSeed` (`:131-136`; default 1, a seed of 0 is the unseeded generator)
  since [eclipse-elk/elk#1242](https://github.com/eclipse-elk/elk/pull/1242), followed since the `8bca22f4` pin (#104). Until
  then it was an unseeded `Math.random()` (PK4, the policy of the one-argument `Collections.shuffle`).
- `ElkGraphImporter.java:233-253` `updateGraph`: a centre that equals one already in the new map is shifted with
  `shiftUntilUnique` and its node translated by the shift
  ([eclipse-elk/elk#1244](https://github.com/eclipse-elk/elk/pull/1244), followed since the `8bca22f4` pin). Until then two nodes
  at identical centres collapsed in `nodeMap`: `put` replaced the value and only the last-put node was placed. The hand-written
  unit test of that collapse was replaced by a test of the shift under the ruling of issue #105 (2026-11-19).
- `ElkGraphImporter.java:72` `minRootDistance` without a root throws `NullPointerException`; `MaxSTPhase.java:44-46` takes
  `vertices.get(0)` when the fixed preferred root names no child.
- `OverlapRemovalLayoutProvider.java:67-72` overwrites the `processingOrder.*` options of sporeOverlap; `:59-60` reads
  `hasProperty` on the compaction option and `getProperty` on the overlap option (verbatim).
- `NodeMarginCalculator.java:218-223` overwrites explicit `CoreOptions.MARGINS` on children: spore ignores them.
- `ScanlineOverlapCheck.java:166` ("Invalid hitboxes for scanline overlap calculation.", `IllegalStateException`) was reachable
  from ordinary small overlapping inputs (897 of 200,000 in the recorder's search; row `throws/overlap/scanlineHitboxes`): overlap
  removal moved two nodes onto one centre. Since eclipse-elk/elk#1244 that input lays out, and the row is
  `full/overlap/scanlineHitboxes/default` with its stops. The throw is still reachable through `NaN` rectangles, which the
  scanline `TreeSet` compares as equal (`:131-141`, `Double.compare`): 27 corpus cases, all hierarchical ptolemy models under
  sporeOverlap, where a compound node without a size gets `NaN` port positions from `ElkUtil.resizeNode` (`ElkUtil.java:266-267`)
  and so a `NaN` margin. Both sides throw the same exception (upstream behaviour, kept). With oracle patch `0004` it is 26
  cases ([carried upstream patches](#carried-upstream-patches)).
- `ElkUtil.debugFolderPath('spore')` is `null` in the port and the Java concatenates the string `"null..."`; the five sites write
  `String(...)` (`DelaunayTriangulationPhase.java:46`, `MinSTPhase.java:62`, `MaxSTPhase.java:48`, `GrowTreePhase.java:52`,
  `ShrinkTreeCompactionPhase.java:46`); nothing is written to disk. `DEBUG_SVG` is a programmatic option and is kept.
- `ElkGraphUtil.java:633` rejects a hyperedge (`IllegalArgumentException` "Passed edge is not 'simple'.").

topdownpacking:

- `GridElkNode.java:67-76` `put` **inserts** with `add(col, item)` (`:73`): every row list is `cols` plus its node count long,
  and `BottomRowEqualWhitespaceEliminator.java:58` walks back over the nulls.
- `NodeArrangementStrategy.java:38-40` and `WhitespaceEliminationStrategy.java:40-42`: single-constant enums whose `default` arms
  no input reaches (`U` row 15).
- The engine never calls a provider for a childless node, so `full/n0/default` is the untouched 0 by 0 root; a direct provider call
  (`stops/n0/default`) gives a 4 by 4 root.
- `ArrayList.add(index)` and `get(index)` throw with different texts ("Index: -1, Size: 2" against "Index -1 out of bounds for length
  2"); both are JVM texts recorded in `topdownpacking.json`, compared by class and frame.

### Known divergences and classified rows (mission 8c) {#alg-packing-divergences}

- **PK7: the `sort` rows (issue #75), resolved by the `8bca22f4` pin (#104).** Until `e7eaea57`
  `InteractiveNodeReorderer.java:56-63` returned `-1` for equal `desiredPosition`s in both directions, and 213 of the 640 `sort`
  rows were classified: on 34 the JVM sort threw `IllegalArgumentException` "Comparison method violates its general contract!",
  on 179 (all of length 32 or more) it gave another order than `Array.prototype.sort`.
  [eclipse-elk/elk#1237](https://github.com/eclipse-elk/elk/pull/1237) breaks ties by model order (`:63-71`), so the comparator
  is a total order. The recorder's copy of the comparator follows it, and exactly those 213 rows changed in the re-record (no
  row throws; the 310 rows of length 1-31 and the other 117 are byte-equal). `Array.prototype.sort` reproduces all 640 rows, with
  the new comparator and with the old one: the port's order never changed, the 213 rows had recorded the JVM sort's reaction to
  the inconsistent comparator. `test/helpers/rectpacking-sort-classified.ts` is deleted and the test asserts 640 of 640. No
  TimSort was written and no OpenJDK source was read (AD-9).
- **`RectRow.test.ts` classified rows (issue #78): the list is empty since the `8bca22f4` pin (#104).** The test
  "resetStacks followed by calculateBlockStacks rebuilds the recorded stacks of every row" collects the rows that do not rebuild
  and asserts the set equals `CHILDREN_NOT_X_GROUPED_ROWS` exactly (ruled final on #78). Until `e7eaea57` that list held
  `stops/arm/fixedBlockSkip/default`, `.../fixedBlockSkipSpaced/default`, `.../staleParentRow/default` and
  `.../staleParentRowNoSpacing/default`: the stale parent row made a later pass add the moved block to its row a second time,
  after blocks of other stacks (the rebuilt stacks numbered 3, 3, 5, 4 against 2, 2, 4, 3 recorded). With
  eclipse-elk/elk#1239 the re-recorded rows list each block once (3 and 4 blocks where they listed 4 and 5), every row rebuilds,
  and the recomputed list is empty.
- **The spore sweep cases of issue #79: settled by the `8bca22f4` pin (#104).** Until `e7eaea57` the PK4 jitter made 788
  sporeOverlap and 807 sporeCompaction sweep cases `nondeterministic` (counted, never compared), and four more cases carried `ok`
  or `throws` by chance and flickered in the TS comparison. With the seeded shift every spore case has one verdict on the oracle:
  sporeCompaction 906 `ok`; sporeOverlap 879 `ok` and 27 `throws` (the `NaN` scanline cases above). The port agrees on all 1,812:
  906 `ok`, and 879 `ok` with 27 `both-throw`. The six `#79` annotations of `tools/corpus/ts-findings.json` are removed.
  With oracle patch `0004` sporeOverlap is 880 `ok` and 26 `throws`, and the port agrees on all 906
  ([carried upstream patches](#carried-upstream-patches)).
- **Jitter rows (PK4).** The 4 `jitter` rows (corpus inputs x2, `dup5` x2) record invariants only: node count, no remaining
  overlap and an input-derived displacement bound; the TS test checks the same over three runs. Since the `8bca22f4` pin
  `runsAgree` is recorded `true` and the three runs give one dump. Exact values for the seeded shift come from the rows
  `full/overlap/scanlineHitboxes/default` and `stops/overlap/scanlineHitboxes/default` (the `updateGraph` shift, replayed at raw
  bits), the ported `RandomSeedTest` and the 1,812 sweep cases; exact `jitter` rows are proposed in a follow-up issue.
- **The flag-gated chain row.** `full/compaction/chain2000/default` (a 2,000-node path, `DepthFirstCompaction` cubic) runs only with
  `SPORE_CHAIN_FULL=1`; with the flag it equals the oracle row (8,004 doubles), measured at 321 s under vitest. The explicit-stack
  conversions of `DepthFirstCompaction.compactTree` and `GrowTreePhase.growAt` (PK6) are proven against verbatim recursive copies
  (`*.explicit-stack.test.ts`); beyond 2,000 nodes the port's stack limit is below the oracle's at the unconverted sites (issue #76,
  `follow-up`).
- **Upstream defects the ports copy.** Issue #73 (the `absorbBlocks` hang; fixed upstream by eclipse-elk/elk#1239 and in the
  port since the `8bca22f4` pin), issue #80
  (`needs-ruling`, seven further defects: the `AreaApproximation.java:98` NPE, the unused visitor and its reversed `endsWith`,
  `RectRow.removeBlock`, the stale parent row, dead `calculateBlockStacks` and `copyPosition`, spore's overwritten margins,
  `ScanlineOverlapCheck.java:166`); drafts for upstream, nothing filed upstream.
- **Open arm.** `Compaction.java:364` (`placeBeside`, `shouldRowHeigthBeReevalauted && nextBlockHeight > nextBlock.getMinHeight()`)
  is neither reached by any row nor proven dead (issue #81, `follow-up`).

**Landed shim fixed at the origin.** `src/java/util/JavaObjects.ts` `equals` called `a.equals(b)` without an identity test. The JVM's
`Objects.equals` is true for one and the same object, so a vector with a NaN component (not equal to itself under
`KVector.equals`) was not recognised by `TTriangle.contains` (`TTriangle.java:138-141`) in `BowyerWatsonTriangulation`; the
super-triangle edges stayed in the set and `ElkGraphImporter.nodeOf` found no node (`TypeError`) where Java went on. The sweep
found it (14 sporeOverlap mismatches and 5 `ts-only-throw` across sporeOverlap and sporeCompaction, all ptolemy hierarchical
models). The fix returns true for `typeof a === 'object' && a === b` before `a.equals(b)` (objects only, so `0` and `-0` stay
unequal as under `Double.equals`). The Javadoc of `Objects.equals` does not state the identity test, so AD-9 required a vector: the
group `objects` of `spore-layout.json` (63 rows appended after every existing row; `rowCounts` gains `objects: 63`) records that
`Objects.equals(v, v)` is true and `v.equals(v)` false for a `KVector` with a NaN component, that two distinct vectors with equal
NaN bits are unequal under both, that `TTriangle.contains` is true for its own NaN vertex object and false for a distinct copy, that
a `TEdge` with a NaN endpoint equals itself and an edge over the same vertex objects in either order and not one over distinct
copies, and that a boxed `Double` NaN equals NaN while `0.0` and `-0.0` are unequal. `src/java/util/JavaObjects.test.ts` replays all
63; the eight landed `JavaObjects` tests pass unchanged. After the fix sporeCompaction has 0 findings and the affected sporeOverlap
cases are both-throw.

**Landed code changed for PK3 and PK6.** `src/graph/ElkGraphPackage.ts` holds a list of classes per interface name (`registerImpl`
appends once, `isInstance` is true for any registered class; `GridElkNode` registers under `ElkNode` and its super-interfaces);
`src/alg/common/spore/DepthFirstCompaction.ts` `compactTree` is an explicit-stack loop. No landed expected value changed.
`test/golden/force-disco-goldens.test.ts` registers the new providers and drops the `force--iterations-50` suffix row; its ref is
unchanged. `tools/corpus/ts-layout-compare.ts` registers the three metadata providers and gains `neutraliseIdentity` (the
maintainer's ruling on issue #71 item 1: assert the oracle value matches `DCGraph@<hex>`, neutralise that one key on both sides).

**Upstream typos (CLAUDE.md carve-out).** One progress-monitor task name, a message string nothing branches on and no ref records:
`ToAspectratioNodeExpander.java:51` reads "To Aspect Ratio Whitesapce Eliminator"; the port reads "To Aspect Ratio Whitespace
Eliminator" (`ToAspectratioNodeExpander.ts:26`), with a comment at the site naming the upstream text;
`ToAspectratioNodeExpander.test.ts` asserts the corrected string. No other prose typo in
the three bundles is recorded in the journal.

**What still throws.** Nothing in rectpacking, spore or topdownpacking is staged. `NodeMicroLayoutTest`,
`PlainJavaInitializationTest` and `ElkReflectTest` (mission 8x) are unblocked.

## TS corpus sweep (roadmap row 9) {#ts-corpus-sweep}

Roadmap row 9 (issue #40, mission `ts-parity-dashboard`, 2026-11-13) ran every case of the oracle sweep through the TS engine, for
all 14 algorithms, in one sharded run, and published the per-algorithm result in the parity report. Design, runner protocol,
summary contract and runbook: [parity-dashboard.md](architecture/parity-dashboard.md). Decisions: `plans/ts-parity-dashboard/decisions.md`
(TP1-TP8).

**Inputs.** Oracle: ELK `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` plus seam patches 0001 and 0002, run with
`JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2"`; models commit `ac5af2ba511c0037e4f347e8bd91f013950951c7`;
macOS arm64, JDK 21.0.1, Node v26.3.1. The oracle sweep has 18,930 cases (wall 110 s, 8 shards, no parse errors, 0 `oracle-error`,
1 `timeout`: `retarget/vertiflex/default/realworld/ptolemy/flattened/de_trilateration_Trilateration`). It replaced a stale
10,881-row filtered partial (2026-11-05) that a `sweep.sh` run with a filter and no `--out` had written over the full sweep. The
previous committed report had 18,023 cases (patch 0001 only); this one has 907 more (layered native 6,265 to 7,160, rectpacking
native 21 to 24, one more generated input for each of nine algorithms). The TS sweep ran with the defaults: 14 algorithms, 8
shards, 120 s per case; wall 44.7 s, 18,930 cases with one category each, 0 `ts-aborted`, slowest case about 5.0 s
(`retarget/force/…/de_trilateration_Trilateration`).

**Result** (from the TS summary the report was generated with; `TS conformant` is `ok` + `both-throw` out of planned minus
`excluded`):

| algorithm         | planned |    ok | mismatch | both-throw | ts-only-throw | oracle-only-throw | ts-aborted | excluded | options-only mismatches |          TS conformant |
| ----------------- | ------: | ----: | -------: | ---------: | ------------: | ----------------: | ---------: | -------: | ----------------------: | ---------------------: |
| `box`             |     898 |   898 |        0 |          0 |             0 |                 0 |          0 |        0 |                       0 |     898 / 898 (100.0%) |
| `disco`           |     906 |   819 |        0 |         87 |             0 |                 0 |          0 |        0 |                       0 |     906 / 906 (100.0%) |
| `fixed`           |     898 |   869 |        0 |         29 |             0 |                 0 |          0 |        0 |                       0 |     898 / 898 (100.0%) |
| `force`           |     906 |   817 |        0 |         89 |             0 |                 0 |          0 |        0 |                       0 |     906 / 906 (100.0%) |
| `layered`         |    7163 |  7144 |        0 |         19 |             0 |                 0 |          0 |        0 |                       0 |   7163 / 7163 (100.0%) |
| `mrtree`          |     906 |   817 |        0 |         89 |             0 |                 0 |          0 |        0 |                       0 |     906 / 906 (100.0%) |
| `radial`          |     906 |   540 |        1 |        365 |             0 |                 0 |          0 |        0 |                       1 |      905 / 906 (99.9%) |
| `random`          |     906 |   534 |        0 |          0 |             0 |                 0 |          0 |      372 |                       0 |     534 / 534 (100.0%) |
| `rectpacking`     |     919 |   830 |        0 |         89 |             0 |                 0 |          0 |        0 |                       0 |     919 / 919 (100.0%) |
| `sporeCompaction` |     906 |    99 |        0 |          0 |             0 |                 0 |          0 |      807 |                       0 |       99 / 99 (100.0%) |
| `sporeOverlap`    |     906 |    94 |        0 |         21 |             0 |                 1 |          0 |      790 |                       0 |      115 / 116 (99.1%) |
| `stress`          |     898 |   809 |        0 |         89 |             0 |                 0 |          0 |        0 |                       0 |     898 / 898 (100.0%) |
| `topdownpacking`  |     906 |   906 |        0 |          0 |             0 |                 0 |          0 |        0 |                       0 |     906 / 906 (100.0%) |
| `vertiflex`       |     906 |   352 |        0 |        553 |             0 |                 0 |          0 |        1 |                       0 |     905 / 905 (100.0%) |
| total             |   18930 | 15528 |        1 |       1430 |             0 |                 1 |          0 |     1970 |                       1 | 16958 / 16960 (99.99%) |

**Categories** (`classify` and `abortedOutcome` in `tools/corpus/ts-layout-classify.ts`; every case gets exactly one).

- `ok`: the oracle verdict is `ok` and the TS output equals the oracle output at the AD-4 bar (`compareLayout`).
- `mismatch`: both laid out and the outputs differ, or both threw but different exception classes. `optionsOnly` marks a
  mismatch whose every difference is under a `layoutOptions` object (no geometry).
- `both-throw`: the oracle threw and TS threw the same class (`NullPointerException` and `TypeError`, `StackOverflowError`
  and `RangeError`; every other class by its Java simple name).
- `ts-only-throw`: the oracle laid out, TS threw.
- `oracle-only-throw`: the oracle threw, TS laid out.
- `ts-aborted`: the TS run was cut short. The detail is `timeout` (past `--timeout-ms`; the child got SIGKILL), `exit <code or
signal>` (the child died mid-case) or `startup timeout` (a fresh child did not announce `ready` within 60 s). The case
  was never compared, so it is a finding, not a pass.
- `excluded`: the oracle verdict is `nondeterministic` or `timeout`; there is nothing to compare against. The exclusions here
  are the 372 unseeded `random` cases (§ Core layouts), the spore cases whose two oracle runs differ through the
  `Math.random` jitter (§ Rectpacking, spore and topdownpacking), and the one oracle `timeout` case of `vertiflex`.
- Reported (listed under `## TS findings`): `mismatch`, `ts-only-throw`, `oracle-only-throw`, `ts-aborted`.

The in-process path (`summarize`, `runComparison`, `execute`) keeps the six categories without `ts-aborted`, because a landed
test pins that key set (AD-13); the sharded sweep (`SWEEP_CATEGORIES`, `summarizeSweep`) has seven. Whether to fold the two
lists is issue #82 (maintainer's decision).

**Residual re-runs (TP8): all 13 are `ok`.**

- Issue #68 item A (7 cases): `retarget/mrtree/default/examples/hierarchy/hierarchicalLayoutMixing`;
  `retarget/{mrtree,radial,vertiflex}/default/examples/user-hints/interactive-constraints/interactiveRectpacking_{hierarchy,oneBigNode}`.
- Issue #71 item 2 (6 cases):
  `retarget/{force,stress,disco}/default/examples/user-hints/interactive-constraints/interactiveRectpacking_{hierarchy,oneBigNode}`.

**Findings by mechanism.**

1. **A landed-port defect, fixed here (one module).** `native/layered/hierarchy-include/examples/user-hints/model-order/modelOrderCycleBreaking`
   was `oracle-only-throw`. The oracle throws `NullPointerException: Cannot invoke "java.lang.Integer.intValue()" because the
return value of "org.eclipse.elk.alg.layered.graph.LGraph.getProperty(org.eclipse.elk.graph.properties.IProperty)" is
null` at `ModelOrderCycleBreaker.java:70`. Under `hierarchyHandling: INCLUDE_CHILDREN`, `ElkGraphImporter.java:383-387` sets
   `MAX_MODEL_ORDER_NODES` and `CB_NUM_MODEL_ORDER_GROUPS` on the top-level graph only, and the property has no default
   (`InternalProperties.java:425`), so a nested graph with `cycleBreaking.strategy: MODEL_ORDER` unboxes null. The port read
   it inside `Math.max(n, null)`, which is `n` in JavaScript, and laid the graph out. The fix is in
   `src/alg/layered/p1cycles/ModelOrderCycleBreaker.ts`: both properties are read through `unboxInteger`
   (`src/java/lang/Unbox.ts`), with a unit test carrying the oracle's message in `ModelOrderCycleBreaker.test.ts`. The case is
   now `both-throw`; layered is 7,144 `ok` and 19 `both-throw` of 7,163.
   - Sibling sites, not fixed here (two more modules; issue #83, `follow-up`): `GreedyModelOrderCycleBreaker.java:37` and
     `SCCModelOrderCycleBreaker.java:97` throw the same NPE in the oracle on a crafted nested graph, and the port lays out. No
     corpus case reaches them.
   - The upstream defect itself, that nested graphs get no `MAX_MODEL_ORDER_NODES`, is issue #84 (`needs-ruling`, with a draft
     upstream issue). The port keeps the Java behaviour; the maintainer decides whether to file it.
   - Since the `8bca22f4` pin (#104) the importer refuses such a nested graph first
     ([eclipse-elk/elk#1241](https://github.com/eclipse-elk/elk/pull/1241), `ElkGraphImporter.java:377`, `:511-566`
     `ensureNoModelOrderStrategies`): the case throws `UnsupportedConfigurationException` "Node 'greedyMO' sets
     org.eclipse.elk.layered.cycleBreaking.strategy GREEDY_MODEL_ORDER, …" on both sides, with byte-equal messages. A second
     case of the same variant, `…/model-order/modelOrderCrossingMinimization`, now throws the same class (for
     `considerModelOrder.strategy NODES_AND_EDGES`) where it threw `UnsupportedGraphException` before, because the check
     runs first. Layered stays at 7,144 `ok` and 19 `both-throw`. The sibling sites of #83 are no longer reachable through
     the importer under `INCLUDE_CHILDREN`.
2. **A known last-ulp `Math.sin` divergence (issue #68 item B, accepted).** `retarget/radial/default/tests/layered/splines/sloppy_overlaps_2`
   is the one `mismatch`, options-only: `layoutOptions.childAreaHeight` is `"2561.1171089266686"` in the oracle and
   `"2561.117108926668"` in the port. It is already listed in § Known divergences (mission 8a) and annotated `#68`; the 0.01 px
   audit is issue #74.
3. **Spore jitter (issue #79, oracle nondeterminism, not a port defect).** `ElkGraphImporter.java:167-169` (spore) shifts
   coincident centres by `(Math.random() - 0.5) * 0.001`, unseeded. In this oracle sweep the four cases of #79 are
   `nondeterministic` (their two oracle runs differed), so they are `excluded`. Two further cases have verdict `throws`,
   because both oracle runs threw by chance:
   `retarget/sporeOverlap/default/realworld/ptolemy/hierarchical/ptolemy_electricpowersystem_GeneratorRegulatorProtectorSimXFMU`
   (24 repeated oracle runs: 20 throws, 4 layouts, all 4 distinct; 12 TS runs: 6 `both-throw`, 6 `oracle-only-throw`) and
   `retarget/sporeOverlap/default/realworld/ptolemy/hierarchical/ptolemy_test_auto32_GeneratorRegulatorProtectorSimXFMU` (24
   oracle runs: 16 throws, 8 distinct layouts; 12 TS runs: 9 and 3). So a TS sweep shows 0, 1 or 2 `oracle-only-throw`
   findings from these two; the final run shows 1 (`test_auto32`), and two earlier runs of the same oracle sweep differed in
   exactly this one case. All six cases are annotated `#79` in `tools/corpus/ts-findings.json`; annotations change no
   category or count. How the sweep treats them (a wider determinism check, a list of known cases, or leaving them) is the maintainer's decision under #79.
   Since the `8bca22f4` pin (#104) the shift is seeded (eclipse-elk/elk#1242): no spore case is `nondeterministic`, all six
   cases are `ok` on both sides, and the annotations are removed (§ Known divergences and classified rows, mission 8c).

No `ts-only-throw` and no `ts-aborted` case exists in this run.

**Reproduce.** Run from the repository root with the oracle built (§ 4); `ELK_ORACLE_DIR` and `ELK_MODELS_DIR` as in
`CLAUDE.md`. Expected exit codes are in the runbook of [parity-dashboard.md](architecture/parity-dashboard.md#parity-dashboard-runbook).

1. Oracle sweep, full, into the default directory `$ELK_ORACLE_DIR/sweep/<elk>-<models>/` (about 2 minutes):
   `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2" nice -n 10 tools/oracle/sweep.sh`.
2. TS sweep, all algorithms, `min(cores, 8)` shards, 120 s per case; it exits 1 while findings exist:
   `npx tsx tools/corpus/ts-layout-compare.ts --out "$TMPDIR/ts-final.json"`. Narrower or slower runs take
   `--algorithms radial,box`, `--filter examples/`, `--shards 4` and `--timeout-ms 300000`.
3. Write the report, then check that it is current (exit 0 current or written, 1 stale, 2 usage or tool error):
   `npx tsx tools/corpus/parity-report.ts --write --ts-summary "$TMPDIR/ts-final.json"`, then the same command without
   `--write`.
4. Mirror the report into the site and build it: `npm run docs:build`.

The commands are a list, not a fenced block, on purpose: `test/docs/translation-lint.test.ts` requires every translated copy
of this page to carry the same code fences as this file, and the page has none.

A filtered oracle sweep (`--filter`, `--limit`) must pass `--out <scratch dir>`; without it, it overwrites the default
directory that the report reads.

**Supersedes.** `parity-report.ts` now requires `--ts-summary <file>` (exit 2 without it). The report command shown in § 3
("Parity report (D9)") and in the § 6 gates table is without the flag and is older than this section; use the commands above.

## Text-sizing seam (roadmap row 10) {#text-sizing-seam}

Roadmap row 10 (issue #41, mission `text-sizing-seam`, 2026-11-13) made the oracle's label-text measurement pluggable, so that
a platform-independent measure can be compared between the oracle and the TS port. Design and runbook:
[text-sizing-seam.md](architecture/text-sizing-seam.md). Decisions: `plans/text-sizing-seam/decisions.md` (TX1-TX8).

**What was patched, and why only the test bundle (TX1).** Patch `0003` changes only `test/org.eclipse.elk.alg.test`. At the pin
the one place that measures text is `TestConfiguration.computeLabelSize` (AWT font metrics). No plugin measures text:
`Core.melk` declares `font.name` and `font.size` as programmatic options, and no plugin reads them for sizing. The patch adds
no class or method to a plugin bundle, and the golden harness and the vector recorders never size a label.

**Two modes, and which side uses which (TX3).** With the property unset the oracle measures through AWT as before, and the TS
runner keeps the FX8 snapshot (`layered-label-metrics.json`) as its default measurer. Fixed mode is the normalized,
platform-independent path; both sides use it only for the oracle-against-TS comparison of label-bearing models. The snapshot
is neither replaced, re-recorded nor extended.

**The fixed measure (TX4).** `width = text.length() * 6.0` and `height = 12.0`, where `length()` counts UTF-16 units as JS
`.length` does. Both constants are integers, so every result is exact and no `Math.*` call is involved. Line breaks are not
special. This is not a font model.

**Evidence.**

- Non-impact of the patch on the default mode (TX7), three checks. Class hashes: 1,348 `.class` entries before the rebuild and
  1,351 after; the only differences are `TestConfiguration.class` (changed) and `AwtTextMeasurer`, `FixedAdvanceTextMeasurer`
  and `TextMeasurer` (added), so every class of the 16 jars of `oracle-build.json` and of every other test bundle is
  byte-identical. JUnit in
  default mode over the 43 runner suites: 5,619 runs, 0 failures, and the output equals the one before the patch. The AWT
  re-measure through the patched `TextMeasurer.fromSystemProperty()` equals the FX8 snapshot on 2,317 of 2,317 texts, and the
  output file is byte-identical to the committed snapshot. No vector recorder is rerun, because none has
  `org.eclipse.elk.alg.test` on its classpath.
- `test/golden/refs/java/label-sizing.json` (TX6a; recorder `tools/vectors/label-sizing-vectors.sh`, fixed mode; macOS arm64,
  JDK 21.0.1, `-XX:hashCode=2`): 17 `texts` rows and 119 vendored label-bearing models (108 under `test/golden/inputs/labels/`,
  19 under `test/corpus/elkt-curated/`, 8 content duplicates dropped), 1,052 label rows of which 131 are `preset` by the model,
  no `throws`. `test/golden/label-sizing.test.ts` (239 tests) checks, for all 119 models, the label keys in order and every text,
  size and `preset` flag exactly, and the TS layout against the oracle's at 1e-6. With the fixed advance mutated to 7 in
  scratch, 230 of the 266 tests of the two new test files fail.
- Corpus comparison (TX6b): 759 label-bearing elk-models (209 `elkt`, 550 `json`) with 21,753 label rows, of which 1,513 are
  sized by the measurer and 20,240 are preset by the model. The oracle's sizes are local only (AD-5), under
  `$ELK_ORACLE_DIR/sweep/label-sizing/`; `test/corpus/label-sizing-sweep.test.ts` compares every row exactly and skips without
  its input directory. Result: 759 of 759 models and 21,753 labels equal. The directory lies under `sweep/` because
  `tools/oracle/build.sh` treats a new untracked directory at the oracle root as a stale worktree (issue #85).
- Runner parity in fixed mode (TX6c), 43 suites. The oracle ran 5,619 JUnit runs with 0 failures, per class equal to default
  mode; the TS runner ran 5,669 tests with 0 failures and 1 skipped. The TS runner describe equals the JUnit line for 41 of 43
  classes. The other two, `Issue665Test` (JUnit 1, TS 0) and `Issue700Test` (JUnit 4, TS 2), are the three stress-dependent
  cases of issue #58 and differ identically in default mode, so the measurer is not the cause. These runs used a scratch copy
  of `tools/oracle/java-tests.sh` with `org.eclipse.elk.alg.common.test` added to its test bundles, because three suites live
  there; the committed script covers the `alg.layered.test` and `alg.test` bundles only. Later (mission layered-stress-cases,
  issue #58's ruling) those two classes agree too: `Issue665Test` 1 and `Issue700Test` 4 on both sides, in default mode
  and in fixed mode.
- Regenerated refs (TX8), by script only: the `patches` array of the nine `_meta.json` files gained
  `0003-alg.test-pluggable-label-text-measurer.patch`, and nothing else moved (`regen-generated.sh` left no diff). The parity
  report changed in its patch line only. A fresh oracle sweep also moves six `sporeOverlap` verdicts (unseeded jitter, issue
  #79) and every timing column, so those rows were not regenerated and wait for the ruling in issue #86; the committed report
  was not regenerated from the fresh sweep, and `parity-report.ts` without `--write` reports it stale against the live cache.

**Reference platform (#52 ruling).** The row's evidence is recorded on macOS on Apple Silicon (arm64) with JDK 21.0.1, which
the maintainer ruled the reference platform for JVM measurements.

**Left out.** A font model (not wanted: the fixed measure approximates nothing); the four label texts that
`layered-label-metrics.json` lacks (issue #58, unchanged, and the runner still throws naming a missing text); the snapshot
itself, which this mission does not re-record, extend or edit. Mission layered-stress-cases appended those four texts later
(issue #58's ruling); the runner still throws on any other text the snapshot lacks.

## Temporary gaps

Known differences from the Java after mission 3 (core metadata), each with the mission that closes
it. Generator background: [melk-codegen](architecture/melk-codegen.md).

**Held-back registrations (C1).** Their providers are not ported, so the generator skips them;
the registry check subtracts them (`test/melk/held-back.ts`).

- Algorithm `org.eclipse.elk.fixed` (`FixedLayouterOptions`): closed by mission 5.
- Algorithm `org.eclipse.elk.box` (`BoxLayouterOptions`): closed by mission 5.
- Algorithm `org.eclipse.elk.random` (`RandomLayouterOptions`): closed by mission 5.
- Dependency `topdown.sizeCategories` requires `sizeApproximator == FIXED_INTEGER_RATIO_BOXES`
  (`Core.melk:920`): closed by mission 5.
- Derived backup category `""`/`"Other"` that `Registry.applyDependencies` creates for the three
  category-less algorithms: absent from the TS service, closed by mission 5.

**Deferred JUnit cases (C10).** Ported unchanged once the algorithms above are registered.

- `LayoutDataContentAssistTest.Other.testAlgorithmSpecificKnown`: closed by mission 5.
- `LayoutDataContentAssistTest.Other.testAlgorithmSpecificUnknown`: closed by mission 5.

**Deferred graph.json JUnit cases (J6).** `transferLayout` is covered meanwhile by the JVM replay
`test/graph-json/transfer-replay.test.ts` (13 cases); 31 of the 36 upstream methods are ported.

- `EdgeCoordsTest` (whole file, one method): needs the layered algorithm; closed by mission 7h (ported, T11).
- `IndividualSpacingsTest.importIndividualSpacingsTest`: needs layered; closed by mission 7h (ported, T11).
- `SectionsTest.preserveSectionIdsTest`: needs the `random` algorithm; closed by mission 5.
- `TransferLayoutTest.transferLayoutEdgeSectionExistsTest`: needs the `random` algorithm; closed by
  mission 5.
- `LayoutOptionsTest.exportLayoutOptions`: layered's `priority.direction` (`Layered.melk:732`) makes
  the suffix `direction` ambiguous on the JVM, so `getShortOptionKey` writes `elk.direction`; the
  CoreOptions-only port (J10) writes `direction`; closed by mission 7h (ported, T11).
- Converter rows for the algorithms `fixed`, `box`, `random` and the `""`/"Other" category
  (`MISSION5_PROVIDERS`; `CoreOptions.ts` withholds them): closed by mission 5.
- Parse inputs strip `layering.layerId` and `crossingMinimization.positionId` (J7 amendment,
  `STRIP_KEYS`): closed by mission 7h. `resolvedAlgorithm` is stripped permanently (see the quirks).

**Deferred graph.text cases (G3).** The sweep and the validator vectors skip what needs the algorithms
above.

- `ElkGraphValidator` rows tagged `mission5` (11 vector rows) and 4 sweep models naming `fixed`/`box`:
  `MISSION5_ALGORITHMS` filter; closed by mission 5, which also regenerates the core-registry refs.
- Layered options (for example `priority.direction`) are unknown properties in the CoreOptions-only
  registry; `.elkt` refs regenerate in missions 5 and 7.

**Behavioural divergences.**

- `GraphIssue.hashCode` uses a WeakMap-and-counter identity hash, not the JVM's `identityHashCode`
  (T5): values differ from the JVM, equal issues still hash equal; open.
- `IElkProgressMonitor.getDebugFolder()` returns `string | null` for `java.nio.file.Path` (C8): open
  by design.
- `BoxedComparable.toString` prints a `Double` bound `0.0` as `0` (T8): fix when
  `LayoutOptionValidator` is ported (its only `toString` consumer); open.
- Service collection getters (`getAlgorithmData()`, `getOptionData()` and kin) return snapshot arrays, not live
  unmodifiable views (T14): open.
- `LayoutMetaDataService.getKnownOptionIds()` returns a snapshot `Set` in `JavaHashMap` key order,
  not a live `keySet()` view (T10): open.
- Identity-hash order (AD-10): `ok-sections-linked` section 44 `outgoingSections` is filled by the
  JVM from a `HashMultimap` of identity-hashed `ElkEdgeSection` (`JsonImporter.xtend:313-314`) and
  varies between runs; the port uses insertion order and the vectors record the id lists sorted.
- JDK helpful-NPE messages embed compiled local names, so NPE vector rows compare by class only
  (`TypeError`, D10).
- Unknown export endpoint (user decision 2026-10-14): the exporter calls `formatError(...)` without
  `throw` (`JsonExporter.xtend:183,196`), so an edge endpoint outside the exported graph reaches
  `toJson(null)`. The oracle (Gson 2.11) throws a message-less `NullPointerException` from
  `JsonPrimitive(null)`; the port throws a message-less `IllegalArgumentException`, what Gson 2.8.x's
  `JsonPrimitive(null)` threw. 48 export rows (3 fixture/mod sets x 16 flag sets, `foreignTarget`
  and `foreignSource`) record the NPE and are expected to throw the IAE (`UNKNOWN_ENDPOINT_IAE` in
  `ElkGraphJson.test.ts`, `JsonExporter.test.ts`); the `gson.json` rows of `JsonPrimitive` keep the
  2.11 NPE.
  The same mapping covers the `.elkj` export of an unresolved proxy reference (mission 4c, D13; section 8).

- Gson subset gaps: writer rows with `Long`/`Float`/`Short`/`Byte`/`BigDecimal`/`BigInteger`
  numbers are not modelled (graph.json never builds them); `JsonWriter` writes parsed-number text
  without the validation `JsonPrimitive.toString` applies; `JsonReader` misuse-error texts are
  unrecorded.

**Upstream quirks of `graph.json` (J5).** Each is vector-proven on the JVM and reproduced; all are
"kept: upstream behaviour". Detail: [elk-json.md](architecture/elk-json.md).

- A missing section or bend-point coordinate is a null-unboxing NPE; a missing shape coordinate is
  0; kept: upstream behaviour.
- Duplicate ids overwrite earlier map entries; kept: upstream behaviour.
- `HashBiMap` rejects equal JSON node objects (`{"id":3}` equals `{"id":3.0}`) with
  `IllegalArgumentException` "value already present"; kept: upstream behaviour.
- Exporting an imported graph with linked sections throws an NPE whenever sections are exported
  (`incomingSections +=` back-links a not-yet-registered section); `omitLayout` succeeds; kept:
  upstream behaviour.
- A lenient trailing comma in an array yields a null element, then `IllegalStateException` "Not a
  JSON Object: null"; kept: upstream behaviour.
- `transferLayout` only adds keys (stale keys stay); `sections` is removed and re-added, so it moves
  to the end; a layout-created label throws an NPE; a layout-created section that is linked raises
  `implementationError` ("Severe implementation error in the Json to ElkGraph importer."); kept:
  upstream behaviour.
- An input containing `resolvedAlgorithm` (any layout export) fails on import with
  `IllegalStateException` "IDataType class expected for layout option
  org.eclipse.elk.resolvedAlgorithm"; kept: upstream behaviour.
