<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: deferred-bundles-adr (roadmap row 11, issue #42)

## Observation: the deferred bundles have almost no in-scope footprint at the pin

- **Context**: Checking who would call a port of `alg.libavoid`, `alg.graphviz.dot` or `alg.graphviz.layouter`.
- **Finding**: `git grep -i 'libavoid\|graphviz'` at `8aaa3c14` over the in-scope plugins and tests hits only
  `core/AbstractLayoutProvider.java:31-33` (Javadoc) and `test/org.eclipse.elk.shared.test/META-INF/MANIFEST.MF:13`
  (a `Require-Bundle` on `graphviz.layouter` with no source reference). No elk-models file names any of their algorithm ids.
  No commit `8aaa3c14..b715fb10` touches the three bundles.
- **Impact**: No ported test, golden or corpus row depends on these bundles; a "skip" verdict breaks nothing.
- **Confidence**: High

## Observation: both runtime bundles shell out

- **Context**: Browser-safety evidence.
- **Finding**: `LibavoidServer.java:214` and `GraphvizTool.java:206` call `Runtime.getRuntime().exec`. A Graphviz binary is
  installed locally (`/opt/homebrew/bin/dot`), unpinned.
- **Impact**: An oracle golden for `graphviz.layouter` would depend on the Graphviz version, not on the pinned Java.
- **Confidence**: High

## Observation: ts-layout-shards childPids check is intermittent in the full suite

- **Context**: Phase 8 baseline (`npm run coverage`, tree `887d11e9`).
- **Finding**: `test/corpus/ts-layout-shards.test.ts:173` failed in 2 of 3 full runs (load 30-47 from other sessions) with
  1-2 leftover child pids; it passed in 12 isolated runs (with and without `--coverage`, with and without a concurrent
  vitest). Mechanism not found; filed as #87.
- **Impact**: A red gate on that test alone is not evidence of a regression; rerun once at low load and journal it.
- **Confidence**: High (observation); mechanism unknown

## Observation: dot-engine would be a runtime dependency

- **Context**: The "delegate" option.
- **Finding**: `../dot-engine/package.json`: `@knowvah/dot-engine`, EPL-2.0, no `dependencies`, exports `.`, `./api`,
  `./render`. CLAUDE.md forbids runtime dependencies in this package.
- **Impact**: Delegation needs either a separate package (AD-14's later layer) or a ruling on the zero-dependency rule.
- **Confidence**: High
