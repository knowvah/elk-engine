<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — conformance-corpus (2026-10-11)

Planning-time notes are in `conformance-corpus-planning.md`.

## Observation: no Maven 3.9 on the dev machine
- **Context**: T3, refreshing `oracle-build.json` for the D0 jars.
- **Finding**: Maven is installed via Homebrew at 3.10.0 (user-confirmed); no 3.9 exists; the Tycho build needs 3.9.x. The jars
  were already built, so `tools/oracle/build.sh --record-only` rewrites the manifest without Maven.
- **Impact**: A real oracle rebuild (new ELK commit or patch) needs a 3.9 Maven via `ELK_MVN`.
- **Confidence**: High

## Observation: Xtext standalone `.elkt` loading needs equinox.common
- **Context**: T3 classpath for `ElkGraphStandaloneSetup.doSetup()`.
- **Finding**: Guice reflection loads `org.eclipse.core.runtime.OperationCanceledException`, so
  `org.eclipse.equinox.common` must be on the classpath though no manifest-derived list names it.
  Guice 5+ works with `jakarta.inject-api` from the p2 cache, no `javax.inject` jar. Syntax errors
  land in `resource.getErrors()`; `getResource` does not throw. First `.elkt` case pays ~0.5 s setup.
- **Impact**: Any future JVM harness reading `.elkt` needs the same bundle set.
- **Confidence**: High

## Observation: an existing fitness test used graph.text as its out-of-scope example
- **Context**: T2, adding D0 bundles to `IN_SCOPE_SUFFIXES`.
- **Finding**: `module-boundaries.fitness.test.ts` "keeps only in-scope ELK bundles" filtered
  `graph.text`; D0 put it in scope. User approved swapping the fixture to `core.service`.
- **Impact**: Scope changes can invalidate fixtures that name concrete bundles; check before
  widening scope again.
- **Confidence**: High

## Observation: concurrent oracle runs share `harness-classes`
- **Context**: Batch 2, T4 census and T5 harness edits in parallel.
- **Finding**: `run.sh` recompiles `tools/oracle/harness/*.java` (when any source is newer) into
  `$ELK_ORACLE_DIR/harness-classes`. Two tasks editing and running the harness in one tree
  interfere. A worktree plus a private `ELK_ORACLE_DIR` holding only a copy of `oracle-build.json`
  (absolute jar paths) isolates them; goldens regenerate byte-identically from it.
- **Impact**: Parallel oracle work needs this isolation.
- **Confidence**: High

## Observation: ELK property setting mutates EMF containment
- **Context**: T5 retarget overlay.
- **Finding**: `setProperty` adds a contained property-map entry, so setting properties while
  iterating `root.eAllContents()` throws `ConcurrentModificationException`; collect nodes first.
  The JSON exporter writes abbreviated option keys (`algorithm`, `randomSeed`, `elk.direction`)
  and `randomSeed` as the string `"1"`.
- **Impact**: Applies to any JVM tool that rewrites options on an ElkGraph; and to TS readers of
  oracle JSON.
- **Confidence**: High

## Observation: radial and vertiflex reject non-tree graphs
- **Context**: T5 sample sweep, 183 ptolemy models × 9 algorithms (1,647 cases).
- **Finding**: 1,546 ok, 101 throws (IllegalArgumentException 62, IndexOutOfBoundsException 30,
  IllegalStateException 9); radial throws `IllegalArgumentException: The given graph is not a
  tree!`; vertiflex throws `UnsupportedConfigurationException` with the same message. No `@hex`
  tokens appeared in any message.
- **Impact**: The retarget tier for tree algorithms will be throws-heavy; `throws` matching is
  still a valid conformance verdict (D4).
- **Confidence**: High

## Observation: ELK's JSON exporter renames colliding ids with an unseeded Random
- **Context**: T6, exporting grandom-generated graphs.
- **Finding**: `JsonExporter.xtend:505` resolves id collisions with
  `"_g" + new Random().nextInt(1000000)`. grandom leaves the root unnamed; the exporter numbers it
  `n0`, which collides with generated node `n0` → `n0_g172889` style ids that change per run. The
  harness now names the generated root `root` before export.
- **Impact**: Mission 4d must reproduce the `root` naming to match the committed inputs byte for
  byte. Any oracle export of a graph with colliding ids is nondeterministic (D5 will flag it).
- **Confidence**: High

## Observation: grandom generation details
- **Context**: T6 configs.
- **Finding**: `GRandomStandaloneSetup.doSetup()` + `new RandomGraphGenerator(null).generate(cfg)`
  works standalone; the generator seeds its own `Random(seed)`. Needs `org.eclipse.xtext.xbase` on
  the classpath. `trees` with `nodes = N` gives N nodes plus the root and N−1 edges regardless of
  edge settings; `edges total = N` is exact for plain graphs; hierarchy multiplies edges. Without a
  `nodes {}` block nodes are 30×30 with no ports or labels.
- **Impact**: Useful for sizing future configs under the 50-node cap.
- **Confidence**: High
