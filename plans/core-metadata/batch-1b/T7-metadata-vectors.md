<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — JVM metadata dump (`metadata.json`)

**Agent:** java-architect · **Commit:** `test(T7): record layout metadata from the oracle jvm`

## Context
The generator's correctness reference (AD-12, C4). ELK does not commit its generated `*Options` /
`*MetaDataProvider` classes; the oracle build compiled them into its jars. This task records what
they do on the JVM **before** any generator code exists (AD-13). The only oracle patch (0001,
`JsonExporter`) does not touch metadata.

## Task
1. `tools/vectors/MetaDataVectors.java` (single-file source launcher, like `GraphVectors.java`):
   - **(i) providers.** For each of the 27 generated classes below, `new X().apply(recorder)` where
     `recorder` implements `ILayoutMetaDataProvider.Registry` and records, in call order:
     `register(LayoutOptionData)` (every getter: id, group, name, description, type, optionClass,
     default, lowerBound, upperBound, targets, visibility, legacyIds — read via the public API),
     `register(LayoutCategoryData)` (id, name, description), `register(LayoutAlgorithmData)` (id,
     name, description, category id, bundle name, defining bundle id, preview image path, supported features,
     validator class or null, provider factory **class name** — never call `create()`),
     `addDependency(source, target, value)`, `addOptionSupport(algorithm, option, default)`.
   - **(ii) service.** `LayoutMetaDataService.getInstance()` then
     `registerLayoutMetaDataProviders(new LabelManagementOptions())`; dump `getOptionData()`,
     `getCategoryData()` (with each category's layouter ids) and `getAlgorithmData()` (with known
     options and their defaults, in JVM iteration order) in service order, plus each option's
     resolved dependencies.
   - Values encoded per [C4](../decisions.md#c4--jvm-metadata-golden); an unencodable value aborts
     with its class name (stop condition 6). Keys sorted, 2-space indent, trailing newline, so the
     file is byte-stable.
2. `tools/vectors/metadata-vectors.sh <outDir>`: copy of the `graph-vectors.sh` structure; classpath
   = every jar in `../elk-oracle/oracle-build.json` `jars` + the third-party bundles their
   `Require-Bundle` needs from the p2 cache (Guava, EMF common/ecore, Xtext/Xbase lib if a class
   load demands it — journal the final list); same pinned-commit check.
3. Generate `test/golden/refs/java/metadata.json`; run twice; byte-identical.

The 27 classes (13 `.melk` files): `org.eclipse.elk.core.options.{CoreOptions,FixedLayouterOptions,
BoxLayouterOptions,RandomLayouterOptions}`, `org.eclipse.elk.core.labels.LabelManagementOptions`,
`org.eclipse.elk.alg.common.compaction.options.PolyominoOptions`,
`org.eclipse.elk.alg.disco.options.{DisCoMetaDataProvider,DisCoOptions}`,
`org.eclipse.elk.alg.force.options.{ForceMetaDataProvider,ForceOptions,StressMetaDataProvider,StressOptions}`,
`org.eclipse.elk.alg.layered.options.{LayeredMetaDataProvider,LayeredOptions}`,
`org.eclipse.elk.alg.mrtree.options.{MrTreeMetaDataProvider,MrTreeOptions}`,
`org.eclipse.elk.alg.radial.options.{RadialMetaDataProvider,RadialOptions}`,
`org.eclipse.elk.alg.rectpacking.options.{RectPackingMetaDataProvider,RectPackingOptions}`,
`org.eclipse.elk.alg.spore.options.{SporeMetaDataProvider,SporeCompactionOptions,SporeOverlapRemovalOptions}`,
`org.eclipse.elk.alg.topdownpacking.options.{TopdownpackingMetaDataProvider,TopdownpackingOptions}`,
`org.eclipse.elk.alg.vertiflex.options.{VertiFlexMetaDataProvider,VertiFlexOptions}`.

## Write-set
`tools/vectors/MetaDataVectors.java`, `tools/vectors/metadata-vectors.sh`,
`test/golden/refs/java/metadata.json`.

## Read-set
- `tools/vectors/graph-vectors.sh` (whole), `tools/vectors/GraphVectors.java` (JSON writer style)
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core/data/{ILayoutMetaDataProvider,LayoutOptionData,LayoutCategoryData,LayoutAlgorithmData}.java` (getters)
- `…/core/data/LayoutMetaDataService.java:44-110,192-480`
- `../elk-oracle/plugins/org.eclipse.elk.core/src-gen/org/eclipse/elk/core/options/CoreOptions.java:1700-2700` (what `apply` calls)
- `tools/oracle/harness/ElkOracle.java:173-189`

## Interface contract (consumed by T11, T12, T13, T14, T17)
```json
{ "elkCommit": "<sha>",
  "providers": { "<fully qualified class>": [ { "call": "registerOption", "data": {…} },
                                              { "call": "registerCategory", "data": {…} },
                                              { "call": "registerAlgorithm", "data": {…} },
                                              { "call": "addDependency", "source": "…", "target": "…", "value": <C4> },
                                              { "call": "addOptionSupport", "algorithm": "…", "option": "…", "default": <C4> } ] },
  "service": { "options": [ {…, "dependencies": [ { "target": "…", "value": <C4> } ] } ],
               "categories": [ {…, "layouters": ["…"] } ],
               "algorithms": [ {…, "knownOptions": [ { "id": "…", "default": <C4> } ] } ] } }
```
Field names inside `data` follow the Java getter names without `get`/`is` (`id`, `group`, `name`,
`description`, `type`, `optionClass`, `default`, `lowerBound`, `upperBound`, `targets`,
`visibility`, `legacyIds`, `category`, `bundleName`, `definingBundleId`, `previewImagePath`, `supportedFeatures`,
`validatorClass`, `factoryClass`). Document the schema in the Java file header.

## Acceptance criteria
- Given the oracle jars, when the script runs twice, then `metadata.json` is byte-identical.
- Given the dump, then `providers` has exactly the 27 classes, and `service.algorithms` holds
  exactly fixed, box and random (registered by `CoreOptions.apply` through the three algorithm
  classes; the TS check subtracts C1's pending set).
- Given `supports org.eclipse.elk.aspectRatio = 1.6f` (`Layered.melk:125`), then the
  `addOptionSupport` default in `LayeredOptions` encodes as `{"t":"double","v":"1.600000023841858"}`.
- Given `JavaVectors.java` and `graph-vectors.sh` rerun, then the existing refs are unchanged.

## Quality bar
README gates; `shellcheck` clean; lizard clean on the Java (≤ 30 NLOC per method, CCN ≤ 10).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Never read OpenJDK source (AD-9). No elkjs. No edits to existing vector files or scripts.
