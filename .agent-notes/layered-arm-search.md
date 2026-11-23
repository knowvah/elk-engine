<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: layered-arm-search (issue #59, 2026-11-23)

Planning-time notes are in `layered-arm-search-planning.md`. Journal: `plans/layered-arm-search/decision-journal.md`.
Outcomes: `plans/layered-compound/unreached.md` § "Search outcomes (issue #59, layered-arm-search)".

## Observation: three tests pin exact lists of row ids, so "append-only" rows are not free

- **Context**: T5 and T6 appended ten rows to `layered-order.json` and `layered-compound.json`; every row replayed, and
  the full suite still had 3 failures.
- **Finding**: `SortByInputModelProcessor.test.ts:81` (`ROW_NAMES`: every order row whose last entry is
  `SORT_BY_INPUT_ORDER_OF_MODEL`), `LayerSweepCrossingMinimizer.test.ts:152` (`LAYER_SWEEP_ROWS`: every step row whose
  last phase is `LAYER_SWEEP`) and `LayeredCompoundTwins.test.ts:285` (`DIFFERING_ROWS`: every compound row whose replay
  differs under a reversed key iteration; any row with a hierarchical port shared by two edges) assert `toEqual` on an
  id list. A new row that matches the filter fails the test. Other per-class tests of the order ref may hold lists of
  the same kind for other stops; only these three were met.
- **Impact**: a brief that appends rows to these two refs must grep the suites for id lists first (`ROW_NAMES`,
  `_ROWS: readonly string[]`, `DIFFERING_ROWS`) and ask for the list extension in the issue, because changing them in a
  queue mission is an AD-13 stop (#156). Run the whole suite right after the first recorded row, not at the last gate:
  the replay test of the ref alone passes.
- **Confidence**: High

## Observation: a north/south hierarchical port needs connections in several layers to exercise the routing strategies

- **Context**: arms 1-6 (`NorthToSouthRoutingStrategy`, `SouthToNorthRoutingStrategy`), which 7h's 22 chain graphs and 39
  port positions did not reach.
- **Finding**: the strategies see one hyperedge segment per north or south external port. Its incoming coordinates are
  the x of the layer dummies `HierarchicalPortConstraintProcessor` creates next to each connected node (one per layer),
  and its outgoing coordinate is the port dummy's x, the mean of those dummies in a compound layout. In a compound layout
  the nested graph's port constraints are reduced to `FIXED_SIDE` or `FREE` (`CompoundGraphPreprocessor.java:941-945`),
  so `FIXED_POS` and `FIXED_RATIO` positions never reach the router; the position is set through the connections. Two
  ports with dummies in layers {0, 2} and {1, 3} conflict both ways (a split segment); one port with dummies in three
  layers and one node 3e-3 wider has an edge 5e-4 long in x (inside the 1e-3 tolerance, not zero).
- **Impact**: to steer a hierarchical port's x in an `INCLUDE_CHILDREN` graph, choose which layers it connects to and
  the node widths, not the port position.
- **Confidence**: High (four graphs, taken on the instrumented oracle and in the port)

## Observation: bit-equal doubles come from two code paths over the same stored values

- **Context**: arm 24 (`ForsterConstraintResolver.java:261`), which needs two constraint groups with equal float
  barycenters; 7c's 720 random variants never produced one.
- **Finding**: with `considerModelOrder` the first sweep runs pre-ordered, and a node without a barycenter gets the mean
  of its neighbours' values (`BarycenterHeuristic.java:131-160`). A merged constraint group of degree 0 gets the mean of
  its two members (`ForsterConstraintResolver.java:445-448`). When both means are over the same two nodes, the values
  are the same double, whatever the random jitter.
- **Impact**: for a guard on exact equality under jitter, look for two places that compute the same expression on the
  same stored doubles, instead of scanning seeds.
- **Confidence**: High

## Observation: `considerModelOrder.noModelOrder` is the supported way to get elements without `MODEL_ORDER`

- **Context**: arms 15 and 17, which need a port or an edge without `MODEL_ORDER` in a graph that sorts by model order.
- **Finding**: a node with `considerModelOrder.noModelOrder` gets no model order, and neither do its ports
  (`ElkGraphImporter.java:242`, `:475-479`, `:998`); two unconnected `EAST` ports on it reach the `else` of
  `ModelOrderPortComparator.java:322` in a normal layout. Edges are different: every imported edge is numbered when the
  strategy is set, and every processor that creates an edge before the sort copies the property, so an edge without
  `MODEL_ORDER` needs the strategy set after the import (a constructed state).
- **Impact**: the creator list (copies or does not copy, with lines) is in the T3 journal row and in
  `tools/arm-search/model-order/README.md`.
- **Confidence**: High

## Observation: v8 keys `binary-expr[0]` as the whole condition and `[1]` as its right operand

- **Context**: reading the arm counts of `a && b` conditions (arms 9, 13, 14).
- **Finding**: in `coverage-final.json`, `binary-expr[0]` counts the evaluations of the left operand, which is every
  evaluation of the condition, and `binary-expr[1]` those of the right operand. So `binary-expr[0]` of an `else if` is
  untaken exactly when the chain never reaches that test.
- **Impact**: an "untaken `binary-expr[0]`" arm asks for reaching the test, not for a value of its operand.
- **Confidence**: High (checked by the T3 search on a line with known counts)

## Observation: the arm table tool is not a gate, and its table went stale

- **Context**: running `tools/vectors/compound-site-arms.mjs` without arguments before changing it.
- **Finding**: it exits 1 at the base. `553aaf72` added an import line to `CompoundGraphPreprocessorSegments.ts`, and six
  table entries of two 7h rows now name lines without a branch (`NOT FOUND`). The structural test checks only that the
  line exists (#157).
- **Impact**: take the tool's "before" output before editing it, and name rows on the command line when checking new
  entries.
- **Confidence**: High

## Observation: the full-dump comparison of the order replay has no `Map`/`HashMap` twin

- **Context**: constructed order rows with a `layers` step and five nodes.
- **Finding**: `compareOrder` maps the port's `{class: Map}` to the oracle's `HashMap` for `changed`;
  `compareOrderFullDump` does not, and a layerless node's `TARGET_NODE_MODEL_ORDER` shows in the full dump. A row stores
  the full dump below ten imported nodes, so the candidates carry isolated filler nodes up to ten (#158).
- **Impact**: until #158 is fixed, a step row that runs `SORT_BY_INPUT_ORDER_OF_MODEL` after a `layers` step needs ten
  nodes.
- **Confidence**: High (reproduced without the fillers)

## Observation: measuring "newly taken arms" needs a second tree, and vitest writes no report on a failing run

- **Context**: D9, which arms outside the 25 the new rows take.
- **Finding**: `git archive <base> | tar -x` into `$TMPDIR` with `node_modules` linked and absolute `ELK_*` directories
  runs the layered evidence suites (113 files) in 40 s; the same run in the tree with the rows, and a diff of the two
  `coverage-final.json` files by file, line and arm, lists the arms that go from 0 to a count. A run with a failing test
  leaves no `coverage-final.json`.
- **Impact**: the diff is exact because only tests and refs differ between the trees; it does not need per-row runs.
- **Confidence**: High

## Observation: search times

- **Context**: the issue's budget of 4 h per group.
- **Finding**: the three constructive searches (one subagent each, proofs first) took 8, 49 and 35 minutes and left no
  arm open. Each deadness proof was then read against the Java by the orchestrator, and each hit re-run.
- **Impact**: for arms like these, reading the guard backward is far cheaper than the random scans earlier missions
  spent.
- **Confidence**: Medium (one mission)
