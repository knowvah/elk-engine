<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations: layered-arm-search (issue #59, 2026-11-21)

Brief: `plans/layered-arm-search/README.md`.

## Observation: compound "sites" rows are full layouts, order "sites" rows are constructed state

- **Context**: deciding what "reached by site scenario only" (issue #59, outcome 2) means per recorder.
- **Finding**: a `SITE_ROWS` entry of `LayeredCompoundVectors.java` (`:2886-2906`, kind `run`) lays out a whole inline
  ELK JSON graph. That includes `sites/OrthogonalEdgeRouter/extPortSelfLoop/*`, which the issue calls a site scenario.
  An order `sites/` row can build state with `layers`, `setProperty` and `reverseEdge` steps
  (`LayeredOrderVectors.java:60-80`).
- **Impact**: the brief's D3 counts a compound `run` row as outcome 1 (reached through layout), and only an order row
  with constructed state as outcome 2.
- **Confidence**: High

## Observation: the order replay test titles end in ": replays the recorded result"

- **Context**: reusing `tools/vectors/compound-site-arms.mjs` for order rows.
- **Finding**: the tool runs `vitest -t "<id>$"`, which matches the compound sites test titles (the bare id). The order
  test titles are `<id>: replays the recorded result` (`LayeredOrderVectors.test.ts:46`). Row ids contain `/` and may
  contain regex metacharacters.
- **Impact**: the tool needs a title-suffix flag and escaping of the id (D6, T7).
- **Confidence**: High

## Observation: ModelOrderBarycenterHeuristic keeps its transitive maps only within one insertion sort

- **Context**: arms 19-23 (`ModelOrderBarycenterHeuristic.ts:77`, `:179-194`).
- **Finding**: the class is created only with `crossingMinimization.forceNodeModelOrder`
  (`GraphInfoHolder.java:100-111`). With that flag the layer is sorted by the class's own linear insertion sort
  (`ModelOrderBarycenterHeuristic.java:129,239-252`), which clears both maps at its end. Both recording sites
  (`:96-99`, `:185-194`) record "bigger" for the element that sorts first: the inverse of the name, but consistently
  inverse. So the recorded relations always agree with the order of the sorted prefix.
- **Impact**: a proof sketch for outcome 3, to be verified in T4. If it holds, the arms are dead on the JVM and in the
  port alike, because the port's sort is the same hand-written insertion sort
  (`ModelOrderBarycenterHeuristicInsertionSort.ts`).
- **Confidence**: Medium (a sketch; not checked against every caller of the comparator)
