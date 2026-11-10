<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredLoopsVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered loop, wrapping and compaction vectors`
`J`, `JT` as in decisions.md. Scratch: a private subdirectory `$TMPDIR/7g/T1/`.

## Context

Mission 7g, W3, W4, W7. Self loops, wrapping and compaction run for the first time, so their expectations are recorded **before**
the TS exists (AD-13, L4). `tools/vectors/LayeredLabelsVectors.java` (7f2, landed, never edited) is the core to copy: read its
header first (row kinds, step ops, whole-plan refusal, `REFUSAL_CATEGORIES`, `-XX:hashCode=2`, `--sweep`/`--dump`, `LABELS_*`
aids), and `layered-labels-vectors.sh` for the classpath and cache namespace. `.agent-notes/layered-labels.md` lists the four dump
rules a new recorder checks first (detached baseline ports, removed elements as `{class}`, `.elkt` option proxies, registered
providers) and the launcher's masked short-stack exceptions; `.agent-notes/layered-pipeline.md` the plan-naming trap and
`plansFromRun`. Vendor inputs **outside** `inputs/realworld/`.

## Task

1. **`tools/vectors/LayeredLoopsVectors.java`**, JDK 21 single-file launcher (≤ 5,000 lines, stop 13): copy the core of
   `LayeredLabelsVectors.java` (origin cited in the header, B7). The allowed set adds the 9 arms (`SELF_LOOP_PREPROCESSOR`,
   `SELF_LOOP_PORT_RESTORER`, `SELF_LOOP_ROUTER`, `SELF_LOOP_POSTPROCESSOR`, `BREAKING_POINT_INSERTER`, `BREAKING_POINT_PROCESSOR`,
   `BREAKING_POINT_REMOVER`, `SINGLE_EDGE_GRAPH_WRAPPER`, `HORIZONTAL_COMPACTOR`) and lifts the `COMPACTION_CONNECTED_COMPONENTS`
   option refusal. Only 7h's categories (`INCLUDE_CHILDREN`, `HIERARCHICAL_NODE_RESIZER`) are accepted refusals, counted on
   stderr; anything else exits 1 naming the row.
2. **Group `full`** (`full/<family>/<model>/<variant>`, F4 row shape, `expected.plans` captured in the real run). Families,
   measured and trimmed to fit 16 MiB (journal any trim):
   - `self-loops`: `tests/layered/self_loops/*` (6), `tests/layered/compaction_oned/selfloop/*` (3), the self-loop tickets
     (433, 444, 463, 870 and any other self-loop `tickets/layered` model whose plan is not 7h), the vendored ptolemy self-loop model;
     × `RIGHT`, `LEFT`, `DOWN`, `UP`; × `edgeRouting` `ORTHOGONAL`, `POLYLINE`, `SPLINES`; plus `selfLoopDistribution` and
     `selfLoopOrdering` each value (`SelfLoopPlacementStrategy` has no option at the pin) on `hyperLoops`, `label`, `fixedSide`.
   - `wrapping`: `wrapping.strategy` `SINGLE_EDGE` and `MULTI_EDGE` × `cutting.strategy` `ARD`, `MSD`, `MANUAL` (with
     `cutting.cuts`) × `validify.strategy` each value, plus `multiEdge.improveCuts`, `improveWrappedEdges`, `distancePenalty`,
     `correctionFactor` variants, on a ptolemy subset and the long chains of the vendored inputs (no corpus model sets wrapping).
   - `compaction`: `compaction.postCompaction.strategy` each non-`NONE` value × `constraints` `SCANLINE`, `QUADRATIC` ×
     `ORTHOGONAL`, `POLYLINE`, `SPLINES` over `tests/layered/compaction_oned/**` (11); **W7**: `SPLINES` with compaction over
     `tests/layered/splines/hyperedges/*` and `hyperedge_merging/*`.
   - `components-compaction`: `compaction.connectedComponents=true` over `tests/layered/connected_components/flat01`,
     `all_four_port_sides` (compound ones only if their plans are not 7h), external ports on each side, the three placers
     (`SimpleRowGraphPlacer`, `ComponentGroupGraphPlacer`, `ComponentGroupModelOrderGraphPlacer`).
   - `converted` (W4): `full/converted/labels/ticket-213_componentsCompaction` (the refused row of `layered-labels.json`, same
     input and options).
   - `issues`: the inputs of `Issue433/444/463/870Test`.
3. **Group `models`** (`models/<model>/<target or root>/<stop>/<variant>`): stops at each of the 9 arms wherever a vendored
   level's plan has them; a stop not in the plan skips the row, counted on stderr. **Also** fresh rows for the model of the
   pinned row (`ptolemy-sinewaveoptimization` N1, every stop of its plan) so T16 can cross-check the unpinned replay.
4. **Group `scenarios`**, inline `elk`, full step list, small graphs (3–10 nodes) per class and per direction: self loops on
   each port side pair (E–E, W–W, N–N, S–S, N–S, E–W), hyper loops over 3+ ports, self loops with labels, fixed-side and
   free ports, loops on north/south ports reaching `NorthSouthPortPostprocessor.processSelfLoop`; long chains that wrap under
   both strategies; compaction with comment boxes, north/south ports, hierarchical ports and splines; components compaction
   with external edges. New step op `processor <SimpleClassName>` (W3) runs one processor outside the enum: rows for
   `DummySelfLoopProcessor` (`J/intermediate/DummySelfLoopProcessor.java`, every branch of `process`) on graphs with
   north/south self loops, run before `NORTH_SOUTH_PORT_PREPROCESSOR` as its Javadoc says.
5. **Vendor** under `test/golden/inputs/loops/` byte-identical from `$ELK_MODELS_DIR` (pinned `ac5af2ba…`) every input a row or a
   suite needs unless already under `test/golden/inputs/**`; manifest rows the 7a way; a `LAYERED_LOOPS_INPUTS` list in
   `test/golden/algorithm-refs.test.ts` extending its "nothing else" assertion and title (7f2's `LAYERED_LABELS_INPUTS` pattern).
6. **`tools/vectors/layered-loops-vectors.sh`:** 7f2's script structure, namespace `layered-loops`, same `THIRD_PARTY` list and JVM
   flags, `shellcheck -x` clean, byte-identical on a second run. Diagnosis aids prefixed `LOOPS_` (`LOOPS_FILTER`,
   `LOOPS_STATS`, `LOOPS_DISCOVER`, `LOOPS_CAP_MB`). `--sweep`/`--dump` are T19's; keep the argument parser ready for them.

## Write-set

`tools/vectors/{LayeredLoopsVectors.java,layered-loops-vectors.sh}`, `test/golden/refs/java/layered-loops.json`,
`test/golden/inputs/loops/**`, `test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts`.

## Read-set

`tools/vectors/LayeredLabelsVectors.java` (header, `REFUSAL_CATEGORIES` `:212-220`, `refuseOptions` `:2166-2190`, the run core),
`layered-labels-vectors.sh`, `test/helpers/layered-pipeline-pinned-rows.ts`, `J/GraphConfigurator.java:270-330` (compaction and
wrapping arms), `J/intermediate/DummySelfLoopProcessor.java`, `J/Layered.melk:660-680,767-800,838-975` (option values; read with
`grep -n`), `decisions.md` W1, W3, W4, W7, F4, F16.

## Interface contract (consumed by T2, T16, T17, T19, T20)

Row fields as 7f2 (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`); `full` rows carry
`expected.plans`; `rowCounts: { full, models, scenarios, sites }` (`sites` 0 until T20); ids unique and stable; the `processor`
op documented in the header with its argument (the simple class name) and where it runs in the step list.

## Acceptance criteria

- Given two consecutive runs, when compared, then the ref is byte-identical, strict JSON, under 16 MiB, the second a cache hit.
- Given every row, when re-loaded and re-run in the JVM, then `expected` is reproduced.
- Given a plan naming a member outside the ported sets, when recorded, then the recorder exits 1 naming the row unless it is in
  7h's categories.
- Given the landed refs, when the recorder runs, then `git diff --name-status` shows only added files plus `manifest.json` and
  `algorithm-refs.test.ts`.
- Given the vendored inputs, when listed, then every input of T17's four issue suites is present; the recorder is under
  5,000 lines.

## Observability / Rollback

Stderr counters per run: skipped stops, accepted refusals per category, bytes per family (`LOOPS_STATS=1`), row timeouts (60 s
each). Reversible: revert the commit.
