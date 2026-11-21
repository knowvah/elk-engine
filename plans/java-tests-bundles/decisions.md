<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: java-tests-bundles (issue #97)

AD-1…AD-16 (`plans/elk-engine-skeleton/decisions.md`) and the queue rules apply. D1-D6 were auto-confirmed at
planning (unattended run, 2026-11-20); evidence and rejected options are under
[Auto-confirmed](#auto-confirmed-unattended).

## D1. Carry every cited test bundle in `TEST_BUNDLES`

`tools/oracle/java-tests.sh:34` becomes a fixed list of thirteen bundles: the two it carries now, first and in their
current order, then the eleven others alphabetically:

```text
org.eclipse.elk.alg.layered.test org.eclipse.elk.alg.test
org.eclipse.elk.alg.common.test org.eclipse.elk.alg.disco.test org.eclipse.elk.alg.force.test
org.eclipse.elk.alg.mrtree.test org.eclipse.elk.alg.radial.test org.eclipse.elk.alg.rectpacking.test
org.eclipse.elk.alg.spore.test org.eclipse.elk.alg.topdown.test org.eclipse.elk.core.test
org.eclipse.elk.graph.json.test org.eclipse.elk.graph.test
```

Wrapping the array over several lines is fine. No environment variable, no flag, no glob. `org.eclipse.elk.shared.test`
stays out: no TS file cites it, and it needs `org.eclipse.elk.alg.graphviz.layouter`, which is not an oracle jar.
Update the header comment (`:3-10`), which says "the compiled classes of the layered and alg test bundles", to say the
script carries every test bundle a TS test cites by path plus `alg.test` (the framework), and that the fitness test of D3
keeps the list complete. The rest of the script (`build_classpath`, `run_class`, `main`) does not change.

## D2. `THIRD_PARTY` and `tools/vectors/` do not change

The planning probe (D5) ran all 43 classes of the eleven new bundles with the current `THIRD_PARTY` list: 278 runs,
0 failures, no class-loading error. The only `Require-Bundle` entries of the eleven manifests not in the list are
`org.hamcrest.library` (Hamcrest 3, already on it, carries the library matchers) and `org.eclipse.swt` (from
`alg.test`, already carried today without it). `tools/vectors/label-sizing-vectors.sh:25` says its `THIRD_PARTY` is
"Same list as tools/oracle/java-tests.sh"; leaving the list alone keeps that true. Editing anything under
`tools/vectors/` also colds the vector cache (`VC_INPUT_DIRS`, `.agent-notes/oracle-stale-caches-planning.md`), so the
mission never does.

## D3. A fitness test keeps the list complete

New `test/architecture/java-tests-bundles.fitness.test.ts`, in the style of `staged-classes.fitness.test.ts` (plain
`node:fs` walk, no git):

- Collect every match of `org\.eclipse\.elk\.[a-z.]+test[a-z.]*/src/[A-Za-z0-9_/]+Test\.(java|xtend)` in the `.ts`
  files under `src/` and `test/` (all 145 citing files are `.ts` at planning); the bundle is the text before the first
  `/`.
- Parse `TEST_BUNDLES=( … )` from `tools/oracle/java-tests.sh` (multi-line safe: everything between the parentheses,
  split on whitespace).
- Assert: the cited bundles minus the carried ones is `[]` (the failure message lists the missing bundles), and
  `org.eclipse.elk.alg.test` is carried. Add one case that the collector finds a known citation (for example
  `org.eclipse.elk.graph.json.test` from an `.xtend` path) so an empty scan cannot pass vacuously.

Red first: on the base script the first assertion fails listing exactly the eleven new bundles; journal it.

## D4. The class list includes the Xtend suites (143 at planning, not 124)

The issue's grep matches only `Test.java`. Eight `graph.json.test` suites are cited as `.xtend` (`EdgeCoordsTest`,
`EdgesTest`, `ExportTest`, `GraphTest`, `IndividualSpacingsTest`, `LayoutOptionsTest`, `SectionsTest`,
`TransferLayoutTest`); their classes are compiled into `target/classes` and run as plain JUnit 4. Ports since #44 also
grew the count: 100 layered `.java` classes, 35 other `.java`, 8 `.xtend` = 143. The runbook's section 10 becomes two
commands, and T1's "after" run uses them verbatim:

```sh
git grep -hoE 'org\.eclipse\.elk\.[a-z.]+test[a-z.]*/src/[A-Za-z0-9_/]+Test\.(java|xtend)' -- src test | sort -u |
  sed -E 's#^[^/]+/src/##; s#\.(java|xtend)$##; s#/#.#g' >"$TMPDIR/ported-classes.txt"
MODELS_REPO="$ELK_MODELS_DIR" nice -n 10 tools/oracle/java-tests.sh $(cat "$TMPDIR/ported-classes.txt") | tee "$TMPDIR/java-tests.txt"
```

`sort -u` before `sed` keeps the order of today's runbook (by path), so an old-oracle file recorded with these commands
diffs line by line. A count other than 143 at mission start is not a stop: journal the actual count and list.

## D5. Evidence: before and after on the pinned oracle

1. **Before** (T1 step 1, landed script, no edit yet): the 100 `alg.layered.test` classes, listed by D4's pipeline
   filtered to `^org\.eclipse\.elk\.alg\.layered\.test/` before `sed`. Expect 51,299 runs, 0 failures (runbook
   section 10 at the pin).
2. **After** (T1, edited script): D4's commands, all 143 classes.
3. The 100 layered lines of "after" equal "before" byte for byte (more bundles on the classpath must not change a
   count), and the 43 other lines equal the planning probe below. Journal all 143 lines and the totals as the baseline
   the issue asks for.

Planning probe (scratch copy with D1's list in `$TMPDIR`, 2026-11-20, load 10.3, `MODELS_REPO` set, every class
`failures=0`): `RectilinearConvexHullTest` 2, `OneDimensionalCompactorTest` 17, common `Issue475Test` 2,
`NetworkSimplexTest` 1, `InsidePortLabelTest` 1, `NextToPortLabelPlacementTest` 2, `PortLabelPlacementVariantsTest` 24,
`TwoBitGridTest` 3, `ForceImportTest` 3, `MrTreeGraphSizeTest` 6, `CenterOnRootTest` 2, rectpacking `CompactionTest` 11,
`InteractiveNodeReordererTest` 3, `PaddingTest` 4, `Issue1214Test` 4, `Issue583Test` 1, `RandomSeedTest` 6,
`ScanlineOverlapRemovalTest` 2, `UtilsTest` 3, `PortPlacementCalculationTest` 2, `TopdownLayoutTest` 5,
`TopdownPackingTest` 4, `LayoutConfiguratorTest` 5, `RecursiveGraphLayoutEngineTest` 4, `AlgorithmAssemblerTest` 8,
`LayoutProcessorConfigurationTest` 7, `SpacingConfigurationTest` 58, `LayoutDataContentAssistTest` 15, core
`Issue457Test` 1, `Issue489Test` 2, `BezierSplineTest` 5, `CubicSplineInterpolatorTest` 1, `ElkMathTest` 21,
`EdgeCoordsTest` 1, `EdgesTest` 3, `ExportTest` 6, `GraphTest` 5, `IdTest` 7, `IndividualSpacingsTest` 3,
`LayoutOptionsTest` 4, `SectionsTest` 4, `TransferLayoutTest` 3, `ElkGraphUtilTest` 7. Total 278. These agree with the
counts earlier missions recorded through scratch copies (trees 6/2, force/disco 3/3, rectpacking+spore 34, topdown
4/5/2, common nodespacing 1/2/24, graph.json 1/4/3).

## D6. Docs scope

English only; the architecture pages have no translations (`docs-site/<locale>/` holds `conformance.md`, `guide/`,
`index.md`, `showcase/`).

- `docs/architecture/elk-upgrade.md` § 10 (`:457-475`): D4's two commands replace the three; the "About 8 minutes"
  line gives the 143 classes, the new total runs and the measured time; the "32 ported classes … need a scratch copy"
  sentence goes. § 5 step 1 (`:149`) "the three commands of section 10" → "the commands of section 10".
- The "Java baseline" sentences that send a reader to a scratch copy now point at the landed script:
  `alg-trees.md:336-346`, `alg-force-disco.md:354-364`, `alg-packing.md:517-518`, `alg-layered-pipeline.md:132-133`,
  `alg-layered-compound.md:387-388`, `text-sizing-seam.md:78-81`. Keep each paragraph's expected counts; replace the
  `sed` recipe with a direct `tools/oracle/java-tests.sh` call.
- Not edited: `plans/*/java-baseline.md` and earlier journals (archaeology), and the past-tense mission records in
  `docs/conformance.md` (`:1173`, `:1615`, `:2350`), which say what an earlier mission did.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected, with evidence |
| -------- | ------ | ----------------------- |
| D1 | fixed list of all 13 | The issue's env extension (`JAVA_TESTS_BUNDLES` appended): the runbook would still have to spell out eleven names, an unset variable silently drops 43 classes, and it is a knob with one caller. A glob over `$ELK_ORACLE_DIR/test/*/target/classes`: adds `shared.test` (needs `alg.graphviz.layouter`, not built into `oracle-build.json`) and would take any future bundle unseen, where the script now dies naming a missing bundle. No duplicate class or resource across the 13 bundles' `target/classes` (checked at planning), so carrying them all cannot shadow a class. |
| D2 | no `THIRD_PARTY` change | Adding the manifests' `org.hamcrest.library`/`org.eclipse.swt`: the probe shows neither is needed, and changing the list breaks `label-sizing-vectors.sh`'s "Same list" claim, whose fix colds the vector cache. |
| D3 | fitness test, cited ⊆ carried | No test: the next ported bundle would silently fall out of section 10 again, which is how #97 arose. A count pin (143): breaks on every new port. A check that each bundle exists under `$ELK_ORACLE_DIR`: needs the oracle, absent in CI; `java-tests.sh` already dies on it. |
| D4 | `.java` and `.xtend` | The issue's `.java`-only grep: leaves the eight graph.json Xtend suites to a scratch copy, which the issue's "done when" excludes. |
| D5 | before/after over the layered set + probe | Only an after-run: cannot show the wider classpath left the 100 layered counts unchanged. |
| D6 | English architecture docs, no history edits | Rewriting `plans/*/java-baseline.md` or the conformance records: forbidden (plans are archaeology) or past-tense facts. |

Nothing here is reserved for the maintainer: `java-tests.sh` is repository tooling, not an oracle patch, `ELK_COMMIT`
or a divergence; no test expectation changes; the change is reversible by reverting one commit. `../elk` has no commit
after the pin under `plugins/` or `test/` (checked at planning).
