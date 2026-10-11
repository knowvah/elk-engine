<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — elk-engine skeleton (2026-10-11)

## Observation: ELK master is one Java line past the 0.12.0 release

- **Context**: Choosing the ELK pin for the port and oracle.
- **Finding**: 0.12.0 was cut at `0c51a28d` (2026-07-09). Excluding
  pom/MANIFEST version bumps, master `8aaa3c14` differs only in
  `alg.layered/.../loops/routing/RoutingDirector.java:150`. That change
  replaces `keySet().toArray()` iteration with
  `PortRestorer.sortedTwoSideLoopPortSides`, a determinism fix. The
  local ELK clone has no tags.
- **Impact**: Maven Central 0.12.0 jars (graph.json included) are a near
  exact oracle for master if a from-source build is ever unavailable.
  The pin is master (AD-2).
- **Confidence**: High

## Observation: randomSeed = 0 means time-seeded in ELK

- **Context**: Scoping the `java.util.Random` port and oracle determinism.
- **Finding**: `core/Core.melk:608` documents seed 0 as "determined
  pseudo-randomly". Core's default is `randomSeed = 0` (`Core.melk:162`).
  layered and force default to 1 (`Layered.melk:124`, `Force.melk:50`).
  `GraphConfigurator.java:119` and `ForceLayoutProvider.java:91` call
  `new Random()` when the seed is 0.
- **Impact**: Golden inputs must use a nonzero seed or deterministic
  algorithms. The harness determinism check (T11) catches violations.
- **Confidence**: High

## Observation: TypeScript 7 toolchain gaps

- **Context**: Toolchain selection (AD-6).
- **Finding**: `typescript@7.0.2` (GA 2026-07-08) ships the native
  compiler as `tsc`. typedoc's peer range stops at TS 6.0.x.
- **Impact**: The API-docs mission needs a TS 6 alias for typedoc.
- **Confidence**: High (npm metadata, 2026-10-11)

## Observation: ELK's test models and builds

- **Context**: Oracle and corpus planning.
- **Finding**: ELK's JUnit tests read models from `eclipse-elk/elk-models`
  via the `tests.paths.models-repo` property. The build is Maven + Tycho
  4.0.12. The `elk-meta` profile (the melk compiler) must build before
  the default profile. `*Options.java` / `*MetaDataProvider.java` are
  generated at build time and are not in the repo. elkjs builds via
  gradle in the separate `kieler/elkjs` repo.
- **Impact**: The oracle needs Maven, which is not installed on this
  machine as of 2026-10-11. The TS port needs its own melk codegen
  (AD-12).
- **Confidence**: High
