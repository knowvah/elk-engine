<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredPipelineVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered pipeline vectors from the oracle`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered`;
`JT` = `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered`.
Scratch: a private subdirectory `<scratchpad>/T1/`.

## Context

Mission 7f (README), F1, F3, F4, F8. The pipeline runs for the first time, so its expectations are recorded **before**
the TS exists (AD-13, L4). `tools/vectors/LayeredRoutingVectors.java` (7e, landed, never edited) drives the oracle's
whitebox API and interprets step rows. Read its header first (lines 1–135): row kinds, step ops, positional paths,
`expected`, the refusal rule, the presence rule, `-XX:hashCode=2`, the diagnosis aids; and its `.sh` for the classpath and
cache namespace. `.agent-notes/layered-edge-routing.md` lists plan shapes, the `MAX_HASH_ORDER_SOURCES` guard and the
removed-element encoding.

## Task

1. **F4 hash check, first.** Build `full` rows for the four goldens of `test/corpus/manifest.json` (`ptolemy-scrambler`,
   `-clockdrift-hierarchy`, `-afdx-multicast`, `-crossbar-switch`) under the recorder's flags and the seed properties of
   `tools/oracle/run.sh:102-111`. Compare each export against `test/golden/refs/elk/<id>.json`, exact number by number and
   by structure. Any difference: stop 19 with the first differing path; record nothing else. Journal the result.
2. **`tools/vectors/LayeredPipelineVectors.java`**, JDK 21 single-file launcher (≤ 5,000 lines): copy lines 1–1,857 of the
   7e recorder (through the ELK JSON builders `S` …), origin cited in the header. The allowed plan set adds this brief's
   arms (F1); `REFUSAL_CATEGORIES` and `ACCEPTED_REFUSALS` per F1. A plan member outside every set exits 1 naming the row.
3. **Group `full`** (`full/<family>/<model>/<variant>`), row shape in F4: compact `expected.layout` (the exported JSON),
   `expected.plans` (ordered member names per hierarchy level, `GraphTransformer` named by position). Families, measured
   and trimmed to fit 16 MiB (journal any trim):
   - `golden`: the four goldens, default options;
   - `model`: every vendored ptolemy, `.elkt` and ticket input of `test/golden/inputs/**` whose plans hold no refused member;
   - `routing-direction`: the three smallest flattened ptolemy models × {`ORTHOGONAL`, `POLYLINE`, `SPLINES`} ×
     {`RIGHT`, `LEFT`, `DOWN`, `UP`};
   - `components`: multi-component models with external ports, `separateConnectedComponents` {default, false},
     `considerModelOrder.components` every `ComponentOrderingStrategy` value;
   - `options`: `feedbackEdges`, `interactiveLayout`, `generatePositionAndLayerIds`, `hypernode` on a node, a `randomSeed`
     other than 1 (never 0, stop 6), `contentAlignment` and `nodeSize.minimum` with `nodeSize.constraints` so
     `resizeGraphNoReallyIMeanIt` takes each alignment arm, `padding` values (the S1 alignment/border-offset sweep);
   - `issues`: the `tickets/layered/**` inputs of the suites allocated here (step 7), per the Java configurators.
4. **Group `models`** (`models/<model>/<target or root>/<stop>/<variant>`), 7e's row shape: stops `DIRECTION_PREPROCESSOR`,
   `DIRECTION_POSTPROCESSOR`, `HIERARCHICAL_PORT_ORTHOGONAL_EDGE_ROUTER`, `END_LABEL_SORTER`, `HYPERNODE_PROCESSOR`,
   `CONSTRAINTS_POSTPROCESSOR` wherever a vendored level's plan has them, through `prepareLayoutTest`/`runLayoutTestStep`,
   `separateConnectedComponents=false` as the earlier rows. `--` a stop not in the plan skips the row, counted on stderr.
5. **Group `scenarios`**, inline `elk`, full step list, at least two small graphs (3–10 nodes) per processor and per
   direction: external ports on each side with each `PortConstraints` (`HierarchicalPortOrthogonalEdgeRouter`'s
   `restoreNorthSouthDummies`, `setNorthSouthDummyCoordinates`, `fixCoordinates`, `correctSlantedEdgeSegments`); a hypernode
   with bend points on both sides; direction LEFT/DOWN/UP with long edges, north/south ports, labels on nodes and ports,
   layer constraints, in-layer constraints (`GraphTransformer`'s mirror and transpose helpers). New step ops
   `componentsSplit` and `componentsCombine` (dump the component list, then the target) for `ComponentsProcessor`.
6. **Vendor** any input a family or suite needs from `$ELK_MODELS_DIR` byte-identical, manifest rows the 7a way (pinned
   `ac5af2ba…`), a `LAYERED_PIPELINE_INPUTS` list in `test/golden/algorithm-refs.test.ts` extending its "nothing else"
   assertion and title (`:86`, `:225-226` pattern), every input pinned in `MODEL_TABLE` (the `.sh` checks the same lines).
7. **`--plan-dump`** and **`plans/layered-pipeline/suite-allocation.md`** (F8): for each suite of
   [java-baseline.md](../java-baseline.md) and the four S1 suites, read its `@GraphResourceProvider`, `@GraphProvider` and
   `@Configurator`s, dump the plans, and write one row: suite, oracle runs, graphs source, owning mission (`7f`, `7f2`,
   `7g`, `7h`), the deciding plan member, target task (`T12a`, `T12b`, `T12c`). Hand-built graphs are allocated by reading
   the Java (mark them "from Java"). More than about a third of the planned suites leaving this brief is stop 21. Report the
   tally.
8. **`tools/vectors/layered-pipeline-vectors.sh`:** the 7e script's structure, namespace `layered-pipeline`, same
   `THIRD_PARTY` list and JVM flags, `shellcheck -x` clean, byte-identical on a second run. Diagnosis aids prefixed
   `PIPELINE_` (`PIPELINE_FILTER`, `PIPELINE_DISCOVER`, `PIPELINE_MARKERS`, `PIPELINE_CROSSCHECK`, `PIPELINE_STATS`,
   `PIPELINE_CAP_MB`).

## Write-set

`tools/vectors/{LayeredPipelineVectors.java,layered-pipeline-vectors.sh}`, `test/golden/refs/java/layered-pipeline.json`,
`test/golden/inputs/**` (additions), `test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts`,
`plans/layered-pipeline/suite-allocation.md`.

## Read-set

`tools/vectors/LayeredRoutingVectors.java:1-135,1682-1857`, `layered-routing-vectors.sh`, `tools/oracle/run.sh:95-125`,
`tools/oracle/harness/CaseRunner.java:50-95`, `test/corpus/manifest.json`, `J/ElkLayered.java` (test API and `doLayout`),
`J/GraphConfigurator.java:160-340`, `J/components/ComponentsProcessor.java`, `J/intermediate/{GraphTransformer,
HierarchicalPortOrthogonalEdgeRouter,HypernodesProcessor,ConstraintsPostprocessor,EndLabelSorter}.java` (headers and
`process`), `JT/**` per suite (providers and configurators only), `decisions.md` F1, F3, F4, F8, F16.

## Architecture decisions

F1 (scope and refusals), F3 (recorder and caps), F4 (full rows, hash check), F8 (allocation), F16, AD-10 (`-XX:hashCode=2`),
B7 (single-file launcher).

## Interface contract (output, consumed by T3, T9, T12, T15)

Row fields as 7e (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`); `full` rows per F4; `models`,
`scenarios` and `sites` carry 7e's `expected` with `geometry`; `rowCounts: { full, models, scenarios, sites }`; ids unique
and stable; new step ops documented in the header. `suite-allocation.md` columns as in step 7.

## Acceptance criteria

- Given the four goldens, when compared with `refs/elk`, then each is equal; the journal says so (else stop 19).
- Given two consecutive runs, when compared, then the ref is byte-identical, strict JSON, under 16 MiB, the second a cache hit.
- Given every row, when re-loaded and re-run in the JVM, then `expected` is reproduced.
- Given a plan naming a member outside the ported sets, when recorded, then the recorder exits 1 naming the row unless the
  row is in `ACCEPTED_REFUSALS` under an F1 category.
- Given `suite-allocation.md`, when counted, then every suite of `java-baseline.md` and the four S1 suites has one row.
- Given `git status`, when inspected, then no landed file under `test/golden/refs/` changed; the recorder is under 5,000 lines.

## Observability / Rollback

Stderr counters per run: skipped levels, skipped stops, accepted refusals per category, bytes per family
(`PIPELINE_STATS=1`), row timeouts (60 s each). Reversible: revert the commit.
