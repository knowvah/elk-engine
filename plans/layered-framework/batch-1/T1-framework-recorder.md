<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredFrameworkVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered framework vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7a (README). The TS port of the layered framework (LGraph model, ElkGraph ↔ LGraph transform, layered
options) needs oracle expectations recorded **before** the TS exists (AD-13, L3, L4). This recorder calls the oracle's
public layered classes directly from a plain-classpath JDK 21 single-file launcher and records three groups.

- **Patterns, read first:** `tools/vectors/NodeMicroLayoutVectors.java` (header layout, classpath, model reading and
  SHA-256 pinning, `hex` doubles, NS1 export flags, round trip, twice-run stability, one `cache:` line) and
  `tools/vectors/node-micro-layout-vectors.sh`; `tools/vectors/MetaDataVectors.java` for the service-dump format and
  C4 value encoding (reuse its shapes; do not edit it).
- **Never edit** `tools/vectors/vector-cache.sh`, `JavaVectors.java`, any landed `test/golden/refs/java/*`, or another
  recorder. Do not run the other recorder scripts (they would go cold).

## Task

1. **`tools/vectors/LayeredFrameworkVectors.java`:** JDK 21 single-file launcher; classpath as
   `node-micro-layout-vectors.sh` plus the `alg.layered` jar. Header: SPDX, one paragraph per group, the row format,
   the LGraph dump format, the round-trip and stability checks. Register core + labels + layered metadata before
   parsing any model (layered options must resolve).
2. **Row format:** `{ id, group, input, options, expected }` or `{ id, group, input, options, exception: { class,
   message } }`. `input` = the prepared graph exported with `ElkGraphJson.forGraph(root)` and the NS1 flags
   (compact), or `null` for `metadata`. `options` = the sweep options applied to the root before import (already
   present in `input`; listed for readability), or `{}`. Doubles are 16-hex raw bits; enums and ids are strings.
3. **Group `transform`** (ids `transform/<model path without extension>` and `transform/sweep-<n>`):
   - models: `test/corpus/elkt-curated/**/*.elkt` (31), `test/golden/inputs/tickets/core/*.elkt` (4), and the
     `test/golden/inputs/manifest.json` realworld JSON rows (hierarchical ones exercise compound import);
   - a pairwise sweep on small synthetic graphs (2–6 nodes, ports, labels, one hierarchy level, external ports,
     self loops) over the options the importer and transferrer read (`grep -o 'LayeredOptions\.[A-Z_]*'` on both
     files; 35 + 13 ids at planning), at minimum `DIRECTION`, `PORT_CONSTRAINTS`, `PORT_SIDE`, `PORT_ANCHOR`,
     `PORT_BORDER_OFFSET`, `HIERARCHY_HANDLING`, `NO_LAYOUT`, `INSIDE_SELF_LOOPS_ACTIVATE`/`_YO`, `COMMENT_BOX`,
     `HYPERNODE`, `PARTITIONING_ACTIVATE`, `CONSIDER_MODEL_ORDER_STRATEGY`/`_COMPONENTS`/`_NO_MODEL_ORDER`,
     `EDGE_LABELS_PLACEMENT`, `PORT_LABELS_PLACEMENT`, `NODE_LABELS_PLACEMENT`, `NODE_SIZE_CONSTRAINTS`/`_OPTIONS`/
     `_MINIMUM`/`_FIXED_GRAPH_SIZE`, `PADDING`, `JUNCTION_POINTS`, `EDGE_ROUTING`, the spacing ids, and the
     interactive position ids (`LAYERING_LAYER_ID`, `CROSSING_MINIMIZATION_POSITION_ID`);
   - per row: `new ElkGraphTransformer().importGraph(root)` → `expected.lgraph`; then `applyLayout(lgraph)` →
     `expected.elk` (ELK JSON export of the transferred graph, NS1 flags). An exception is a row, not a failure.
4. **Group `adapters`** (ids `adapters/<model>` and `adapters/sweep-<n>`): import as above, then the two layered call
   sequences verbatim: `NodeDimensionCalculation.calculateLabelAndNodeSizes(LGraphAdapters.adapt(g, true, true,
   n -> n.getType() == NodeType.NORMAL))` (`J/intermediate/LabelAndNodeSizeProcessor.java:68-72`) then
   `NodeDimensionCalculation.getNodeMarginCalculator(LGraphAdapters.adapt(g, false)).excludeEdgeHeadTailLabels()
   .process()` (`J/intermediate/InnermostNodeMarginCalculator.java:62-63`). The sweep covers `PORT_ALIGNMENT_DEFAULT`
   and the per-side alignments (BEGIN, CENTER, END, JUSTIFIED, DISTRIBUTED), `PORT_BORDER_OFFSET` on N/S and E/W
   ports, `NODE_SIZE_CONSTRAINTS`, `NODE_SIZE_OPTIONS`, port and node label placements. `expected` = per node
   (LGraph order) `{ path, size, margin, padding, ports: [{ path, pos, size }], labels: [{ path, pos, size }] }`.
5. **Group `metadata`** (one row, id `metadata/service`): a fresh `LayoutMetaDataService` with core, labels and
   layered registered, dumped in `MetaDataVectors`' service format (`options`, `categories`, `algorithms`, C4 values).
6. **LGraph dump format** (documented in the header; the TS consumer depends on it):
   `{ graphs: [graph] }`, graphs in pre-order (root first; a nested graph follows its parent node's path).
   `graph = { path, size, padding, offset, properties, layerlessNodes: [node], layers: [[node path]] }`;
   `node = { path, type, pos, size, margin, padding, properties, ports: [port], labels: [label], nested: path|null }`;
   `port = { path, side, pos, size, anchor, margin, properties, labels: [label], incoming: [edge path], outgoing:
   [edge path] }`; `edge = { path, source, target, bendPoints, labels, properties }` (listed under the source
   port, `edges` per graph in import order); `label = { path, text, pos, size, properties }`.
   `path` is positional (`g0/n3/p1`, `g0/e2`, `…/l0`). `properties` is an object keyed by property id, keys sorted;
   values use the C4 encoding; an LGraph element value is `{ "ref": path }`, an ElkGraph element `{ "elk": "<ELK
   JSON id>" }`, a collection of either an array; any other unencodable type `{ "class": "<binary name>" }`.
7. **Round trip and stability:** re-import every row's `input` and fail if the result differs from the directly
   built scenario's; build every row twice from scratch and fail on any byte difference. Keep the file ≤ 5 MB (trim
   sweep combinations, never model rows).
8. **`tools/vectors/layered-framework-vectors.sh`:** the `node-micro-layout-vectors.sh` structure, cache namespace
   `layered-framework`, model SHA-256 pinning, writes `test/golden/refs/java/layered-framework.json`, `shellcheck -x`
   clean. Run it twice: byte-identical, second run a cache hit.

## Write-set

`tools/vectors/{LayeredFrameworkVectors.java,layered-framework-vectors.sh}`, `test/golden/refs/java/layered-framework.json`.

## Read-set

- `tools/vectors/{NodeMicroLayoutVectors.java,node-micro-layout-vectors.sh,MetaDataVectors.java,vector-cache.sh}`
  (read only).
- `J/graph/transform/{ElkGraphTransformer,ElkGraphImporter}.java` (public API and the options the importer reads),
  `J/graph/{LGraph,LNode,LPort,LEdge,LLabel,Layer,LShape,LGraphElement}.java` (getters only),
  `J/graph/LGraphAdapters.java:63-135`, the two processor line ranges above.
- `test/golden/inputs/manifest.json`; `README.md` § Inputs; `decisions.md` L3, L4.

## Interface contract (output, consumed by T6, T7, T8, T9)

```json
{ "jdk": "...", "oracle": "<commit>", "rowCounts": { "transform": n, "adapters": n, "metadata": 1 },
  "rows": [ { "id": "transform/examples/ports/portConstraints", "group": "transform",
              "input": { /* ELK JSON */ }, "options": {},
              "expected": { "lgraph": { "graphs": [ ... ] }, "elk": { /* ELK JSON */ } } } ] }
```

Row ids are unique and stable; groups appear in the order `transform`, `adapters`, `metadata`.

## Acceptance criteria

- Given two consecutive runs, when compared, then the JSON is byte-identical and the second prints a cache hit.
- Given every graph row, when its `input` is re-imported, then the result equals the directly built scenario's
  (otherwise the run fails).
- Given the `adapters` group, when inspected, then at least one row each sets BEGIN, END and JUSTIFIED alignment and
  a non-zero N/S `PORT_BORDER_OFFSET`.
- Given `metadata/service`, when its layered options are compared with the `LayeredMetaDataProvider` and
  `LayeredOptions` calls in `metadata.json`, then ids, defaults, bounds and targets agree (else stop 6).
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed.

## Observability / Rollback

N/A — test tooling, no new observable operations. Reversible: revert the commit.
