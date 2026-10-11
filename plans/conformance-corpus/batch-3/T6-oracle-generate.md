<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6 — Oracle generate mode + generated corpus

**Agent:** java-architect · **Commit:** `feat(corpus): add seeded generated graphs for uncovered algorithms`

## Context
elk-models has no model for mrtree, radial, force, disco, sporeOverlap, sporeCompaction,
topdownpacking, or vertiflex (the planning count said 7 algorithms; confirm the exact list from
`run.sh --list-algorithms` against `test/corpus/census.json` `declaredAlgorithms`/`rootAlgorithm`).
`core.debug.grandom` generates graphs from `.elkr` configs (`GRandom.xtext`; `seed = <Integer>`
at line 39; forms `trees`, `graphs`, `bipartite graphs`, …). Generation uses `new Random(seed)`,
but edge labels come from the unseeded `BlindTextGenerator` (`RandomGraphGenerator.java:1248`).
The oracle build already records the grandom jar (T3).

## Task
Add `mode: "generate"` to the harness, write configs that cover every uncovered algorithm, and
commit the configs plus their oracle-generated JSON inputs.

## Write-set
`tools/oracle/harness/ElkOracle.java`, new `tools/oracle/harness/*.java` helpers,
`tools/oracle/run.sh`, `tools/oracle/regen-generated.sh` (new), `tools/oracle/README.md`,
`test/corpus/generated/**`, `test/corpus/generated.test.ts`.

## Read-set
- `../decisions.md#d7--generated-models`, `#d1--conformance-unit`
- `../batch-2/T5-oracle-retarget.md#interface-contract-extends-t3-consumed-by-t6-t7-t8`
- `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core.debug.grandom/src/org/eclipse/elk/core/debug/grandom/GRandom.xtext`
- `.../grandom/generators/ConfigurationParser.xtend` · `GeneratorOptions.java` ·
  `RandomGraphGenerator.java:100-140,1230-1260`
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/PlainJavaInitialization.java:82-86`

## Interface contract (consumed by T8)
- Case line: `{ "id", "input": "<path>.elkr", "mode": "generate" }` → one graph in
  `<outDir>/<id>.json`. Each `.elkr` holds exactly one `generate 1 <form> { … seed = N … }`.
- File naming: `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` with its sibling
  `<algorithmSuffix>-<shape>.json`; `<algorithmSuffix>` is the algorithm id minus
  `org.eclipse.elk.` (e.g. `mrtree-tree-small`). T8 runs each input under that algorithm.
- `tools/oracle/regen-generated.sh` regenerates every `.json` from its `.elkr` (staging dir +
  rename, like `regen-goldens.sh`).

## Acceptance criteria
- Given each uncovered algorithm, then at least one config exists for it, and running its
  generated input under that algorithm in layout mode gives status `ok` (record per config in the
  journal; 3 failed attempts for one algorithm = STOP 8).
- Given `regen-generated.sh` run twice (separate JVMs), then `git diff --exit-code test/corpus/generated`
  is clean after the second run.
- Given `generated.test.ts`, then for every `.elkr`: it sets `seed`, a sibling `.json` exists,
  the JSON has ≤ 50 nodes in total, and no edge carries labels.
- Given the four goldens, when `regen-goldens.sh` runs, then `git diff --exit-code test/golden/refs` is clean.

## Quality bar
README gates plus oracle gates; `shellcheck` clean; generated JSON pretty-printed and stable.

## Observability
`regen-generated.sh` prints one line per config: name, nodes, edges, ms.

## Rollback
Reversible — revert the commit.

## Boundaries
No hand-written graphs (D7). Do not edit `test/corpus/manifest.json` (T7).
