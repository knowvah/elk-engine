<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations — elk-engine skeleton (2026-10-11)

Planning-time notes are in `elk-engine-skeleton-planning.md`. These were
found while executing the mission.

## Observation: Tycho 4.0.12 does not run on Maven 3.10

- **Context**: T8, first `mvn -P elk-meta clean install` in the oracle worktree.
- **Finding**: Maven 3.10.0 fails immediately with
  `com.google.inject.ProvisionException: No implementation for
MavenTargetLocationFactory was bound` (while locating
  `TychoWorkspaceReader`). The identical command succeeds on Maven 3.9.11
  with the same JDK 21.0.1. `tools/oracle/build.sh` therefore enforces the
  3.9 series and reads `ELK_MVN` to pick the binary.
- **Impact**: A stock Homebrew `maven` (3.10) cannot build the oracle. Install
  a 3.9.x Maven and set `ELK_MVN`, or wait for an ELK Tycho bump.
- **Confidence**: High

## Observation: V8 `Math.log` is 1 ulp off `StrictMath.log`

- **Context**: T9, replaying the `nextGaussian` vectors for seed 1.
- **Finding**: `Math.log` gave `…af5d` where the JVM vector has `…af5e`.
  The `Random.nextGaussian` Javadoc specifies `StrictMath`, whose spec is
  fdlibm. A private fdlibm-algorithm `strictLog` in
  `src/java/util/Random.ts` (domain 0 < x < 1) made every vector pass.
  `Math.sqrt` is exact and needed no shim.
- **Impact**: Any ELK code path through `Math.log/exp/pow/sin/cos/atan2`
  may differ from the JVM by an ulp. Expect a `src/java/lang/StrictMath.ts`
  when the second caller appears, and expect AD-4 known-divergence entries
  for `Math.*` (not `StrictMath`) call sites.
- **Confidence**: High

## Observation: every elk-models `.json` is a Ptolemy model

- **Context**: T12 golden selection.
- **Finding**: All 550 `.json` files sit under `realworld/ptolemy/`
  (`hierarchical/`, `flattened/`); `examples/`, `tests/`, `tickets/` hold only
  `.elkt`/`.elkg`. 471 of 550 have < 50 nodes. None sets `algorithm` or
  `randomSeed`, so they all run as default `layered`, seed 1
  (deterministic). The oracle lays out all 256 hierarchical models in 2.7 s.
- **Impact**: Non-Ptolemy goldens need the elkt→JSON conversion mission.
- **Confidence**: High

## Observation: longest-prefix bundle lookup has a silent hole

- **Context**: T14, reviewing `module-boundaries.fitness.test.ts`.
- **Finding**: A future `src/core/service/**` (out-of-scope bundle
  `core.service`) would resolve to `core` because only in-scope bundles are
  in `bundle-deps.json`. Nothing flags it today.
- **Impact**: When an out-of-scope bundle is ever partially ported, add an
  explicit "forbidden directories" list to the fitness test first.
- **Confidence**: High

## Observation: vitest 5 text coverage reporter hides 100% files

- **Context**: T9/T10 checking per-file coverage.
- **Finding**: The `text` reporter prints "No files with missing coverage.
  N files fully covered." and omits the per-file table when everything is
  at 100%. Use `--coverage.reporter=json-summary` for per-file numbers.
- **Impact**: Do not read an empty table as "not measured".
- **Confidence**: High

## Observation: macOS bash 3.2 constraints for `tools/**/*.sh`

- **Context**: T8, T11, T16 scripts.
- **Finding**: `mapfile` is unavailable; empty-array expansion under `set -u`
  errors; `trap` handlers cannot reference `local` variables; shellcheck
  SC2016 fires on inline `node -e` template literals (suppressed per
  function). `sort -V` works for p2 version directories.
- **Impact**: Keep scripts bash-3.2-compatible or they fail on a fresh Mac.
- **Confidence**: High

## Observation: `LayoutMetaDataService` auto-registers providers

- **Context**: T11 harness.
- **Finding**: `LayoutMetaDataService.getInstance()` registers `CoreOptions`
  and loads every `META-INF/services/…ILayoutMetaDataProvider` entry on the
  classpath. `PolyominoOptions` (alg.common) is a provider but is not in the
  services files. No EMF/Xtext standalone setup is needed for JSON in/out.
- **Impact**: The TS `LayoutMetaDataService` port needs an explicit
  registration list; mirror `ElkOracle.registerMetaDataProviders()`.
- **Confidence**: High

## Observation: `.melk` packages do not follow directory layout

- **Context**: T14 port map.
- **Finding**: `alg/force/stress/Stress.melk` declares package
  `org.eclipse.elk.alg.force`; `core/Core.melk` declares `org.eclipse.elk`
  with `metadataClass core.options.CoreOptions`. 13 `.melk` files produce
  27 generated classes; none of the generated sources are in the repo.
- **Impact**: The AD-12 generator must resolve `metadataClass` against the
  declared `package`, not the file location.
- **Confidence**: High

## Observation: `HashMap` order cannot be derived from the Javadoc

- **Context**: T15 collections survey; AD-9 vs AD-10.
- **Finding**: The `HashMap` Javadoc specifies capacity and load factor but
  not iteration order, so the AD-10 `JavaHashMap` shim cannot be written from
  spec alone. 8 in-scope iterated containers are value-hashed; the one that
  demonstrably affects output today is `alg.common`'s `NaiveMinST` (used by spore) (a `HashSet<TEdge>`
  sorted by weight, ties in hash order). 30 iterated containers are
  identity-hashed; enum keys are identity-hashed too (`Enum.hashCode`
  Javadoc).
- **Impact**: Roadmap mission 1 must add JVM-recorded iteration-order
  vectors to `tools/vectors/JavaVectors.java` before `JavaHashMap` exists.
- **Confidence**: High

## Observation: the brief's `Random` usage counts included out-of-scope code

- **Context**: T15 cross-check of the T9 scope note.
- **Finding**: In-scope bundles have 0 callers of `Collections.shuffle` and
  `nextGaussian` (the brief said 1 each). The in-scope surface is
  `nextInt(bound)`, `nextDouble`, `nextFloat`, `nextBoolean`, `nextLong`,
  `setSeed`. Four `Math.random()` sites exist, including a spore vertex
  jitter (`alg.spore/.../ElkGraphImporter.java:169`).
- **Impact**: T9's shims remain correct and vector-proven; spore goldens
  must avoid the jitter path.
- **Confidence**: High

## Observation: shell survey pitfalls on macOS/zsh

- **Context**: T15 counting commands.
- **Finding**: zsh errors on unquoted `--include=*.java`; ERE
  `[A-Za-z0-9_)\]]` does not escape `]` (silently reported 0 integer `%`
  sites; real count 17); `grep -- --include` treats the flag as a filename.
- **Impact**: Reproduce the documented commands verbatim (they are quoted
  for both shells in `docs/translation-rules-collections.md`).
- **Confidence**: High
