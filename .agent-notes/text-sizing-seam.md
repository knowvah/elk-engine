<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: text-sizing-seam (roadmap row 10, 2026-11-13)

Planning-time notes are in `text-sizing-seam-planning.md`.

## Observation: `build.sh` calls the oracle worktree stale over caches it does not know

- **Context**: T1, rebuilding the oracle in place after `git am` of patch 0003.
- **Finding**: `verify_worktree` (`tools/oracle/build.sh:95-108`) exempts only build output, `oracle-build.json`, `census/`
  and `sweep/`. The worktree root also holds the untracked `vector-cache/`, `t4/`, `rerecord/` and `final-gate/`, so the
  script would exit 2. Running it with `GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.excludesFile GIT_CONFIG_VALUE_0=<file>`,
  the file listing those four root-anchored directories, lets the script's own check pass without editing it or writing
  `../elk/.git/info/exclude`. Issue #85.
- **Impact**: put a new local oracle output under `sweep/` (exempt), never in a new directory at the oracle root. Until #85
  is fixed, an in-place rebuild needs the environment-scoped excludes file.
- **Confidence**: High

## Observation: an oracle rebuild empties the vector cache

- **Context**: T1, reading `tools/vectors/vector-cache.sh` after the rebuild.
- **Finding**: the cache salt hashes `$ELK_ORACLE_DIR/oracle-build.json` (`vector-cache.sh:86`), whose `patches` and
  `builtAt` change with every build. No recorder was rerun in this mission (class hashes prove the jars' classes unchanged).
- **Impact**: the first run of each cached JVM recorder after a rebuild is cold; plan hours for `elkj-vectors.sh`.
- **Confidence**: High (read from the script; the cold run was not made)

## Observation: Tycho rebuilds every class byte-identically

- **Context**: T1, TX7's class-hash comparison across a full `clean install`.
- **Finding**: of 1,348 `.class` entries (16 jars, 14 test bundles) every one outside the patched class had the same sha256
  after the rebuild, Xtend-generated classes included. Jar files themselves differ (timestamps).
- **Impact**: per-class hashes are a cheap proof that a patch cannot reach a recorder or the sweep; compare classes, not jars.
- **Confidence**: High

## Observation: three runner suites are outside `java-tests.sh`'s classpath

- **Context**: T1, the JUnit baseline over the suites the TS port runs through `defineLayoutTest`.
- **Finding**: `InsidePortLabelTest`, `NextToPortLabelPlacementTest` and `PortLabelPlacementVariantsTest` live in
  `org.eclipse.elk.alg.common.test`; `TEST_BUNDLES` holds `alg.layered.test` and `alg.test` only. A scratch copy with the
  bundle added runs them. `JAVA_TOOL_OPTIONS=-D<prop>=<value>` reaches every class's JVM, as the planning note expected.
- **Impact**: a JUnit baseline over all runner suites needs the scratch copy (or the bundle added to the script).
- **Confidence**: High

## Observation: the oracle sweep's verdict flickers for some `sporeOverlap` cases

- **Context**: T5, a fresh full sweep after the rebuild compared record by record with the previous one.
- **Finding**: 18,924 of 18,930 records were equal apart from `ms`; six `retarget/sporeOverlap/default/…` cases changed
  verdict among `ok`, `nondeterministic` and `throws`. Four filtered repeats on the same build changed them again. The TS
  table of the parity report also prints wall-clock sums, which change on every sweep. Issue #86; the mechanism is #79's.
- **Impact**: a re-sweep never reproduces the committed parity report; copy `results.jsonl` and `summary.json` aside before
  a sweep, and keep the TS summary of the sweep a report was generated from. `parity-report.ts` with `ELK_ORACLE_DIR`
  pointing at a scratch directory (those two files plus an `oracle-build.json`) regenerates a report from saved inputs.
- **Confidence**: High

## Observation: the FX8 port visits labels in another order than `eAllContents`

- **Context**: T3, deriving label rows in the oracle recorder's order.
- **Finding**: Java's `eAllContents` walks an `ElkNode` as labels, ports, children (each subtree whole), contained edges.
  `ensureSensibleLabelSize` in `test/helpers/layout-test-labels.ts` visits labels, ports, contained edges, children.
- **Impact**: sizes do not depend on the order; a test that lists labels in the oracle's order must walk in the Java order
  (`test/helpers/label-sizing-rows.ts` does). With several texts missing from the snapshot, the port names another first.
- **Confidence**: High

## Observation: a text grep overcounts label-bearing `.elkt` files

- **Context**: T2, the recorder's model count against the planning count.
- **Finding**: `grep label` found 115 and 22 files in the two vendored directories; 108 and 19 parse to a graph with at
  least one `ElkLabel` (the others mention label options or comments only), and 8 of those repeat another file's bytes.
- **Impact**: count label-bearing models from the parsed graph or from the census `labels` field.
- **Confidence**: High
