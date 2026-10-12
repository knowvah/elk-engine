<!-- SPDX-License-Identifier: EPL-2.0 -->

# Port map: Java package → TypeScript module

Authoritative size-and-strategy table for the ELK 0.11-line sources pinned in
`tools/oracle/ELK_COMMIT`. It applies the AD-7 mapping rule to every Java package directory in the
13 in-scope bundles (see `plans/elk-engine-skeleton/decisions.md`, "Bundle scope"). Related:
[overview](overview.md), [inventory](inventory.md), [component map](component-map.md), [translation
rules](../translation-rules.md).

## Summary

| Bundle (`org.eclipse.elk.`) | TS root                   |    Pkgs |             Java+Xtend files |         LOC | Test plugin            | Test files |
| --------------------------- | ------------------------- | ------: | ---------------------------: | ----------: | ---------------------- | ---------: |
| `core`                      | `src/core/`               |      14 |                          112 |      20,414 | `core.test`            |         20 |
| `graph`                     | `src/graph/`              |       4 |                           40 |      11,449 | `graph.test`           |          1 |
| `graph.json`                | `src/graph/json/`         |       1 |         6 (1 Java + 5 Xtend) |       1,971 | `graph.json.test`      |          9 |
| `alg.common`                | `src/alg/common/`         |      14 |                           82 |      14,677 | `alg.common.test`      |          8 |
| `alg.layered`               | `src/alg/layered/`        |      29 |                          258 |      64,082 | `alg.layered.test`     |         97 |
| `alg.mrtree`                | `src/alg/mrtree/`         |       8 |                           38 |       5,790 | `alg.mrtree.test`      |          1 |
| `alg.radial`                | `src/alg/radial/`         |      11 |                           35 |       2,752 | `alg.radial.test`      |          1 |
| `alg.force`                 | `src/alg/force/`          |       5 |                           17 |       2,236 | `alg.force.test`       |          1 |
| `alg.disco`                 | `src/alg/disco/`          |       5 |                           13 |       2,409 | `alg.disco.test`       |          1 |
| `alg.rectpacking`           | `src/alg/rectpacking/`    |       7 |                           38 |       4,688 | `alg.rectpacking.test` |          3 |
| `alg.spore`                 | `src/alg/spore/`          |       6 |                           18 |       1,326 | `alg.spore.test`       |          2 |
| `alg.topdownpacking`        | `src/alg/topdownpacking/` |       1 |                            9 |       1,113 | `alg.topdown.test`     |          3 |
| `alg.vertiflex`             | `src/alg/vertiflex/`      |       5 |                           16 |       1,693 | `—`                    |          0 |
| **Total**                   |                           | **110** | **682** (677 Java + 5 Xtend) | **134,600** |                        |    **147** |

Test files: 147 attached to the bundles above, plus 46 in `org.eclipse.elk.alg.test` and 4 in
`org.eclipse.elk.shared.test` (support plugins, see [Test support plugins](#test-support-plugins)):
197 in the 14 test plugins. `alg.vertiflex` has no test plugin.

## Conventions

- **Mapping (AD-7):** strip `org/eclipse/elk/`, prefix `src/`, one class per file named exactly as
  the Java class (PascalCase), tests colocated as `<Name>.test.ts`. Rows list the _package
  directory_; file-level mapping inside a row follows the rule mechanically.
- **Package column:** the Java package with the `org.eclipse.elk.` prefix omitted (so `core.util`
  means `org.eclipse.elk.core.util`). LOC is `wc -l` over `.java` and `.xtend` files, comments
  included.
- **Strategy:** `hand port` | `EMF → plain class (AD-11)` | `melk codegen (AD-12)` | `Xtend → hand
port` | `not ported` + reason. Rows may combine strategies per file; the cell says which.
- **`(EMF types → AD-11)`** marks hand-ported packages that import `org.eclipse.emf.*`; those types
  resolve to the `src/graph/` classes and the minimal EMF runtime `src/emf/` (D1; not a bundle;
  detail in [elkgraph-model.md](elkgraph-model.md)).
- Guava (`com.google.common`) and Gson (`com.google.gson`) imports are not flagged per row; see
  AD-10 and [translation rules](../translation-rules.md).
- `alg.layered` is split out for length: [port-map-alg-layered.md](port-map-alg-layered.md).

## Reproducing the counts

Run from the ELK checkout (`cd "$ELK_SOURCE_DIR"`), per bundle `<b>` (e.g. `core`, `alg.layered`):

```sh
S=plugins/org.eclipse.elk.<b>/src
find $S \( -name '*.java' -o -name '*.xtend' \) -exec dirname {} \; | sort -u | wc -l  # package rows
find $S -name '*.java' | wc -l                                                      # Java files
find $S -name '*.xtend' | wc -l                                                     # Xtend files
find $S \( -name '*.java' -o -name '*.xtend' \) -exec wc -l {} + \
  | awk '$2!="total"{s+=$1} END{print s}'                                          # LOC
find plugins/org.eclipse.elk.<b> -name '*.melk'                                     # .melk files
```

Test plugins: same commands with `S=test/org.eclipse.elk.<t>/src`.

Results at ELK HEAD `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`: **110 package directories** in total
(the sum of the per-bundle row counts in this document and in the layered file), 677 Java + 5 Xtend
= 682 files, 134,600 LOC. Per-bundle package counts: `core` 14, `graph` 4, `graph.json` 1,
`alg.common` 14, `alg.layered` 29, `alg.mrtree` 8, `alg.radial` 11, `alg.force` 5, `alg.disco` 5,
`alg.rectpacking` 7, `alg.spore` 6, `alg.topdownpacking` 1, `alg.vertiflex` 5.

`find` found no `src-gen`/`xtend-gen` directories, no `.xtext`/`.xcore`, and no `.melk` outside
`src/` in the in-scope bundles. `graph` carries the EMF model `model/elkgraph.ecore` +
`elkgraph.genmodel` (AD-11 spec). `.melk` files in scope: 13 (core 2, alg.common 1, alg.layered 1,
alg.mrtree 1, alg.radial 1, alg.force 2, alg.disco 1, alg.rectpacking 1, alg.spore 1,
alg.topdownpacking 1, alg.vertiflex 1); `graph` and `graph.json` have none.

## Packages spanning bundles

No Java package is declared in two _source_ bundles. Prefix nesting and test-plugin overlap still
matter:

- **Nested bundle prefixes.** `graph` (`src/graph`) contains `graph.json` (`src/graph/json`).
  Longest prefix: `src/graph/json/**` belongs to `graph.json`, the rest of `src/graph/**` to
  `graph`.
- **In-scope bundle shares a prefix with out-of-scope bundles.** `core` vs `core.service`,
  `core.ui`, `core.meta`, `core.debug` (Reference); `alg.disco` vs `alg.disco.debug` (Reference).
  `core.debug.grandom` is in scope (D0) and gets its own `src/core/debug/grandom/` root. The
  out-of-scope ones are absent from `bundle-deps.json`, so `src/core/service/**` would silently
  resolve to `core`. They must not be ported; the fitness test cannot catch it.
- **Test plugins reuse source package names.** `org.eclipse.elk.core` exists in `core` and
  `core.test`; `graph.properties` in `graph` and `core.test`. Test classes land colocated in the
  same `src/` directory as `*.test.ts`; ownership follows the directory, not the plugin.
- **`.melk` package differs from its directory.** `alg/force/stress/Stress.melk` declares package
  `org.eclipse.elk.alg.force`, so output goes to `src/alg/force/options/`. `Core.melk` declares
  `org.eclipse.elk` and `metadataClass core.options.CoreOptions` gives
  `src/core/options/CoreOptions.ts`.

Bundle resolution is `bundleOf` in `test/architecture/module-boundaries.fitness.test.ts`: the
longest `tsDir` in `test/architecture/bundle-deps.json` that is a path prefix of the file. That file
lists the 13 in-scope `tsDir`s, so this map and it agree.

## AD-12 generated artifacts

`*Options.java` and `*MetaDataProvider.java` are not in the repo for any in-scope bundle: the
`.melk` compiler (`plugins/org.eclipse.elk.core.meta`, Xtext, out of scope) emits them at build
time. The only hand-written exceptions are `core/options/SizeOptions.java` and
`core/data/ILayoutMetaDataProvider.java`. The TS generator under `tools/melk/` emits the classes
listed in each bundle section ("Generated by AD-12"), committed to `src/`. Rule: `metadataClass` is
resolved relative to the `.melk` `package` declaration; the bundle-level `metadataClass` is the
provider, each `algorithm` adds one `*Options` class. 13 `.melk` files yield 27 generated classes.

## `core` → `src/core/`

14 package directories, 112 Java + 0 Xtend files, 20,414 LOC (`plugins/org.eclipse.elk.core/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory                | Files |   LOC | Strategy                                                                                                                                                    |
| ----------------------------------------- | --------------------------- | ----: | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                                    | `src/core`                  |     7 | 1,173 | hand port; hosts `Core.melk`                                                                                                                                |
| `core.alg`                                | `src/core/alg`              |     7 |   881 | hand port                                                                                                                                                   |
| `core.comments`                           | `src/core/comments`         |    16 | 2,625 | hand port                                                                                                                                                   |
| `core.data`                               | `src/core/data`             |     9 | 2,372 | hand port                                                                                                                                                   |
| `core.labels`                             | `src/core/labels`           |     1 |    46 | hand port; hosts `Labels.melk`; melk codegen (AD-12) output lands here                                                                                      |
| `core.math`                               | `src/core/math`             |    10 | 3,595 | hand port; `KVector`, `KVectorChain`, `Spacing`, `ElkMargin`, `ElkPadding` delivered early by mission 2 with `KVectorTest`/`KVectorChainTest`; rest pending |
| `core.options`                            | `src/core/options`          |    21 | 1,845 | hand port; melk codegen (AD-12) output lands here; `PortSide`, `Direction`, `SizeConstraint` delivered early by mission 2; rest with the `.melk` codegen    |
| `core.testing`                            | `src/core/testing`          |     2 |   253 | hand port (white-box test hooks, consumed by the `alg.test` framework helpers)                                                                              |
| `core.util`                               | `src/core/util`             |    25 | 5,738 | hand port (EMF types → AD-11); `IDataObject` delivered by mission 2                                                                                         |
| `core.util.adapters`                      | `src/core/util/adapters`    |     2 |   838 | hand port (EMF types → AD-11)                                                                                                                               |
| `core.util.internal`                      | `src/core/util/internal`    |     1 |    97 | hand port                                                                                                                                                   |
| `core.util.persistence`                   | `src/core/util/persistence` |     4 |   288 | not ported: EMF XMI resource/serializer (`ElkGraphResource*`, `ElkGraphXMI*`); no TS counterpart (AD-11 drops EMF)                                          |
| `core.util.selection`                     | `src/core/util/selection`   |     2 |   165 | hand port (EMF types → AD-11)                                                                                                                               |
| `core.validation`                         | `src/core/validation`       |     5 |   498 | hand port                                                                                                                                                   |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                                                                                                                                                                                                                            | Generated class                       | TS target                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------- |
| `core/Core.melk`                   | bundle (`idPrefix org.eclipse.elk`)                                                                                                                                                                                                                 | `CoreOptions`                         | `src/core/options/CoreOptions.ts`           |
| ↳                                  | `algorithm fixed(FixedLayoutProvider)`                                                                                                                                                                                                              | `FixedLayouterOptions`                | `src/core/options/FixedLayouterOptions.ts`  |
| ↳                                  | `algorithm box(BoxLayoutProvider)`                                                                                                                                                                                                                  | `BoxLayouterOptions`                  | `src/core/options/BoxLayouterOptions.ts`    |
| ↳                                  | `algorithm random(RandomLayoutProvider)`                                                                                                                                                                                                            | `RandomLayouterOptions`               | `src/core/options/RandomLayouterOptions.ts` |
| ↳                                  | categories: layered, orthogonal, force, circle, tree, planar, radial; 14 groups (box, json, spacing, partitioning, nodeLabels, portAlignment, nodeSize, edgeLabels, font, port, portLabels, topdown, insideSelfLoops, edge); 93 option declarations | (registered inside the classes above) | —                                           |
| `core/labels/Labels.melk`          | bundle (`idPrefix org.eclipse.elk.^labels`)                                                                                                                                                                                                         | `LabelManagementOptions`              | `src/core/labels/LabelManagementOptions.ts` |
| ↳                                  | 1 option declarations                                                                                                                                                                                                                               | (registered inside the classes above) | —                                           |

JUnit: `org.eclipse.elk.core.test` (8 package directories, 20 files, 2,554 LOC) → colocated tests:

| Test package       | TS target                        | Files | LOC | Strategy  |
| ------------------ | -------------------------------- | ----: | --: | --------- |
| `core`             | `src/core/*.test.ts`             |     2 | 212 | hand port |
| `core.alg`         | `src/core/alg/*.test.ts`         |     5 | 640 | hand port |
| `core.data`        | `src/core/data/*.test.ts`        |     2 | 230 | hand port |
| `core.issues`      | `src/core/issues/*.test.ts`      |     2 | 173 | hand port |
| `core.math`        | `src/core/math/*.test.ts`        |     5 | 866 | hand port |
| `core.util`        | `src/core/util/*.test.ts`        |     1 | 144 | hand port |
| `core.validation`  | `src/core/validation/*.test.ts`  |     2 | 157 | hand port |
| `graph.properties` | `src/graph/properties/*.test.ts` |     1 | 132 | hand port |

## `graph` → `src/graph/`

4 package directories, 40 Java + 0 Xtend files, 11,449 LOC (`plugins/org.eclipse.elk.graph/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory           | Files |   LOC | Strategy                                                                                                                                                                                                       |
| ----------------------------------------- | ---------------------- | ----: | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `graph`                                   | `src/graph`            |    13 | 3,646 | EMF → plain class (AD-11); delivered: interfaces, type guards, `ElkGraphPackage` (constants only), `ElkGraphFactory`                                                                                           |
| `graph.impl`                              | `src/graph/impl`       |    13 | 5,005 | EMF → plain class (AD-11); delivered: every `*Impl` on the `src/emf/` runtime; `ElkGraphPackageImpl` not ported (EMF metamodel registry)                                                                       |
| `graph.properties`                        | `src/graph/properties` |     9 |   685 | hand port; delivered: `Property`, `MapPropertyHolder`, `PropertyHolderComparator`, `GraphFeature`, annotation registries, interfaces                                                                           |
| `graph.util`                              | `src/graph/util`       |     5 | 2,113 | hand port; delivered: `ElkGraphUtil`, `ElkReflect`, `GraphIdentifierGenerator`; not ported: `ElkGraphAdapterFactory`, `ElkGraphSwitch` (EMF adapter/visitor plumbing, AD-11; the generator uses a guard chain) |

JUnit: `org.eclipse.elk.graph.test` (1 package directory, 1 file, 161 LOC) → colocated tests:

| Test package | TS target                  | Files | LOC | Strategy  |
| ------------ | -------------------------- | ----: | --: | --------- |
| `graph.util` | `src/graph/util/*.test.ts` |     1 | 161 | hand port |

## `graph.json` → `src/graph/json/`

1 package directory, 1 Java + 5 Xtend files, 1,971 LOC (`plugins/org.eclipse.elk.graph.json/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory     | Files |   LOC | Strategy                                                         |
| ----------------------------------------- | ---------------- | ----: | ----: | ---------------------------------------------------------------- |
| `graph.json`                              | `src/graph/json` |     6 | 1,971 | Xtend → hand port (5 `.xtend`) + hand port (`ElkGraphJson.java`) |

JUnit: `org.eclipse.elk.graph.json.test` (1 package directory, 9 files, 2,272 LOC) → colocated
tests:

| Test package      | TS target                  | Files |   LOC | Strategy                                               |
| ----------------- | -------------------------- | ----: | ----: | ------------------------------------------------------ |
| `graph.json.test` | `src/graph/json/*.test.ts` |     9 | 2,272 | Xtend → hand port (8 `.xtend`) + hand port (1 `.java`) |

## `alg.common` → `src/alg/common/`

14 package directories, 82 Java + 0 Xtend files, 14,677 LOC
(`plugins/org.eclipse.elk.alg.common/src`).

| Java package (`org.eclipse.elk.` omitted)   | TS directory                                    | Files |   LOC | Strategy                                          |
| ------------------------------------------- | ----------------------------------------------- | ----: | ----: | ------------------------------------------------- |
| `alg.common`                                | `src/alg/common`                                |     9 | 1,151 | hand port                                         |
| `alg.common.compaction`                     | `src/alg/common/compaction`                     |     2 |   200 | hand port; hosts `Polyomino.melk`                 |
| `alg.common.compaction.oned`                | `src/alg/common/compaction/oned`                |    13 | 1,729 | hand port                                         |
| `alg.common.compaction.options`             | `src/alg/common/compaction/options`             |     3 |    82 | hand port; melk codegen (AD-12) output lands here |
| `alg.common.networksimplex`                 | `src/alg/common/networksimplex`                 |     4 | 1,656 | hand port (EMF types → AD-11)                     |
| `alg.common.nodespacing`                    | `src/alg/common/nodespacing`                    |     3 |   739 | hand port                                         |
| `alg.common.nodespacing.cellsystem`         | `src/alg/common/nodespacing/cellsystem`         |     9 | 1,566 | hand port                                         |
| `alg.common.nodespacing.internal`           | `src/alg/common/nodespacing/internal`           |     3 |   864 | hand port                                         |
| `alg.common.nodespacing.internal.algorithm` | `src/alg/common/nodespacing/internal/algorithm` |    11 | 2,954 | hand port                                         |
| `alg.common.overlaps`                       | `src/alg/common/overlaps`                       |     3 |   497 | hand port                                         |
| `alg.common.polyomino`                      | `src/alg/common/polyomino`                      |     8 | 1,027 | hand port                                         |
| `alg.common.polyomino.structures`           | `src/alg/common/polyomino/structures`           |     6 | 1,148 | hand port                                         |
| `alg.common.spore`                          | `src/alg/common/spore`                          |     5 |   601 | hand port                                         |
| `alg.common.utils`                          | `src/alg/common/utils`                          |     3 |   463 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`)     | Declares                                    | Generated class                       | TS target                                               |
| -------------------------------------- | ------------------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| `alg/common/compaction/Polyomino.melk` | bundle (`idPrefix org.eclipse.elk`)         | `PolyominoOptions`                    | `src/alg/common/compaction/options/PolyominoOptions.ts` |
| ↳                                      | 1 groups (polyomino); 4 option declarations | (registered inside the classes above) | —                                                       |

JUnit: `org.eclipse.elk.alg.common.test` (5 package directories, 8 files, 1,715 LOC) → colocated
tests:

| Test package                 | TS target                                  | Files | LOC | Strategy  |
| ---------------------------- | ------------------------------------------ | ----: | --: | --------- |
| `alg.common`                 | `src/alg/common/*.test.ts`                 |     1 | 191 | hand port |
| `alg.common.compaction.oned` | `src/alg/common/compaction/oned/*.test.ts` |     1 | 693 | hand port |
| `alg.common.issues`          | `src/alg/common/issues/*.test.ts`          |     1 | 102 | hand port |
| `alg.common.networksimplex`  | `src/alg/common/networksimplex/*.test.ts`  |     1 | 103 | hand port |
| `alg.common.nodespacing`     | `src/alg/common/nodespacing/*.test.ts`     |     4 | 626 | hand port |

## `alg.layered` → `src/alg/layered/`

See [port-map-alg-layered.md](port-map-alg-layered.md) (29 package rows, 258 files, 64,082 LOC).

## `alg.mrtree` → `src/alg/mrtree/`

8 package directories, 38 Java + 0 Xtend files, 5,790 LOC
(`plugins/org.eclipse.elk.alg.mrtree/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory                  | Files |   LOC | Strategy                                          |
| ----------------------------------------- | ----------------------------- | ----: | ----: | ------------------------------------------------- |
| `alg.mrtree`                              | `src/alg/mrtree`              |     8 | 1,462 | hand port; hosts `Tree.melk`                      |
| `alg.mrtree.graph`                        | `src/alg/mrtree/graph`        |     6 |   645 | hand port                                         |
| `alg.mrtree.intermediate`                 | `src/alg/mrtree/intermediate` |    12 | 1,392 | hand port                                         |
| `alg.mrtree.options`                      | `src/alg/mrtree/options`      |     6 |   298 | hand port; melk codegen (AD-12) output lands here |
| `alg.mrtree.p1treeify`                    | `src/alg/mrtree/p1treeify`    |     1 |   192 | hand port                                         |
| `alg.mrtree.p2order`                      | `src/alg/mrtree/p2order`      |     2 |   533 | hand port                                         |
| `alg.mrtree.p3place`                      | `src/alg/mrtree/p3place`      |     1 |   345 | hand port                                         |
| `alg.mrtree.p4route`                      | `src/alg/mrtree/p4route`      |     2 |   923 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                   | Generated class                       | TS target                                          |
| ---------------------------------- | ------------------------------------------ | ------------------------------------- | -------------------------------------------------- |
| `alg/mrtree/Tree.melk`             | bundle (`idPrefix org.eclipse.elk.mrtree`) | `MrTreeMetaDataProvider`              | `src/alg/mrtree/options/MrTreeMetaDataProvider.ts` |
| ↳                                  | `algorithm mrtree(TreeLayoutProvider)`     | `MrTreeOptions`                       | `src/alg/mrtree/options/MrTreeOptions.ts`          |
| ↳                                  | 7 option declarations                      | (registered inside the classes above) | —                                                  |

JUnit: `org.eclipse.elk.alg.mrtree.test` (1 package directory, 1 file, 143 LOC) → colocated tests:

| Test package      | TS target                  | Files | LOC | Strategy  |
| ----------------- | -------------------------- | ----: | --: | --------- |
| `alg.mrtree.test` | `src/alg/mrtree/*.test.ts` |     1 | 143 | hand port |

## `alg.radial` → `src/alg/radial/`

11 package directories, 35 Java + 0 Xtend files, 2,752 LOC
(`plugins/org.eclipse.elk.alg.radial/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory                               | Files | LOC | Strategy                                          |
| ----------------------------------------- | ------------------------------------------ | ----: | --: | ------------------------------------------------- |
| `alg.radial`                              | `src/alg/radial`                           |     4 | 512 | hand port; hosts `Radial.melk`                    |
| `alg.radial.intermediate`                 | `src/alg/radial/intermediate`              |     3 | 235 | hand port                                         |
| `alg.radial.intermediate.compaction`      | `src/alg/radial/intermediate/compaction`   |     5 | 649 | hand port                                         |
| `alg.radial.intermediate.optimization`    | `src/alg/radial/intermediate/optimization` |     4 | 248 | hand port                                         |
| `alg.radial.intermediate.overlaps`        | `src/alg/radial/intermediate/overlaps`     |     2 | 139 | hand port                                         |
| `alg.radial.intermediate.rotation`        | `src/alg/radial/intermediate/rotation`     |     3 | 156 | hand port                                         |
| `alg.radial.options`                      | `src/alg/radial/options`                   |     5 | 248 | hand port; melk codegen (AD-12) output lands here |
| `alg.radial.p1position`                   | `src/alg/radial/p1position`                |     1 | 136 | hand port                                         |
| `alg.radial.p1position.wedge`             | `src/alg/radial/p1position/wedge`          |     3 | 107 | hand port                                         |
| `alg.radial.p2routing`                    | `src/alg/radial/p2routing`                 |     2 | 126 | hand port                                         |
| `alg.radial.sorting`                      | `src/alg/radial/sorting`                   |     3 | 196 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                    | Generated class                       | TS target                                          |
| ---------------------------------- | ------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| `alg/radial/Radial.melk`           | bundle (`idPrefix org.eclipse.elk.radial`)  | `RadialMetaDataProvider`              | `src/alg/radial/options/RadialMetaDataProvider.ts` |
| ↳                                  | `algorithm radial(RadialLayoutProvider)`    | `RadialOptions`                       | `src/alg/radial/options/RadialOptions.ts`          |
| ↳                                  | 1 groups (rotation); 12 option declarations | (registered inside the classes above) | —                                                  |

JUnit: `org.eclipse.elk.alg.radial.test` (1 package directory, 1 file, 102 LOC) → colocated tests:

| Test package      | TS target                  | Files | LOC | Strategy  |
| ----------------- | -------------------------- | ----: | --: | --------- |
| `alg.radial.test` | `src/alg/radial/*.test.ts` |     1 | 102 | hand port |

## `alg.force` → `src/alg/force/`

5 package directories, 17 Java + 0 Xtend files, 2,236 LOC (`plugins/org.eclipse.elk.alg.force/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory            | Files | LOC | Strategy                                          |
| ----------------------------------------- | ----------------------- | ----: | --: | ------------------------------------------------- |
| `alg.force`                               | `src/alg/force`         |     4 | 680 | hand port; hosts `Force.melk`                     |
| `alg.force.graph`                         | `src/alg/force/graph`   |     6 | 675 | hand port                                         |
| `alg.force.model`                         | `src/alg/force/model`   |     3 | 443 | hand port                                         |
| `alg.force.options`                       | `src/alg/force/options` |     2 |  76 | hand port; melk codegen (AD-12) output lands here |
| `alg.force.stress`                        | `src/alg/force/stress`  |     2 | 362 | hand port; hosts `Stress.melk`                    |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                   | Generated class                       | TS target                                         |
| ---------------------------------- | ------------------------------------------ | ------------------------------------- | ------------------------------------------------- |
| `alg/force/Force.melk`             | bundle (`idPrefix org.eclipse.elk.force`)  | `ForceMetaDataProvider`               | `src/alg/force/options/ForceMetaDataProvider.ts`  |
| ↳                                  | `algorithm force(ForceLayoutProvider)`     | `ForceOptions`                        | `src/alg/force/options/ForceOptions.ts`           |
| ↳                                  | 5 option declarations                      | (registered inside the classes above) | —                                                 |
| `alg/force/stress/Stress.melk`     | bundle (`idPrefix org.eclipse.elk.stress`) | `StressMetaDataProvider`              | `src/alg/force/options/StressMetaDataProvider.ts` |
| ↳                                  | `algorithm stress(StressLayoutProvider)`   | `StressOptions`                       | `src/alg/force/options/StressOptions.ts`          |
| ↳                                  | 5 option declarations                      | (registered inside the classes above) | —                                                 |

JUnit: `org.eclipse.elk.alg.force.test` (1 package directory, 1 file, 111 LOC) → colocated tests:

| Test package     | TS target                 | Files | LOC | Strategy  |
| ---------------- | ------------------------- | ----: | --: | --------- |
| `alg.force.test` | `src/alg/force/*.test.ts` |     1 | 111 | hand port |

## `alg.disco` → `src/alg/disco/`

5 package directories, 13 Java + 0 Xtend files, 2,409 LOC (`plugins/org.eclipse.elk.alg.disco/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory               | Files |   LOC | Strategy                                          |
| ----------------------------------------- | -------------------------- | ----: | ----: | ------------------------------------------------- |
| `alg.disco`                               | `src/alg/disco`            |     3 |   398 | hand port; hosts `Disco.melk`                     |
| `alg.disco.graph`                         | `src/alg/disco/graph`      |     5 |   684 | hand port                                         |
| `alg.disco.options`                       | `src/alg/disco/options`    |     1 |    34 | hand port; melk codegen (AD-12) output lands here |
| `alg.disco.structures`                    | `src/alg/disco/structures` |     1 |   267 | hand port                                         |
| `alg.disco.transform`                     | `src/alg/disco/transform`  |     3 | 1,026 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                                     | Generated class                       | TS target                                        |
| ---------------------------------- | ------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------ |
| `alg/disco/Disco.melk`             | bundle (`idPrefix org.eclipse.elk.disco`)                    | `DisCoMetaDataProvider`               | `src/alg/disco/options/DisCoMetaDataProvider.ts` |
| ↳                                  | `algorithm disco(DisCoLayoutProvider)`                       | `DisCoOptions`                        | `src/alg/disco/options/DisCoOptions.ts`          |
| ↳                                  | 2 groups (componentCompaction, debug); 4 option declarations | (registered inside the classes above) | —                                                |

JUnit: `org.eclipse.elk.alg.disco.test` (1 package directory, 1 file, 169 LOC) → colocated tests:

| Test package     | TS target                 | Files | LOC | Strategy  |
| ---------------- | ------------------------- | ----: | --: | --------- |
| `alg.disco.test` | `src/alg/disco/*.test.ts` |     1 | 169 | hand port |

## `alg.rectpacking` → `src/alg/rectpacking/`

7 package directories, 38 Java + 0 Xtend files, 4,688 LOC
(`plugins/org.eclipse.elk.alg.rectpacking/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory                                  | Files |   LOC | Strategy                                          |
| ----------------------------------------- | --------------------------------------------- | ----: | ----: | ------------------------------------------------- |
| `alg.rectpacking`                         | `src/alg/rectpacking`                         |     3 |   319 | hand port; hosts `RectPacking.melk`               |
| `alg.rectpacking.intermediate`            | `src/alg/rectpacking/intermediate`            |     6 |   340 | hand port (EMF types → AD-11)                     |
| `alg.rectpacking.options`                 | `src/alg/rectpacking/options`                 |     2 |   101 | hand port; melk codegen (AD-12) output lands here |
| `alg.rectpacking.p1widthapproximation`    | `src/alg/rectpacking/p1widthapproximation`    |     9 |   886 | hand port                                         |
| `alg.rectpacking.p2packing`               | `src/alg/rectpacking/p2packing`               |     7 | 1,179 | hand port                                         |
| `alg.rectpacking.p3whitespaceelimination` | `src/alg/rectpacking/p3whitespaceelimination` |     4 |   238 | hand port                                         |
| `alg.rectpacking.util`                    | `src/alg/rectpacking/util`                    |     7 | 1,625 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                                                              | Generated class                       | TS target                                                    |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `alg/rectpacking/RectPacking.melk` | bundle (`idPrefix org.eclipse.elk.rectpacking`)                                       | `RectPackingMetaDataProvider`         | `src/alg/rectpacking/options/RectPackingMetaDataProvider.ts` |
| ↳                                  | `algorithm rectpacking(RectPackingLayoutProvider)`                                    | `RectPackingOptions`                  | `src/alg/rectpacking/options/RectPackingOptions.ts`          |
| ↳                                  | 3 groups (widthApproximation, packing, whiteSpaceElimination); 13 option declarations | (registered inside the classes above) | —                                                            |

JUnit: `org.eclipse.elk.alg.rectpacking.test` (2 package directories, 3 files, 840 LOC) → colocated
tests:

| Test package             | TS target                              | Files | LOC | Strategy  |
| ------------------------ | -------------------------------------- | ----: | --: | --------- |
| `alg.rectpacking`        | `src/alg/rectpacking/*.test.ts`        |     2 | 752 | hand port |
| `alg.rectpacking.issues` | `src/alg/rectpacking/issues/*.test.ts` |     1 |  88 | hand port |

## `alg.spore` → `src/alg/spore/`

6 package directories, 18 Java + 0 Xtend files, 1,326 LOC (`plugins/org.eclipse.elk.alg.spore/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory                      | Files | LOC | Strategy                                          |
| ----------------------------------------- | --------------------------------- | ----: | --: | ------------------------------------------------- |
| `alg.spore`                               | `src/alg/spore`                   |     6 | 618 | hand port; hosts `SPOrE.melk`                     |
| `alg.spore.graph`                         | `src/alg/spore/graph`             |     1 |  69 | hand port                                         |
| `alg.spore.options`                       | `src/alg/spore/options`           |     6 | 226 | hand port; melk codegen (AD-12) output lands here |
| `alg.spore.p1structure`                   | `src/alg/spore/p1structure`       |     1 |  61 | hand port                                         |
| `alg.spore.p2processingorder`             | `src/alg/spore/p2processingorder` |     2 | 157 | hand port                                         |
| `alg.spore.p3execution`                   | `src/alg/spore/p3execution`       |     2 | 195 | hand port                                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                                                                  | Generated class                       | TS target                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `alg/spore/SPOrE.melk`             | bundle (`idPrefix org.eclipse.elk`)                                                       | `SporeMetaDataProvider`               | `src/alg/spore/options/SporeMetaDataProvider.ts`      |
| ↳                                  | `algorithm sporeOverlap(OverlapRemovalLayoutProvider)`                                    | `SporeOverlapRemovalOptions`          | `src/alg/spore/options/SporeOverlapRemovalOptions.ts` |
| ↳                                  | `algorithm sporeCompaction(ShrinkTreeLayoutProvider)`                                     | `SporeCompactionOptions`              | `src/alg/spore/options/SporeCompactionOptions.ts`     |
| ↳                                  | 4 groups (structure, processingOrder, compaction, overlapRemoval); 10 option declarations | (registered inside the classes above) | —                                                     |

JUnit: `org.eclipse.elk.alg.spore.test` (1 package directory, 2 files, 249 LOC) → colocated tests:

| Test package     | TS target                 | Files | LOC | Strategy  |
| ---------------- | ------------------------- | ----: | --: | --------- |
| `alg.spore.test` | `src/alg/spore/*.test.ts` |     2 | 249 | hand port |

## `alg.topdownpacking` → `src/alg/topdownpacking/`

1 package directory, 9 Java + 0 Xtend files, 1,113 LOC
(`plugins/org.eclipse.elk.alg.topdownpacking/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory             | Files |   LOC | Strategy                                                   |
| ----------------------------------------- | ------------------------ | ----: | ----: | ---------------------------------------------------------- |
| `alg.topdownpacking`                      | `src/alg/topdownpacking` |     9 | 1,113 | hand port (EMF types → AD-11); hosts `Topdownpacking.melk` |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`)       | Declares                                                                 | Generated class                       | TS target                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------- | ------------------------------------------------------------------ |
| `alg/topdownpacking/Topdownpacking.melk` | bundle (`idPrefix org.eclipse.elk.topdownpacking`)                       | `TopdownpackingMetaDataProvider`      | `src/alg/topdownpacking/options/TopdownpackingMetaDataProvider.ts` |
| ↳                                        | `algorithm topdownpacking(TopdownpackingLayoutProvider)`                 | `TopdownpackingOptions`               | `src/alg/topdownpacking/options/TopdownpackingOptions.ts`          |
| ↳                                        | 2 groups (nodeArrangement, whitespaceElimination); 2 option declarations | (registered inside the classes above) | —                                                                  |

New TS directories with no Java package (melk codegen (AD-12) only):
`src/alg/topdownpacking/options/` (TopdownpackingMetaDataProvider, TopdownpackingOptions).

JUnit: `org.eclipse.elk.alg.topdown.test` (2 package directories, 3 files, 648 LOC) → colocated
tests:

| Test package               | TS target                          | Files | LOC | Strategy  |
| -------------------------- | ---------------------------------- | ----: | --: | --------- |
| `alg.topdown.layered.test` | `src/alg/topdownpacking/*.test.ts` |     1 | 124 | hand port |
| `alg.topdown.test`         | `src/alg/topdownpacking/*.test.ts` |     2 | 524 | hand port |

## `alg.vertiflex` → `src/alg/vertiflex/`

5 package directories, 16 Java + 0 Xtend files, 1,693 LOC
(`plugins/org.eclipse.elk.alg.vertiflex/src`).

| Java package (`org.eclipse.elk.` omitted) | TS directory                      | Files | LOC | Strategy                          |
| ----------------------------------------- | --------------------------------- | ----: | --: | --------------------------------- |
| `alg.vertiflex`                           | `src/alg/vertiflex`               |     5 | 366 | hand port; hosts `VertiFlex.melk` |
| `alg.vertiflex.p1yplacement`              | `src/alg/vertiflex/p1yplacement`  |     2 | 122 | hand port                         |
| `alg.vertiflex.p2relative`                | `src/alg/vertiflex/p2relative`    |     4 | 876 | hand port                         |
| `alg.vertiflex.p3absolute`                | `src/alg/vertiflex/p3absolute`    |     2 | 125 | hand port                         |
| `alg.vertiflex.p4edgerouting`             | `src/alg/vertiflex/p4edgerouting` |     3 | 204 | hand port                         |

Generated by AD-12 (not in the Java repo; produced at build time by the `.melk` compiler):

| `.melk` (under `org/eclipse/elk/`) | Declares                                       | Generated class                       | TS target                                                |
| ---------------------------------- | ---------------------------------------------- | ------------------------------------- | -------------------------------------------------------- |
| `alg/vertiflex/VertiFlex.melk`     | bundle (`idPrefix org.eclipse.elk.vertiflex`)  | `VertiFlexMetaDataProvider`           | `src/alg/vertiflex/options/VertiFlexMetaDataProvider.ts` |
| ↳                                  | `algorithm vertiflex(VertiFlexLayoutProvider)` | `VertiFlexOptions`                    | `src/alg/vertiflex/options/VertiFlexOptions.ts`          |
| ↳                                  | 4 option declarations                          | (registered inside the classes above) | —                                                        |

New TS directories with no Java package (melk codegen (AD-12) only): `src/alg/vertiflex/options/`
(VertiFlexMetaDataProvider, VertiFlexOptions).

JUnit: no test plugin in the ELK `test/` tree.

## Test support plugins

Not attached to a bundle; they hold shared test infrastructure and cross-bundle integration tests.

`org.eclipse.elk.alg.test`: 9 package directories, 46 files, 4,023 LOC → `test/helpers/alg/**`
(helpers, shared by every algorithm test; `test/helpers/` per CLAUDE.md).

| Test package                     | TS target                                 | Files | LOC | Strategy  |
| -------------------------------- | ----------------------------------------- | ----: | --: | --------- |
| `alg.test`                       | `test/helpers/alg/`                       |     2 | 302 | hand port |
| `alg.test.framework`             | `test/helpers/alg/framework/`             |     5 | 986 | hand port |
| `alg.test.framework.algorithm`   | `test/helpers/alg/framework/algorithm/`   |     1 | 149 | hand port |
| `alg.test.framework.annotations` | `test/helpers/alg/framework/annotations/` |    16 | 524 | hand port |
| `alg.test.framework.config`      | `test/helpers/alg/framework/config/`      |     3 | 399 | hand port |
| `alg.test.framework.graph`       | `test/helpers/alg/framework/graph/`       |     5 | 503 | hand port |
| `alg.test.framework.io`          | `test/helpers/alg/framework/io/`          |     8 | 599 | hand port |
| `alg.test.framework.util`        | `test/helpers/alg/framework/util/`        |     1 | 147 | hand port |
| `alg.test.tests`                 | `test/helpers/alg/tests/`                 |     5 | 414 | hand port |

`org.eclipse.elk.shared.test`: 1 package directory, 4 files, 425 LOC → `test/integration/`
(cross-bundle tests; cannot be colocated under one `src/` bundle).

| Test package  | TS target           | Files | LOC | Strategy  |
| ------------- | ------------------- | ----: | --: | --------- |
| `shared.test` | `test/integration/` |     4 | 425 | hand port |

## Grammar bundles added by D0 (not in the Summary totals above)

Added by D0 in `plans/conformance-corpus/decisions.md`. LOC = `wc -l` over hand-written files,
excluding `src-gen/` and `xtend-gen/`; the `.xtext` grammar is counted separately from
Java + Xtend. Approach: one hand-written parse method per Xtext rule (D8); no Xtext or ANTLR.

| Bundle (`org.eclipse.elk.`) | TS root                   |                            Files | Java+Xtend LOC | `.xtext` LOC | Total LOC |
| --------------------------- | ------------------------- | -------------------------------: | -------------: | -----------: | --------: |
| `graph.text`                | `src/graph/text/`         |          18 (17 Xtend + 1 xtext) |          1,232 |          120 |     1,352 |
| `graph.json.text`           | `src/graph/json/text/`    | 15 (1 Java + 13 Xtend + 1 xtext) |            801 |          171 |       972 |
| `core.debug.grandom`        | `src/core/debug/grandom/` |   9 (3 Java + 5 Xtend + 1 xtext) |          2,543 |          153 |     2,696 |

Mission mapping: `graph.text` is roadmap 4b, `graph.json.text` 4c, `core.debug.grandom` 4d
(`plans/roadmap.md`, Revision 2026-10-11). TS roots are proposed; `bundle-deps.json` gains the
three bundles when their missions start.

## Out of scope or deferred (not rows above)

`core.service`, `core.ui`, `core.meta`, `core.meta.ui`, `conn.gmf`, `graph.text.ui`,
`graph.json.text.ui`, `core.debug.grandom.ui` (out of scope); `alg.libavoid`, `alg.graphviz.dot`,
`alg.graphviz.layouter`, `graph.text.ide`, `graph.json.text.ide`, `core.debug.grandom.ide`
(deferred); `core.debug`, `alg.disco.debug` (reference only: read for ideas, never ported).
`core.meta` contains the `.melk` compiler whose behavior the `tools/melk/` generator reproduces
(AD-12); it is read as a reference only. `graph.text`, `graph.json.text` and `core.debug.grandom`
are in scope per D0 (`plans/conformance-corpus/decisions.md`); see the next section.
