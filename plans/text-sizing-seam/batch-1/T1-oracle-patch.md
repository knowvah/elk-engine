<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: oracle patch 0003 and rebuild

**Agent:** orchestrator (writes the shared oracle worktree). **Decisions:** TX1, TX2, TX3, TX4, TX7.
**Writes:** `tools/oracle/patches/0003-alg.test-pluggable-label-text-measurer.patch`; `$ELK_ORACLE_DIR` only through
`git am` with `build.sh`'s identity and `tools/oracle/build.sh`. Scratch under `$TMPDIR/text-sizing-seam/T1/`.

## Read-set

- `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/config/TestConfiguration.java:160-199`
- `tools/oracle/patches/0001-*.patch` (the format, the property idiom), `tools/oracle/build.sh` (identity, staleness rules)
- `docs/conformance.md` § 4 (steps 1-2), § 5 (Maven 3.9.x: `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn`)
- `tools/oracle/java-tests.sh:1-17,95` (usage, `JAVA_TOOL_OPTIONS`)
- `test/helpers/` files that call `defineLayoutTest`, to list the runner suites (`grep -l defineLayoutTest src test`)

## Steps

1. Platform check (stop 5): `uname -sm` prints `Darwin arm64`, and `java -version` prints 21.0.1. Journal both.
2. **Pre-patch snapshot (TX7).** For every jar in `oracle-build.json` `jars`, and for every class under
   `$ELK_ORACLE_DIR/test/{org.eclipse.elk.alg.test,org.eclipse.elk.alg.layered.test}/target/classes`, write
   `<entry> <sha256>` lines for each `.class` (`unzip -p` per entry, or a small Node script under `$TMPDIR`). Save the
   result as `$TMPDIR/text-sizing-seam/T1/classes-before.txt`. Run `java-tests.sh` over the Java classes of the runner
   suites (the JUnit fqcn each TS suite names) and save the per-class lines as `junit-before.txt`. Check `uptime` first
   and use `nice -n 10`, detached, if the run is long.
3. **Author the patch** in a scratch clone at `ELK_COMMIT` (`git clone --shared $ELK_SOURCE_DIR $TMPDIR/.../elk-scratch`,
   then `git checkout --detach <pin>`; this does not write `../elk`). Make one commit with subject
   `alg.test: pluggable label text measurer` containing:
   - `TextMeasurer.java`: an interface with `KVector measure(String text)`, the constant
     `PROPERTY = "org.eclipse.elk.alg.test.textMeasurer"`, and `static TextMeasurer fromSystemProperty()`. Unset or
     `awt` returns `new AwtTextMeasurer()`; `fixed` returns `new FixedAdvanceTextMeasurer()`; anything else throws
     `IllegalArgumentException("Unknown text measurer: " + value)`.
   - `AwtTextMeasurer.java`: the current measuring body of `computeLabelSize`, verbatim: the `os.name` font choice, the
     `BufferedImage`, the font, and `getStringBounds`. It returns `new KVector(rect.getWidth(), rect.getHeight())`.
   - `FixedAdvanceTextMeasurer.java`: the constants `CHAR_ADVANCE = 6.0` and `LINE_HEIGHT = 12.0`, and
     `new KVector(text.length() * CHAR_ADVANCE, LINE_HEIGHT)` (TX4).
   - `TestConfiguration.java`: `computeLabelSize` keeps its guard and its `setHeight` then `setWidth` order, and takes
     the size from `TextMeasurer.fromSystemProperty().measure(label.getText())`. Imports that are no longer used go.
   Every new file carries ELK's EPL-2.0 header in the form of the neighbouring files, with the copyright line
   "elk-engine contributors" and javadoc stating what it is for. Compile-check it with the bundle's dependencies, or let
   `build.sh` do so.
4. Export the patch with `git format-patch -1 -o <scratch>`. Rename it to
   `0003-alg.test-pluggable-label-text-measurer.patch` under `tools/oracle/patches/`.
5. **Apply in place** (`conformance.md` § 4 step 1):
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle -c user.email=oracle@invalid am --3way <patch>`, then
   `ELK_MVN=... tools/oracle/build.sh` (about 3 minutes; detached with the `exit` line if it runs long). Check that
   `oracle-build.json` names the pin and all three patches.
6. **Post-patch checks (TX7, stop 4).** Recompute the class list into `classes-after.txt` and diff it with the earlier one.
   Only `TestConfiguration.class` (and its lambda or inner classes, if any) and the three new classes may differ. Rerun
   `java-tests.sh` in default mode: the per-class lines must equal `junit-before.txt`. Smoke-test fixed mode with
   `JAVA_TOOL_OPTIONS="... -Dorg.eclipse.elk.alg.test.textMeasurer=fixed"` on one suite (any outcome; journal it), and
   with the value `bogus` (expect the `IllegalArgumentException`).
7. Journal: the patch id, the platform, the commit check
   (`git -C $ELK_SOURCE_DIR log --oneline <pin>..HEAD -- plugins/ test/org.eclipse.elk.alg.test`; at planning only
   `8bd00922`), and the three TX7 results with their counts.

## Acceptance criteria

- Given the patched oracle, when `oracle-build.json` is read, then `commit` is the pin and `patches` lists 0001, 0002 and 0003.
- Given the class lists before and after, when they are diffed, then only `TestConfiguration` and the three new classes differ.
- Given the runner suites, when `java-tests.sh` runs without the property, then every per-class line equals the pre-patch run.
- Given `-Dorg.eclipse.elk.alg.test.textMeasurer=bogus`, when a runner suite runs, then it fails with
  `IllegalArgumentException` naming `bogus`.

**Observability:** N/A, no new observable operations. **Rollback:** Reversible. Delete the patch, remove the worktree
(`conformance.md` § 4 step 4) and run `build.sh`.
