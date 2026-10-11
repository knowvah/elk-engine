<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — conformance-corpus (2026-10-11)

## Observation: elk-models covers almost only layered
- **Context**: Choosing the conformance unit.
- **Finding**: Explicit `algorithm:` keys across all models: layered dominant; rectpacking 4,
  stress 3, box 3, fixed 1. About 822 files set none (default layered). Zero models for mrtree,
  radial, force, disco, spore, topdownpacking, vertiflex. Distinct model ids: 898.
- **Impact**: Other algorithms need retargeted or generated inputs (decisions D2, D7).
- **Confidence**: High

## Observation: model basenames collide across folders
- **Context**: Planning a corpus sweep through `run.sh`.
- **Finding**: 217 basenames repeat across distinct model paths (e.g. ptolemy `hierarchical/`
  vs `flattened/`). `run.sh` names outputs by basename and requires uniqueness per run.
- **Impact**: Corpus-scale runs need id-keyed case files (T3).
- **Confidence**: High

## Observation: the oracle already builds the grammar bundles
- **Context**: Scoping the `.elkt` / `.elkr` oracle modes.
- **Finding**: `../elk-oracle/plugins/org.eclipse.elk.{graph.text,graph.json.text,core.debug.grandom}/target/*.jar`
  exist after `build.sh`, but `oracle-build.json` records only the 13 original bundles. `run.sh`
  already resolves xbase.lib, xtend.lib, xtend.lib.macro from the p2 cache.
- **Impact**: No Maven change needed; only recording and classpath work.
- **Confidence**: High

## Observation: ELK's test framework needs graph.text and grandom
- **Context**: Whether `core.debug.grandom` is worth porting.
- **Finding**: `alg.test` requires `core.debug.grandom` and `graph.text`;
  `PlainJavaInitialization.java:84-86` calls `GRandomStandaloneSetup.doSetup()` and
  `ElkGraphStandaloneSetup.doSetup()`. No ELK test uses `@RandomGeneratorFile` today.
  `BlindTextGenerator` (edge label text) uses an unseeded `new Random()`.
- **Impact**: Generated goldens must keep edge labels off.
- **Confidence**: High

## Observation: vitest does not collect tests under tools/
- **Context**: Placing tests for new `tools/corpus/*.ts` scripts.
- **Finding**: `vitest.config.ts` includes only `src/**/*.test.ts` and `test/**/*.test.ts`;
  coverage thresholds apply to `src/**` only. Existing tool tests live in `test/architecture/`.
- **Impact**: Tool tests go in `test/corpus/`; tool code is not under the coverage gate.
- **Confidence**: High
