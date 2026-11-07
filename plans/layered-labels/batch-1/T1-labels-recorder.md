<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredLabelsVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered label vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T1/`.

## Context

Mission 7f2 (README), G2, G3, G5, G6, G9. The label family runs for the first time, so its expectations are recorded **before**
the TS exists (AD-13, L4). `tools/vectors/LayeredPipelineVectors.java` (7f, landed, never edited) is the core to copy: read its
header first (row kinds, step ops, refusal rule, `-XX:hashCode=2`, `--sweep`/`--dump`), and `layered-pipeline-vectors.sh` for
the classpath and cache namespace. `.agent-notes/layered-pipeline.md` lists the plan-naming trap (four enum members share
`LayerSweepCrossingMinimizer`), `Map.of` nondeterminism and `plansFromRun`. Vendor inputs **outside** `inputs/realworld/`:
`LayeredFrameworkVectors.java:274` walks all of it (same note); 7f used `inputs/pipeline/`.

## Task

1. **`tools/vectors/LayeredLabelsVectors.java`**, JDK 21 single-file launcher (≤ 5,000 lines, stop 13): copy the core of
   `LayeredPipelineVectors.java` (origin cited in the header, B7); the allowed plan set adds the 12 arms of G1. **Refusal is
   decided on the whole plan** (G2): a row whose plan holds a member outside the ported sets exits 1 naming the row, unless it
   is in 7g's (self loops, wrapping, compaction) or 7h's (`INCLUDE_CHILDREN`, `HIERARCHICAL_NODE_RESIZER`) categories, where
   it is an accepted refusal counted per category on stderr. No row is pinned.
2. **Group `full`** (`full/<family>/<model>/<variant>`, F4 row shape: compact `expected.layout`, `expected.plans` captured in
   the real run). Families, measured and trimmed to fit 16 MiB (journal any trim): `labels` (every vendored label-bearing
   `.elkt` of `tests/layered`, `tickets/layered`, `examples` whose whole plan is ported, default options); `label-options` (edge
   label placement `CENTER`, `HEAD`, `TAIL`, each `EdgeLabelSideSelection`, each `centerEdgeLabelPlacementStrategy`,
   `edgeLabels.inline` × `RIGHT`, `LEFT`, `DOWN`, `UP`); `comments` (the four comment-box models plus two inline);
   `unzipping` (`layerUnzipping.strategy` ALTERNATING with each `layerSplit`, `resetOnLongEdges`, `minimizeEdgeLength`);
   `interactive` (G5, below); `issues` (the inputs of the suites allocated here, step 6); and `logged` rows: the logging variants,
   the DOT and JSON strings under `expected.logged` (G3).
3. **Interactive rows (G5).** Follow the Java's two-run protocol: lay out, apply `InteractiveLayeredGraphVisitor` to the root,
   lay out again; `layerChoiceConstraint` and `positionChoiceConstraint` decide the rows (every `LayerConstraint` arm of
   `J/InteractiveLayeredGraphVisitor.java:97-130`, direction RIGHT/LEFT/DOWN/UP at `:476-520`, chains `:898-956`).
4. **Group `models`** (`models/<model>/<target or root>/<stop>/<variant>`, 7f's row shape): stops at each of the 12 arms
   (`COMMENT_PREPROCESSOR`, `LABEL_DUMMY_INSERTER`, `ALTERNATING_LAYER_UNZIPPER`, both label-management arms,
   `COMMENT_NODE_MARGIN_CALCULATOR`, `END_LABEL_PREPROCESSOR`, `LABEL_DUMMY_SWITCHER`, `LABEL_SIDE_SELECTOR`,
   `COMMENT_POSTPROCESSOR`, `LABEL_DUMMY_REMOVER`, `END_LABEL_POSTPROCESSOR`) wherever a vendored level's plan has them; a stop
   not in the plan skips the row, counted on stderr. **Also** rows for the models of the 59 formerly pinned rows (57
   `layered-pipeline.json`, 2 `layered-phases.json`, `test/helpers/layered-pipeline-pinned-rows.ts`) so T11's unpinned replays can
   be cross-checked against fresh oracle runs.
5. **Group `scenarios`**, inline `elk`, full step list, at least two small graphs (3–10 nodes) per processor and per direction:
   edge labels in each `EdgeLabelPlacement` on short and long edges, reversed edges with labels, end labels at ports of each
   side, **FX2's scenario** (end labels on parallel edges sharing source port, target node and target port, `EndLabelSorter`
   via `J/intermediate/EndLabelSorter.java:160-177`), comment boxes attached to top and bottom (`J/intermediate/CommentPreprocessor.java:126-205`),
   nodes with port constraints `isSideFixed()`, unzipping with and without long edges. New step ops, each documented in the
   header: `labelManager <kind>` (G6: a deterministic manager, for example shrink a label to the target width and keep its
   height; kinds `none`, `shrink-width`), `interactive` (apply the visitor between two runs), `logging` (enable the monitor's
   logging and capture the logged graphs).
6. **Vendor** under `test/golden/inputs/labels/` byte-identical from `$ELK_MODELS_DIR` (pinned `ac5af2ba…`) every input a row or a
   suite needs unless already under `test/golden/inputs/**`: the models of the rows above; the suite inputs
   `tests/layered/{comment_boxes,labels_ordering,partitioning,preserve_order}/**` (3, 4, 4 and the 15 `preserve_order` models),
   `tickets/layered/{445,471,541,656,905}_*`; manifest rows the 7a way; a `LAYERED_LABELS_INPUTS` list in
   `test/golden/algorithm-refs.test.ts` extending its "nothing else" assertion and title (7f's `LAYERED_PIPELINE_INPUTS` pattern),
   every input pinned in the recorder's table.
7. **`tools/vectors/layered-labels-vectors.sh`:** 7f's script structure, namespace `layered-labels`, same `THIRD_PARTY` list and JVM
   flags, `shellcheck -x` clean, byte-identical on a second run. Diagnosis aids prefixed `LABELS_` (`LABELS_FILTER`,
   `LABELS_STATS`, `LABELS_CAP_MB`). The `--sweep`/`--dump` modes are T15's; keep the argument parser ready for them.

## Write-set

`tools/vectors/{LayeredLabelsVectors.java,layered-labels-vectors.sh}`, `test/golden/refs/java/layered-labels.json`,
`test/golden/inputs/labels/**`, `test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts`.

## Read-set

`tools/vectors/LayeredPipelineVectors.java` (header and core, to the `S` JSON builders), `layered-pipeline-vectors.sh`,
`tools/oracle/run.sh:95-125`, `test/helpers/layered-pipeline-pinned-rows.ts`, `J/GraphConfigurator.java:200-240` (label manager
arms), `J/intermediate/EndLabelSorter.java:57-100`, `J/intermediate/LabelManagementProcessor.java:54-100`,
`J/InteractiveLayeredGraphVisitor.java:84-130`, `decisions.md` G1, G2, G3, G5, G6, G9, F4, F16.

## Interface contract (consumed by T2, T12, T13, T15, T16)

Row fields as 7f (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`); `full` rows carry `expected.plans`
and, for logging variants, `expected.logged: { dot: string, json: string }`; `rowCounts: { full, models, scenarios, sites }`
(`sites` 0 until T16); ids unique and stable; the three new ops and the manager kinds documented in the header.

## Acceptance criteria

- Given two consecutive runs, when compared, then the ref is byte-identical, strict JSON, under 16 MiB, the second a cache hit.
- Given every row, when re-loaded and re-run in the JVM, then `expected` is reproduced.
- Given a plan naming a member outside the ported sets, when recorded, then the recorder exits 1 naming the row unless it is in
  an accepted 7g or 7h category.
- Given the landed `layered-pipeline.json` and `layered-phases.json`, when the recorder runs, then the expectations of the 59
  formerly pinned rows in them are unaffected (no landed ref byte changes; `git diff --name-status` shows only added files).
- Given the vendored inputs, when listed, then every input of the 12 suites and the 15 `preserve_order` models is present.
- Given the recorder, when measured, then it is under 5,000 lines.

## Observability / Rollback

Stderr counters per run: skipped stops, accepted refusals per category, bytes per family (`LABELS_STATS=1`), row timeouts (60 s
each). Reversible: revert the commit.
