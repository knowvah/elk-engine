<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: spore-scanline-0004 (issue #111, 2026-11-21)

Planning-time notes are in `spore-scanline-0004-planning.md`. Journal: `plans/spore-scanline-0004/decision-journal.md`.

## Observation: the `NaN` scanline throws are not a fixed set of cases

- **Context**: T4, the `sporeOverlap` sweep on the oracle with patch `0004` gave 26 throws where the issue expected
  the 27 of #108 to stay.
- **Finding**: "Invalid hitboxes for scanline overlap calculation." needs two nodes the scanline's `TreeSet` comparator
  calls equal (`ScanlineOverlapCheck.java:130-141`: left side, then centre x, then centre y). Two `NaN` compound nodes
  share the left side and, from the second iteration, a `NaN` centre y, so they collide only when their centre x ties
  too, and that depends on the widths their own layouts produce. In `pn_brockackerman_BrockAckerman` (hierarchical)
  both were 509.73 wide before the patch and are 643.34 and 442.99 wide with it, so the case lays out (with `NaN` y on
  every root child, on the oracle and in the port).
- **Impact**: any change to spore's results can add or remove `NaN` throw cases. A changed count is not by itself a
  port defect; compare the port with the oracle case by case.
- **Confidence**: High (traced on the oracle with the old and the new walk in one build)

## Observation: an oracle class can be traced without touching the oracle worktree

- **Context**: T4, isolating the walk as the only variable for the case above.
- **Finding**: compile a scratch copy of the Java class (trace lines, a system property that switches the behaviour)
  against the oracle classpath into a scratch directory and put that directory ahead of the jars:
  `java -cp <scratch classes>:$ELK_ORACLE_DIR/harness-classes:<oracle jars and p2 bundles> ElkOracle --cases <jsonl> <outDir>`
  with the `-D` flags `tools/oracle/run.sh` passes. `spore-layout-vectors.sh` has `SPORE_CP_PREPEND` for the same
  purpose; `run.sh` has no such variable, so the classpath is rebuilt by hand from `oracle-build.json`.
- **Impact**: no rebuild, no oracle patch and no write under `$ELK_ORACLE_DIR` are needed for a one-class experiment.
- **Confidence**: High

## Observation: the sweep's oracle outputs can hold bare `NaN` tokens

- **Context**: T4, reading one sweep output with `JSON.parse`.
- **Finding**: Gson writes `NaN` unquoted; 245 of the 880 `ok` `sporeOverlap` outputs contain it.
  `tools/corpus/ts-layout-classify.ts` parses them through marker strings; plain `JSON.parse` throws.
- **Impact**: scratch scripts over sweep outputs must use that parser or replace the tokens first.
- **Confidence**: High

## Observation: `build.sh` can fail on the Eclipse Foundation licence service

- **Context**: T1, the rebuild after `git am` of patch `0004`.
- **Finding**: the second Maven pass runs `org.eclipse.dash:license-tool-plugin:license-check` on the `parent` module,
  which posts the dependency list to an Eclipse Foundation service. A 504 there fails the build at module 1 of 59
  before anything is compiled (`Error response from the Eclipse Foundation 504`). The same command passed two minutes
  later.
- **Impact**: read `.oracle-build.log` before counting a `build.sh` failure against the patch; a failure in
  `license-check` is the network. After such a failure the worktree holds the new patch but `oracle-build.json` and the
  jars are the old ones, so nothing may use the oracle until a build succeeds.
- **Confidence**: High (one occurrence)

## Observation: the corpus sweep cache key does not cover the patch series

- **Context**: T4, comparing the patched sweep with the cached full sweep.
- **Finding**: `$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/` is reused across oracle rebuilds with a different
  patch series. With a behavioural patch (`0004`) its rows for the patched algorithm are stale: 609 of 879
  `sporeOverlap` outputs differ. Vector caches do not have this problem (their salt includes `oracle-build.json`).
- **Impact**: after adding or dropping a behavioural patch, sweep to scratch (`--out`) or run a full sweep before
  reading the cache or regenerating the parity report. Issue #139.
- **Confidence**: High
