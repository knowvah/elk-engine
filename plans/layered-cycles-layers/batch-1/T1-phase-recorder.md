<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredPhaseVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered phase vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.

## Context

Mission 7b (README). The cycle breakers, layerers and the ten intermediate processors need oracle expectations recorded
**before** the TS exists (AD-13, L4). Nothing in TS runs the layered pipeline until 7f, so this recorder drives the
oracle's `ElkLayered` whitebox API for whole-model rows (B1) and a small step interpreter for hand-built scenarios,
and writes a compact phase dump (B2). The TS replay (T3, T8) imports the same input with the 7a transform, mirrors the
configurator's property normalisation (B4) and runs the recorded processor names.

- **Patterns, read first:** `tools/vectors/LayeredSiteVectors.java` (header layout, classpath incl. Xtext standalone
  for `.elkt`, `importGraph(target)`, the `Dump` class and C4 encoding, `strictNumbers`, re-import self-check,
  twice-run stability, one `cache:` line) and `tools/vectors/layered-site-vectors.sh`. Copy the dump/C4 core into the
  new file with a comment naming its origin (B7); do not edit the 7a files or run their scripts.
- **Never edit** `tools/vectors/vector-cache.sh`, `JavaVectors.java`, any landed `test/golden/refs/java/*`.

## Task

1. **`tools/vectors/LayeredPhaseVectors.java`:** JDK 21 single-file launcher. Header: SPDX, the three row kinds, the
   step op list, the phase-dump format, the refusal rule (B4), the checks. Register core + labels + layered metadata
   before loading any model. Every root gets `LayeredOptions.SEPARATE_CONNECTED_COMPONENTS=false` (B3) and the row's
   `options`; `RANDOM_SEED` stays the default 1 unless the row sets it (never 0).
2. **Row format** (interface contract below). `input` is `{ path, sha256 }` for a vendored file whose prepared graph is
   the file plus root `options`; otherwise `{ elk }` with the prepared graph exported as 7a does (`omitLayout(false)`,
   `omitZeroDimension(false)`, `strictNumbers`). `target` is the ELK id of the node whose children are imported, or
   `null` for the root (7a's `importGraph(targetId)`). `options` is a C4 map applied to the root (and, for interactive
   rows, the positions are already in `elk`).
3. **Group `models`** (`models/<model id>/<target or root>/<phase>/<strategy>[/<variant>]`), B1 and B5:
   - the 9 vendored models of `test/golden/inputs/manifest.json`, every hierarchy level (a level whose children are
     all leaves counts; a level with no edges is skipped and journaled);
   - P1 rows: the 9 `CycleBreakingStrategy` values, dump after `runLayoutTestUntil(<breaker class>, true)`;
     `INTERACTIVE` rows reproduce `BasicCycleBreakerTest.interactiveConfigurator` (`JT/p1cycles/BasicCycleBreakerTest.java:107-130`:
     `Random(0)`, `nextInt(100)` for x then y of every node with x == 0 / y == 0, pre-order queue);
   - P2 rows: the 9 `LayeringStrategy` values with the default breaker, dump after the layerer; `INTERACTIVE` as
     `BasicLayerAssignmentTest.interactiveConfigurator` (`:105-128`, `nextInt(10_000)`);
   - variants on the three smallest flattened models and every `.elkt` below: `LAYERING_NODE_PROMOTION_STRATEGY` ×
     the 9 non-NONE values with `LONGEST_PATH` (dump after `NodePromotion`), `HIGH_DEGREE_NODES_TREATMENT=true`
     (dump after `HighDegreeNodeLayeringProcessor`), `BF_MODEL_ORDER`/`DF_MODEL_ORDER` with
     `CYCLE_BREAKING_STRATEGY=MODEL_ORDER` (`BasicModelOrderTest`), `MODEL_ORDER` with
     `CONSIDER_MODEL_ORDER_STRATEGY` PREFER_EDGES and NODES_AND_EDGES (`BasicCycleBreakerTest:85-99`);
   - the 12 vendored `.elkt` (B5): the 6 `tests/layered/layer_constraints` and `600_*` under every layerer, dump after
     `LayerConstraintPostprocessor`; the 4 `tests/layered/partitioning` and `656_*`, dump after
     `PartitionPostprocessor`; `tests/layered/**` models that `EdgeAndLayerConstraintEdgeReverserTest` reads are
     covered by the same files where they set layer constraints;
   - `prefix`: the names of every processor `getLayoutTestConfiguration(state)` ran up to and including the phase,
     mapped instance class → `IntermediateProcessorStrategy` member, or `P1_CYCLE_BREAKING/<STRATEGY>` /
     `P2_LAYERING/<STRATEGY>` for phases. **Refuse** (exit 1, naming the row) a prefix naming anything outside the
     7b set (B9 table, 7b row); a 7b class with no remaining row is stop 5.
4. **Group `scenarios`** (`scenarios/<class>/<name>`), step rows with inline `elk`:
   - at least one small graph (2–8 nodes) per cycle breaker whose steps are `importGraph`, `normalise`,
     `runPhase(P1_CYCLE_BREAKING, <strategy>)`, `dump`, with a cycle, a self loop, parallel edges, and for the
     model-order breakers `MODEL_ORDER` set by the importer; a tie case for `GREEDY` (two nodes with equal outflow);
   - per layerer: acyclic inputs with no constraints, steps `importGraph`, `normalise`, `runPhase(P2_LAYERING, …)`,
     `dump`; a long chain (≥ 12 nodes) for the explicit-stack twins (B8);
   - per processor: the pre-state built by steps, not phases: `layers(spec)` assigns nodes to layers in order
     (X4 pattern: `new Layer(g)`, `g.getLayers().add`, `node.setLayer`); `setProperty(path, id, value)` sets
     `LAYERING_LAYER_CONSTRAINT`, `IN_LAYER_CONSTRAINT`, `EDGE_CONSTRAINT`/`PRIORITY_DIRECTION`, `PARTITIONING_PARTITION`,
     `LAYERING_NODE_PROMOTION_STRATEGY`, `HIGH_DEGREE_NODES_*`; then `runProcessor(<MEMBER>)`, `dump`;
     `ReversedEdgeRestorer` rows reverse an edge by step (`reverseEdge(path)`) first;
   - the 7 graphs of `ModelOrderLayerAssignmentTest` (`JT/p2layers/ModelOrderLayerAssignmentTest.java:47-450`), the 3 of
     `Issue871Test` (`JT/issues/Issue871Test.java:49-178`) and `PartitionTest`'s models, each as a `models`-style
     pipeline row through P2 and, where set, `NodePromotion`/`PartitionPostprocessor`;
   - every step row with fewer than 10 nodes also stores `expected.dump` (full 7a `dumpLGraph`).
5. **Phase dump** (B2): `{ layers: [[path]], layerless: [path], hidden: [path], edges: [{ path, src, tgt, reversed }],
   changed: [{ path, props }] }`. Paths are 7a positional paths; a port or edge created by a processor is
   `new/p<k>` / `new/e<k>` in creation order. `changed` compares each element's C4 property map with the post-import
   dump of the same graph (removed → `null`; ids `processors`, `random`, `spacings` ignored).
6. **Checks:** re-import every `elk`/`path` input and re-run the row (steps or pipeline) from scratch; fail on any
   difference; build the whole file twice and fail on a byte difference; strict-parse the output. Keep ≤ 5 MB.
7. **`tools/vectors/layered-phase-vectors.sh`:** the `layered-site-vectors.sh` structure (Xtext classpath for `.elkt`),
   cache namespace `layered-phases`, SHA-256 pinning of every vendored input, writes
   `test/golden/refs/java/layered-phases.json`, `shellcheck -x` clean. Run it twice: byte-identical, second a cache hit.
8. **Vendor** the 12 `.elkt` from `$ELK_MODELS_DIR` (pinned commit in `test/corpus/manifest.json`) to
   `test/golden/inputs/tests/layered/{layer_constraints,partitioning}/` and `test/golden/inputs/tickets/layered/`,
   each with a manifest row (`id`, `path`, `algorithm`, `variant`, `note`), the 7a `vendor-elkt-curated.sh` way.

## Write-set

`tools/vectors/{LayeredPhaseVectors.java,layered-phase-vectors.sh}`, `test/golden/refs/java/layered-phases.json`,
`test/golden/inputs/tests/layered/**`, `test/golden/inputs/tickets/layered/*.elkt`, `test/golden/inputs/manifest.json`.

## Read-set

- `tools/vectors/{LayeredSiteVectors.java,layered-site-vectors.sh}` (read only; the dump/C4 core to copy).
- `J/ElkLayered.java:375-531` (whitebox API), `J/GraphConfigurator.java:96-165,195-340`, `J/p1cycles/*.java`,
  `J/p2layers/*.java` (`getLayoutProcessorConfiguration` only), `J/intermediate/IntermediateProcessorStrategy.java`.
- `JT/p1cycles/BasicCycleBreakerTest.java`, `JT/p2layers/{BasicLayerAssignmentTest,BasicModelOrderTest,ModelOrderLayerAssignmentTest}.java`,
  `JT/issues/Issue871Test.java`, `JT/intermediate/{PartitionTest,LayerConstraintProcessorTest,NodePromotionTest}.java`
  (model lists and configurators).
- `test/golden/inputs/manifest.json`, `test/corpus/manifest.json`, `README.md` § Inputs, `decisions.md` B1–B5, B9.

## Interface contract (output, consumed by T3–T12)

```json
{ "jdk": "...", "oracle": "<commit>", "rowCounts": { "models": n, "scenarios": n, "sites": 0 },
  "rows": [ { "id": "models/ptolemy-scrambler/root/P1/GREEDY", "group": "models",
              "input": { "path": "test/golden/inputs/realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json", "sha256": "…" },
              "target": null, "options": { "org.eclipse.elk.layered.cycleBreaking.strategy": "GREEDY", "…": "…" },
              "steps": null,
              "prefix": ["EDGE_AND_LAYER_CONSTRAINT_EDGE_REVERSER", "P1_CYCLE_BREAKING/GREEDY"],
              "expected": { "layers": [], "layerless": ["g0/n0", "…"], "hidden": [],
                            "edges": [{ "path": "g0/e0", "src": "g0/n0/p1", "tgt": "g0/n3/p0", "reversed": false }],
                            "changed": [{ "path": "g0/e4", "props": { "org.eclipse.elk.layered.reversed": true } }] } },
            { "id": "scenarios/GreedyCycleBreaker/tie", "group": "scenarios", "input": { "elk": "{…}" },
              "target": null, "options": {}, "steps": [["importGraph", null], ["normalise"],
              ["runPhase", "P1_CYCLE_BREAKING", "GREEDY"], ["dump"]], "prefix": null,
              "expected": { "…": "…", "dump": { "graphs": ["…"] } } } ] }
```

Row ids are unique and stable; groups appear in the order `models`, `scenarios`, `sites`. Doubles are 16-hex raw
bits; enums and ids are strings; the C4 encoding is the 7a one.

## Acceptance criteria

- Given two consecutive runs, when compared, then the JSON is byte-identical, strict JSON, under 5 MB, and the second
  prints a cache hit.
- Given a `models` row whose prefix names a processor outside the 7b set, when recorded, then the recorder exits 1
  naming the row (and the brief's option list is adjusted or stop 5 is raised).
- Given every row, when its input is re-loaded and its steps or pipeline re-run in Java, then `expected` is reproduced.
- Given the `scenarios` group, when counted, then every one of the 30 7b classes has at least one row whose steps run
  it and no class from another batch-2 task.
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed and the 12 vendored
  `.elkt` match the elk-models files at the pinned commit byte for byte.

## Observability / Rollback

N/A — test tooling, no new observable operations. Reversible: revert the commit.
