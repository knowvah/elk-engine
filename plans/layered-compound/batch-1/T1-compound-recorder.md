<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Oracle recorder `LayeredCompoundVectors`

**Agent:** java-architect (sonnet) · **Commit:** `test(T1): record layered compound graph vectors`
`J`, `JT`, `JG` are as in decisions.md. Scratch: a private subdirectory `$TMPDIR/7h/T1/`.

## Context

Mission 7h, decisions H2, H5 (parser ready only), H8 and H13. Hierarchical layout runs in TS for the first time, so its
expectations are recorded **before** the TS exists (AD-13, L4). The core to copy is `tools/vectors/LayeredLoopsVectors.java` (7g,
landed, never edited). Read its header first: row kinds, step ops, whole-plan refusal, `REFUSAL_CATEGORIES` (`:279-283`),
`refuseOptions` (`:2212-2223`), `-XX:hashCode=2`, `--sweep`/`--dump`, and the `LOOPS_*` aids. Then read
`layered-loops-vectors.sh` for the classpath and the cache namespace. `.agent-notes/layered-labels.md` lists the four dump rules a
new recorder checks first, and the masked short-stack exceptions. `.agent-notes/layered-pipeline.md` covers `plansFromRun` and the
rule to vendor **outside** `inputs/realworld/`.

## Task

1. **`tools/vectors/LayeredCompoundVectors.java`**, a JDK 21 single-file launcher (≤ 5,000 lines, stop 13): copy the core and
   cite the origin (B7). The allowed set is every enum member. Remove the `INCLUDE_CHILDREN` option refusal and the 7h
   refusal categories, leaving the accepted refusals empty. A plan member outside the ported sets exits 1 naming the row. A model
   whose hierarchy names an algorithm the classpath does not register (`elk.stress`) is skipped and counted on stderr
   (`out of scope (algorithm): n`), never recorded (H13, stop 5).
2. **Group `full`** (`full/<family>/<model>/<variant>`, F4 row shape, `expected.plans` captured in the real run per level path,
   nested levels included). Measure each family and trim to fit 16 MiB, journaling any trim:
   - `issues`: the inputs of the 9 suites of `java-baseline.md` except H13's three. Use `Issue628Test`'s four `@Configurator`
     variants on `628_hierarchyAwareLayoutProcessor`, and the `JG/EdgeCoordsTest.xtend` graphs (inline `elk`, verbatim).
   - `include-children`: every `.elkt`/`.json` of `tests/layered`, `tickets/layered` and `examples` that sets
     `INCLUDE_CHILDREN` anywhere (23 `.elkt` at the pin before the stress filter) × `default` and `RIGHT`/`LEFT`/`DOWN`/`UP` ×
     `edgeRouting` `ORTHOGONAL`/`POLYLINE`/`SPLINES` (trim the routing axis first if size requires).
   - `ptolemy-include`: the four `test/golden/inputs/pipeline` models plus at least six more `realworld/ptolemy/hierarchical`
     models with cross-hierarchy edges, with `hierarchyHandling=INCLUDE_CHILDREN` at the root × 4 directions (the direction ×
     mode cells H4's goldens leave out).
   - `hierarchy-aware`: `crossingMinimization.hierarchicalSweepiness` (−1, 0, 0.1, 1), `greedySwitchHierarchical.type` each value,
     a child with a different `crossingMinimization.strategy` (the `reviewAndCorrectHierarchicalProcessors` throw: an oracle throw
     row is not recorded. Count it, and give the case to T14's `sites`), and `INCLUDE_CHILDREN` set below the root only (mixed
     handling).
   - `resizer` (`HierarchicalNodeResizingProcessor`): compound nodes with `nodeSize.constraints` each relevant value, minimum
     size, padding, `nodeSize.fixedGraphSize`, port constraints `FREE`/`FIXED_SIDE`/`FIXED_ORDER`/`FIXED_POS` on the compound
     node, and empty compound nodes.
3. **Group `models`** (H2), id `models/<model>/<n>-<level path>-<SimpleClassName>/<variant>`: the hierarchical stops of a
   `doCompoundLayout` run captured with `ElkLayered.setTestController`. The stops come after `CompoundGraphPreprocessor`, after each
   hierarchy-aware processor on the root, after `HierarchicalNodeResizingProcessor` on each nested graph, and after
   `CompoundGraphPostprocessor`. `expected` = the whole tree dump at that moment: 7f's `LGraph` dump plus `nestedGraph` per node,
   the level path per graph, and the `CROSS_HIERARCHY_MAP` property as a list of `{ origEdge, segments: [{ edge, graph, type }] }`
   in the comparator's sorted order. Record this on a handful of small vendored models (3–6) so T5–T7 can test their sections
   against single stops.
4. **Group `scenarios`**, inline `elk`, small graphs (3–12 nodes) per direction, run through `doCompoundLayout`. Cover:
   cross-hierarchy edges parent→child, child→parent, between children of sibling compounds, and 3-level deep, short and long;
   external ports with port constraints `FREE`, `FIXED_SIDE`, `FIXED_ORDER`; north/south hierarchical ports (the routing
   strategies of H8 (3)); inside self loops (`insideSelfLoops.activate`, `processInsideSelfLoops`); labels on hierarchical edges
   (`moveLabelsAndRemoveOriginalEdges`, `copyLabelsBack`); junction points on orthogonal hyperedges crossing a boundary
   (`clearJunctionPoints`, `copyJunctionPoints`); `POLYLINE` and `SPLINES` with cross-hierarchy edges; self loops on compound
   nodes (H8 (3), `SelfLoopPreProcessor.java:55,90,100`); comments and edge labels inside compound nodes (H8 (2) items).
5. **Vendor** every input a row or a suite needs under `test/golden/inputs/compound/`, byte-identical from `$ELK_MODELS_DIR`
   (pinned `ac5af2ba…`), unless it is already under `test/golden/inputs/**`. Add manifest rows the 7a way, and a
   `LAYERED_COMPOUND_INPUTS` list in `test/golden/algorithm-refs.test.ts` that extends its "nothing else" assertion and title
   (the `LAYERED_LOOPS_INPUTS` pattern, `:434-485`). Do not vendor H13's three stress inputs.
6. **`tools/vectors/layered-compound-vectors.sh`:** 7g's script structure, namespace `layered-compound`, the same `THIRD_PARTY`
   list and JVM flags, `shellcheck -x` clean, byte-identical on a second run. Prefix diagnosis aids with `COMPOUND_`. `--sweep`
   and `--dump` belong to T13; keep the argument parser ready for them.

## Write-set

`tools/vectors/{LayeredCompoundVectors.java,layered-compound-vectors.sh}`, `test/golden/refs/java/layered-compound.json`,
`test/golden/inputs/compound/**`, `test/golden/inputs/manifest.json`, `test/golden/algorithm-refs.test.ts`.

## Read-set

`tools/vectors/LayeredLoopsVectors.java` (header, `:279-283`, `:1792`, `:2212-2223`, the run core), `layered-loops-vectors.sh`,
`J/ElkLayered.java:179-298,534-565`, `J/compound/CompoundGraphPreprocessor.java:100-130`, `J/options/InternalProperties.java:342`,
`J/intermediate/HierarchicalNodeResizingProcessor.java`, `J/GraphConfigurator.java:70-80`, `JT/issues/Issue{316,455,552,596,628,701,734}Test.java`,
`JG/EdgeCoordsTest.xtend:30-130` (graph shape), `decisions.md` H2, H8, H13, F4, F16.

## Interface contract (consumed by T2, T4–T9, T11, T13, T14)

The row fields are as 7g (`id`, `group`, `input`, `target`, `options`, `steps`, `prefix`, `expected`). `full` rows carry
`expected.plans` keyed by level path. `models` rows carry `expected.stop = { index, levelPath, processor }` and `expected.tree`
(the whole-tree dump, documented field by field in the header). `rowCounts` is `{ full, models, scenarios, sites }`, with `sites` 0 until T14. Ids are unique and stable.

## Acceptance criteria

- Given two consecutive runs, when compared, then the ref is byte-identical, strict JSON and under 16 MiB, and the second run is
  a cache hit.
- Given every row, when re-loaded and re-run in the JVM, then `expected` is reproduced.
- Given a plan naming a member outside the ported sets, when recorded, then the recorder exits 1 naming the row. Given a stress
  child, the model is counted as out of scope, not recorded.
- Given the landed refs, when the recorder runs, then `git diff --name-status` shows only added files plus `manifest.json` and
  `algorithm-refs.test.ts`.
- Given the vendored inputs, when listed, then every input of T11's suites except H13's three is present, and the recorder is
  under 5,000 lines.

## Observability / Rollback

Stderr counters per run: skipped stops, out-of-scope models, oracle throws, bytes per family (`COMPOUND_STATS=1`), and row
timeouts (60 s each). Reversible: revert the commit.
