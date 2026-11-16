<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — deferred-bundles-adr (2026-11-13)

Planning-time notes are in `deferred-bundles-adr-planning.md`.

## Observation: the bundle-deps regeneration fitness test does not run on this machine

- **Context**: T1, checking the three fitness tests DB4 cites as the enforcement of "deferred = not ported".
- **Finding**: `module-boundaries.fitness.test.ts:342` (`regenerated deps equal the committed file`) is skipped by
  `regenerationSkipReason` (`:327-336`) unless `git -C $ELK_SOURCE_DIR rev-parse HEAD` equals the committed `elkCommit`.
  `../elk` is at `b715fb10` (past the pin) and `../elk-oracle` is at `d650f036` (the pin plus the oracle patches as
  commits), so the test is skipped with either (56 passed, 1 skipped). Extracting the pinned manifests with
  `git -C ../elk archive <pin> plugins | tar -x --include='*/META-INF/MANIFEST.MF'` and calling
  `buildBundleDeps(readManifests(dir), pin)` reproduces the committed file byte for byte.
- **Impact**: A change to `IN_SCOPE_SUFFIXES` or to `bundle-deps.json` is not checked locally; use the archive recipe
  above when adopting a bundle. Filed as #89.
- **Confidence**: High

## Observation: the oracle worktree already holds the deferred bundles' jars and the libavoid-server binaries

- **Context**: T1, oracle feasibility.
- **Finding**: The Tycho build compiles every module, so `../elk-oracle/plugins/org.eclipse.elk.alg.{libavoid,graphviz.dot,graphviz.layouter}/target/`
  each hold a built jar, though `oracle-build.json` lists only the 16 in-scope jars. `alg.libavoid/pom.xml:70-92`
  downloads `libavoid-server-{linux,macos,win.exe}` v0.3.1 from `github.com/TypeFox/libavoid-server` at build time
  (they are git-ignored upstream); the macOS binary is x86_64.
- **Impact**: An oracle run for `alg.graphviz.dot` (no external binary) needs only a harness and classpath, not a rebuild.
  Every oracle build reaches out to GitHub for the libavoid binaries.
- **Confidence**: High

## Observation: `shared.test` requires `alg.graphviz.layouter` and never uses it

- **Context**: T1, in-scope callers at the pin.
- **Finding**: `test/org.eclipse.elk.shared.test/META-INF/MANIFEST.MF:13` names the bundle; the four test classes import
  only `force`, `layered`, `mrtree`, `radial` and `alg.test`. No test anywhere uses `@AllAlgorithms`, so no test reaches
  an algorithm through the registry alone.
- **Impact**: The `shared.test` port (`test/integration/`, not yet done) does not need the Graphviz bundles.
- **Confidence**: High

## Observation: `DotImporter` is dead code at the pin

- **Context**: T1, consumers of `alg.graphviz.dot`.
- **Finding**: `git grep DotImporter` at the pin hits only `DotImporter.java` (699 lines). `alg.graphviz.layouter` uses
  `DotExporter` (through `LayoutDotExporter`), `Command`, `Attributes` and the generated model.
- **Impact**: If `alg.graphviz.dot` is ever adopted, the importer half has no ELK caller to derive vectors from.
- **Confidence**: High
