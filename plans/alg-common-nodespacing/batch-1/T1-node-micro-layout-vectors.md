<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `NodeMicroLayoutVectors` (NS1–NS4, NS6)

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record node micro layout oracle vectors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `N` = `J/nodespacing`.

## Context
Mission 6b (README). The nodespacing package has no runnable Java tests: its 4 JUnit files need layered. The
source-built oracle is its behavioural spec (AC2, refined by NS1–NS6). T7 replays this file in TS.
- **Patterns:**
  - `tools/vectors/alg-common-vectors.sh` + `AlgCommonVectors.java`: the oracle classpath, `vector-cache.sh`, one
    `cache:` line, the hex doubles.
  - `tools/vectors/ElktParseVectors.java:160-230` and the classpath in `elkt-vectors.sh`: the `ElkGraphStandaloneSetup`
    `.elkt` loading and the `ElkGraphJson` export flags.
  - Read all of them first, plus `.agent-notes/vector-cache-and-key-line.md`.
- **Never edit `tools/vectors/vector-cache.sh`** or `JavaVectors.java`, and never touch a landed file in
  `test/golden/refs/java/`.
- The `vector-cache.sh` inputs digest covers only `tools/vectors/` and the curated folders, **not** `$ELK_MODELS_DIR`
  or `test/golden/inputs/`. Embed in the recorder a table of the expected SHA-256 for every model file it reads, and
  fail on any mismatch. The recorder source is part of the cache salt, so an input change then shows up as a recorder
  edit.
- Adding files under `tools/vectors/` makes the next `elkt`/`elkj`/`elkr` runs cold once (by design); do not run
  those.

## Task
1. **`tools/vectors/NodeMicroLayoutVectors.java`:** a JDK 21 single-file source launcher.
   - **Classpath:** the `alg.common`, `core`, `graph`, `graph.json` and `graph.text` jars plus the third-party bundles
     (`elkt-vectors.sh`'s list).
   - **Header:** the SPDX line plus a comment documenting every group, the NS4 label-size formula, the input and
     output fields, and the traversal order.
2. **Groups** (NS2; `decisions.md#ns2--scenario-groups`):
   - **`corpus`:** the 8 `.elkt` files under `$ELK_MODELS_DIR/tests/core/{node_size,label_placement}`, as written.
   - **`curated`:** `test/corpus/elkt-curated/**/*.elkt` (31) and `test/golden/inputs/tickets/core/*.elkt` (4), as
     written.
   - **`variants`:** `label_placement/port_labels/variants.elkt`, with `CoreOptions.PORT_SIDE` set on every port. This
     is the configuration of `PortLabelPlacementVariantsTest.configuratorFor` (deferred test, `:62-90`; the same option
     id as `LayeredOptions.PORT_SIDE`).
     - Record WEST and EAST, as the active providers do.
     - Also record NORTH and SOUTH, whose providers are commented out upstream. The oracle shows whatever Java does;
       name these rows `*-north`/`*-south`.
   - **`sweep`:** synthetic nodes built in Java from a seeded spec:
     - `NODE_SIZE_CONSTRAINTS` subsets × `NODE_SIZE_OPTIONS` subsets × `PORT_CONSTRAINTS` × `PORT_LABELS_PLACEMENT`
       sets × `NODE_LABELS_PLACEMENT` sets;
     - × node shapes: 0, 1 or 3 ports per side; inside and outside node labels; padding; minimum size;
       `PORT_LABELS_NEXT_TO_PORT_IF_POSSIBLE`; `TREAT_AS_GROUP`.
     - Pick a covering design (pairwise or similar), not the full product. Target a few hundred rows; the file must
       stay ≤ 5 MB.
     - Record combinations Java rejects as `{throws}` rows.
3. **Label sizes (NS4):**
   - `corpus` and `curated` rows are recorded twice, `raw` and `sized`. `sized` gives every 0×0 label with text the
     formula size; labels with an explicit size keep it.
   - `variants` and `sweep` rows are always `sized`.
4. **Hierarchy (NS3):** visit the graph in post-order and run `NodeMicroLayout.forGraph(node).execute()` on every node
   that has children. The root is a node with children.
5. **Round trip (NS1):** for each row:
   1. prepare the graph;
   2. export `input` = `ElkGraphJson.forGraph(prepared)` with the `ElktParseVectors.java:224-225` flags;
   3. re-import `input` and run step 4 on the re-imported graph; that result is `expected`;
   4. also run on the prepared original, and fail the row if the two results differ (stop 6).
6. **Recorded fields (NS6):**
   - every node: x, y, width, height, `MARGINS`, `PADDING`;
   - every port: x, y;
   - every label: x, y, width, height.
   - In model traversal order: node, its labels, its ports (each followed by its labels), its children recursively.
   - Each element carries its exported identifier; doubles are 16-hex raw bits.
   - Exceptions are recorded as `{throws: {class, message}}`, `class` being the simple name.
7. **Stability:** run every row twice inside one recording on fresh graphs, and fail on any difference.
8. **`tools/vectors/node-micro-layout-vectors.sh`:**
   - the `alg-common-vectors.sh` structure with cache namespace `node-micro-layout`;
   - writes `test/golden/refs/java/node-micro-layout.json`;
   - honours `ELK_MODELS_DIR` (default `<repo>/../../eclipse-elk/elk-models`, AD-15) and fails listing any missing
     model (Phase 4, failure mode 3);
   - passes `shellcheck -x`.
9. Run the script twice. The output must be byte-identical, and the second run a cache hit.

## Write-set
`tools/vectors/{NodeMicroLayoutVectors.java,node-micro-layout-vectors.sh}`, `test/golden/refs/java/node-micro-layout.json`.

## Read-set
- `J/NodeMicroLayout.java:32-64`; `N/**` (API surface only: entry points, the options read).
- `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.common.test/src/org/eclipse/elk/alg/common/nodespacing/PortLabelPlacementVariantsTest.java:56-90`.
- `tools/vectors/{alg-common-vectors.sh,AlgCommonVectors.java,elkt-vectors.sh,vector-cache.sh}`,
  `tools/vectors/ElktParseVectors.java:150-230` (read only).
- `decisions.md#ns1--inputs-stored-in-the-json` through `#ns6--recorded-fields-and-comparison`.

## Interface contracts (output, consumed by T7)
```json
{ "jdk": "...", "oracle": "<commit>", "labelSize": "<formula text>",
  "rowCounts": { "corpus": n, "curated": n, "variants": n, "sweep": n },
  "rows": [ { "id": "corpus/node_size/inside_port_labels#sized", "group": "corpus", "labels": "sized",
              "input": { /* ELK JSON graph */ },
              "expected": { "nodes":  [ { "id", "x", "y", "w", "h", "margins": [t,r,b,l], "padding": [t,r,b,l] } ],
                            "ports":  [ { "id", "x", "y" } ],
                            "labels": [ { "id", "x", "y", "w", "h" } ] } } ] }
```
- Numbers are hex strings.
- A throwing row has `"expected": { "throws": { "class": "UnsupportedConfigurationException", "message": "..." } }`.
- Row ids are unique and stable.

## Acceptance criteria
- Given two consecutive runs, when the outputs are compared, then `node-micro-layout.json` is byte-identical and the
  second run prints a cache hit.
- Given every row, when the recorder re-imports its own `input`, then the outputs equal those of the prepared original
  (otherwise the run fails).
- Given the file, when inspected, then all four groups are present, `rowCounts` matches, every `corpus`/`curated`
  model has a `raw` and a `sized` row, the file is ≤ 5 MB, and at least one `sweep` row expects a throw.
- Given a missing or changed model file, when the script runs cold, then it fails naming the file.
- Given the recording, when `git status` runs, then no landed file under `test/golden/refs/` changed.

## Observability / Rollback
N/A — test tooling only. Reversible: revert the commit.
