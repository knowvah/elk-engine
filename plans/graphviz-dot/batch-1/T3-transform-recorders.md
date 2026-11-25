<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3: transform recorders (export, import) and the export sweep script

**Owner:** subagent (`claude`, opus). **Budget:** 90 min. **Commit:** `test(graphviz-dot): record jvm vectors of dot export
and import`.

## Context

`DotExporter.transform` turns an `ElkNode` into a `GraphvizModel`. Seven public properties steer it (`COMMAND`,
`USE_EDGE_IDS`, `HIERARCHY`, `TRANSFORM_NODE_LAYOUT`, `TRANSFORM_EDGE_LAYOUT`, `TRANSFORM_NODE_LABELS`,
`ADAPT_PORT_POSITIONS`), plus the protected `USE_SPLINES` that `LayoutDotExporter` sets (`DotExporter.java:79-109`).
`transform` mutates the source (`ElkUtil.resizeNode`, `:208`). `transferLayout` reads a laid-out model back into the graph
(`:142-341`). `DotImporter` is the reverse direction, with its own `transferLayout`.

## Write-set

- `tools/vectors/DotExportVectors.java`, `tools/vectors/DotImportVectors.java`.
- `tools/vectors/dot-export-scenarios/*.elkt`, `tools/vectors/dot-import-scenarios/*.dot`.
- `tools/oracle/dot-export-sweep.sh` and its program `tools/oracle/DotExportSweep.java` (the shape of `elkt-sweep.sh` and
  `ElktSweep.java`).
- `test/golden/refs/java/graphviz-dot-{export,import}.json`, written by `dot-vectors.sh`.

T3 does not edit `dot-vectors.sh` or `dot-graphviz-output/` (T2's). If a new fixture is needed, ask the orchestrator.

## Read-set

`transform/*.java`; `tools/vectors/TransferVectors.java` and `GraphVectors.java` (ElkGraph dump conventions);
`tools/oracle/elkt-sweep.sh` and `ElktSweep.java` (sweep pattern, verdict layout under `$ELK_ORACLE_DIR/sweep/`); T2's `dot-vectors.sh` and
fixtures; `test/corpus/manifest.json` (elk-models pin).

## Steps

1. Scenarios: `.elkt` graphs covering flat and hierarchical graphs, ports, node, edge and port labels (each
   `EdgeLabelPlacement`), padding, size constraints, fixed positions, bend points, edges across hierarchy, self loops, and font
   options. Load them with the oracle's `.elkt` loader under the CoreOptions-only registry (G3, `ORACLE_REGISTRY=core`
   mechanism).
2. `DotExportVectors`: for each scenario × property set (every boolean in both states at least once, every `Command`, and
   `USE_SPLINES` through a test subclass), record the unformatted serialized text of the target model, a dump of the source
   graph after `transform`, and the `GRAPH_ELEMS` ids in iteration order only if the Java iterates them (D10). For
   `transferLayout`, pair export scenarios with T2's fixture outputs and hand-written laid-out DOT, and record the ElkGraph
   dump after transfer, or the exception class and message.
3. `DotImportVectors`: for each DOT scenario, record the ElkGraph dump after `DotImporter.transform` (properties included) and
   after `transferLayout` on laid-out input. Include every attribute `DotImporter` reads (the 20 `Attributes` constants it
   names, `BOUNDINGBOX` to `WIDTH`), malformed numbers, and missing attributes.
4. `dot-export-sweep.sh`: for every elk-models `.elkt` (path from `ELK_MODELS_DIR`), write the oracle's unformatted exporter
   text under default properties, or the exception, into `$ELK_ORACLE_DIR/sweep/dot-export/<model>.dot`. It is resumable, and
   its `--list` mode prints the models. Do not run the full sweep here: run it on 20 models as a smoke test. T12 runs it in
   full.
5. Run `dot-vectors.sh` twice; `cmp`; commit.

## Acceptance criteria

- Given the export vectors, when recorded, then every public property of `DotExporter` appears in both states and every
  `Command` appears at least once.
- Given `transferLayout` rows, when recorded, then at least one row uses each of the five algorithm fixtures and one row
  records an exception.
- Given `dot-export-sweep.sh` on 20 models, when run twice, then the output files are byte-identical.
- Given both refs, when regenerated, then they are byte-identical and carry no `oracle` field (D7).

**Observability:** N/A. **Rollback:** reversible (new files only).
