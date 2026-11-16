<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: text-sizing-seam, roadmap row 10 (issue #41; auto-confirmed at planning, 2026-11-13)

This mission was planned unattended (`/plan-mission --unattended`). Every row below is the planner's recommendation. The
rejected options and the evidence are under [Auto-confirmed (unattended)](#auto-confirmed-unattended), for the maintainer to
audit. The rows amend AD-1…AD-16 and the earlier missions' rows; they never rewrite them. Cite a row as
`text-sizing-seam TX3`. The maintainer's ruling from #52, posted on #41 (2026-11-13), binds every row: macOS arm64 with
JDK 21.0.1 is the reference platform, and the FX8 snapshot stays the reference and is never re-recorded elsewhere.

| ID | Decision |
|----|----------|
| TX1 | **Patch site.** Patch `0003` changes only the test bundle `test/org.eclipse.elk.alg.test`. That bundle holds the one text measurement at the pin, `framework/config/TestConfiguration.java:179-198` (`computeLabelSize`, AWT font metrics). No plugin measures text: `Core.melk:712-730` declares `font.name` and `font.size` as programmatic options, and no plugin reads them for sizing. The patch adds no class or method to any plugin bundle. |
| TX2 | **Shape of the Java seam.** There are three new files in `org.eclipse.elk.alg.test.framework.config`. `TextMeasurer` is an interface with `KVector measure(String text)` (x is the width, y the height) and a static `fromSystemProperty()`. `AwtTextMeasurer` holds the current body of `computeLabelSize` verbatim: the `os.name` choice between Arial and SansSerif, the 1x1 ARGB image, plain style, size 10 and `getStringBounds`. `FixedAdvanceTextMeasurer` is described in TX4. `computeLabelSize` keeps its guard and its `setHeight`-then-`setWidth` order, and takes the size from `TextMeasurer.fromSystemProperty().measure(label.getText())`. Property `org.eclipse.elk.alg.test.textMeasurer` (named after 0001's `org.eclipse.elk.graph.json.exportSeed`): unset or `awt` gives AWT, `fixed` gives the fixed-advance measurer, and any other value throws `IllegalArgumentException` naming the value. Patch file: `tools/oracle/patches/0003-alg.test-pluggable-label-text-measurer.patch`. |
| TX3 | **Default unchanged, so the seam and the snapshot coexist ("both").** With the property unset the oracle measures through AWT exactly as before, the JUnit suites run as before, and the TS runner keeps the FX8 snapshot (`layered-label-metrics.json`) as its default measurer. The fixed mode is the normalized, platform-independent path. Both sides use it only for the oracle-against-TS comparison of label-bearing models (TX6). The snapshot is neither replaced nor re-recorded nor extended. The runner's missing-text throw and #58's four missing texts stay as they are. |
| TX4 | **The normalized measure.** `FixedAdvanceTextMeasurer` gives `width = text.length() * 6.0` and `height = 12.0`. `String.length()` counts UTF-16 units, as JS `.length` does. Both constants are integers, so every result is exact in binary and no `Math.*` call is involved. They are 0.6 and 1.2 times the framework's `DEFAULT_LABEL_FONT_SIZE` of 10, kept as literal `6.0` and `12.0` so that no floating product appears. Line breaks are not special, because AWT's `getStringBounds` measures one line. This is not a font model, which the issue excludes. |
| TX5 | **Where the TS seam lives.** The seam goes in `test/helpers/`, beside the FX8 port of `TestConfiguration` (`layout-test-labels.ts`), not in `src/`. The Java site is test-framework code, the runner is test-only, and AD-14 forbids a new public surface before the first publish. New module `test/helpers/layout-test-text-measurer.ts` exports a `TextMeasurer` interface (`measure(text): KVector`), `AWT_SNAPSHOT_TEXT_MEASURER` (the FX8 table; an unknown text throws as today), `FIXED_ADVANCE_TEXT_MEASURER`, and `textMeasurerFrom(env)`. The env variable is `ELK_TEST_TEXT_MEASURER`, with the same values and the same throw as the property. `ensureSensibleLabelSize(graph, measurer = AWT_SNAPSHOT_TEXT_MEASURER)` gains the parameter, the runner passes `textMeasurerFrom(env)`, and no existing call site or assertion changes. `docs/conformance.md` § 4 step 3 gains a sentence: a seam whose Java site is in a test bundle lives in `test/helpers/`. |
| TX6 | **Evidence that "TS and oracle sizes agree on label-bearing models".** (a) New recorder `tools/vectors/LabelSizingVectors.java` plus `label-sizing-vectors.sh` runs with the property set to `fixed`. It writes ref `test/golden/refs/java/label-sizing.json` containing: a `texts` block of direct `measure` rows over `tools/vectors/label-sizing-texts.txt`; and, for each vendored label-bearing `.elkt` (115 under `test/golden/inputs/labels/` and 22 under `test/corpus/elkt-curated/` at planning, deduplicated by content hash), every label's key, text and size after the real `TestConfiguration.apply`, plus the model's layout after sizing (its own algorithm, through `RecursiveGraphLayoutEngine`). (b) The same recorder in `--corpus <dir> --out <dir>` mode covers the 759 label-bearing elk-models (`census.json` `labels > 0`, parse `ok`) and writes sizes only, locally under `$ELK_ORACLE_DIR/label-sizing/`, which is never committed (AD-5). A skip-gated test compares them (`LABEL_SIZING_SWEEP_DIR`). (c) The runner suites run with the fixed measurer on both sides, `java-tests.sh` with the property passed through `JAVA_TOOL_OPTIONS` and the TS runner with `ELK_TEST_TEXT_MEASURER=fixed`. The per-class outcomes must be equal, and they are journaled. |
| TX7 | **Proof that the default is unchanged.** Before the rebuild, record the sha256 of every `.class` entry of every jar in `oracle-build.json` and of every class under the two test bundles' `target/classes`, together with `java-tests.sh` over the TX6(c) runner suites. After the rebuild, the only classes allowed to differ are `TestConfiguration` and the three new ones. The default-mode `java-tests.sh` outcomes must equal the earlier ones. The recorder in default mode re-measures every text of `layered-label-metrics-texts.txt`, and the result must equal the committed snapshot, which holds only on the reference platform (#52). This makes every JVM vector ref unaffected: no recorder's classpath holds `org.eclipse.elk.alg.test` (planning grep, `tools/vectors/*.sh`), so no vector recorder is rerun. |
| TX8 | **Refs the patch moves, by script only.** Rebuild in place (`conformance.md` § 4 step 1, keeping the `census/` and `sweep/` caches). Then run `regen-goldens.sh` for all six sets, `regen-elkt-refs.sh`, `regen-elkj-refs.sh`, `regen-parse-refs.sh` and `regen-generated.sh`. The only permitted diff is the `patches` array of the nine `_meta.json` files, each journaled with patch id `0003`. A fresh oracle sweep and TS sweep follow, then `parity-report.ts --write`, where only the patch line of the header may change. The new ref `label-sizing.json` is added by its recorder. Any other diff stops the mission (stop 3). |

## Auto-confirmed (unattended)

**TX1, patch site.** Evidence: a grep for fonts and string bounds over `plugins/org.eclipse.elk.{core,graph,graph.json,
graph.text,alg.*,core.debug.grandom}/src` finds only `Core.melk`'s option declarations, `NaiveMinST`'s SVG debug string,
the out-of-scope `alg.disco.debug` and `alg.graphviz.dot`. The only measuring code is `TestConfiguration.java:193-197`. The
golden harness (`tools/oracle/harness/*.java`) never sizes a label, and no vector recorder sizes one either: the
`getLayoutTestConfiguration` hits in the recorders are `ElkLayered`'s, not the framework's. Rejected: (A) a `TextMeasurer` in
`org.eclipse.elk.core` with a TS twin in `src/core`, because no Java caller would use it, it would break CLAUDE.md's YAGNI
rule, and it would freeze at the first publish (AD-14); (B) sizing in the oracle harness only, because the issue asks for a
numbered oracle patch, and the harness is our tool, not ELK.

**TX2, shape.** `KVector` is the size type ELK already uses, and the TS port has it (`src/core/math/KVector.ts`). The test
bundle already requires `org.eclipse.elk.core` (`META-INF/MANIFEST.MF`). A system property follows 0001's precedent and
reaches `java-tests.sh` through `JAVA_TOOL_OPTIONS`, which the script already honours (`java-tests.sh:95`), so the script
does not change. Rejected: a public setter on `TestConfiguration`, which is mutable static state shared across suites; a
constructor parameter, which would change every caller of `fromTestClass`.

**TX3, relation to FX8.** The issue leaves replace, keep or both to the plan, and the #52 ruling says the snapshot stays the
reference. Rejected: "replace", because it would change the oracle's JUnit baseline (`Issue405_2Test` depends on real
sizes, FX8) and drop the reference the maintainer kept; "keep" with no new mode, because the patch would then normalize
nothing and the issue would not be met.

**TX4, constants.** Rejected: a per-character width table, because it approximates a real font, which is out of scope, and
it is a second table to keep equal on both sides; snapshot-like constants (11.77734375), which suggest a font model that
does not exist; Canvas `measureText`, which needs a browser and depends on the machine's fonts (dot-engine's AD-10 kept it
out of its oracle for this reason).

**TX5, location.** Evidence: FX8 put the framework port in `test/helpers/layout-test-labels.ts`
(`@see .../TestConfiguration.java`). `conformance.md` § 4 step 3 says "in `src/`" because it was written before any seam
existed. Rejected: `src/`, which would add a public surface the published library never calls.

**TX6, evidence.** The exit wording "sizes agree" calls for size comparison. The curated layouts add AD-4 layout parity on
label-bearing inputs that CI can run (vendored), and the corpus run covers every label-bearing model without committing a
sweep (AD-5). Rejected: (A) suite pass or fail parity alone, which is too weak to show sizes; (B) committing the 21,753
corpus label sizes, against AD-5; (C) a new `variants.json` entry for the oracle sweep, which would edit a frozen input
and the harness.

**TX7, non-impact.** Rejected: rerunning every JVM vector recorder cold, which takes hours and is only indirect evidence;
equal class hashes prove the same thing directly.

**TX8, refs.** Every regen script stamps `patches` from `oracle-build.json` (`regen-goldens.sh:168`,
`regen-elkt-refs.sh:93`, `regen-elkj-refs.sh:195`, `regen-parse-refs.sh:111`), and `parity-report.ts:331` prints the
series. The issue names the regeneration, so these diffs are the ones the brief names under queue gate 6.
