<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Entry points and oracle replay

**Agent:** typescript-pro (sonnet) · **Commit:** `feat(T7): port node micro layout and replay oracle vectors`
`J` = `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.common/src/org/eclipse/elk/alg/common`; `N` = `J/nodespacing`.

## Context
Mission 6b (README). These classes tie the package together:
- **`NodeLabelAndSizeCalculator.process`:** the phase sequence (context → port contexts → cells → port sizes → node
  size → placement → apply).
- **`NodeDimensionCalculation`:** the static facade layered (7a) calls.
- **`NodeMicroLayout`:** the builder force, mrtree, radial and rectpacking (8x) call.

T1 recorded the oracle behaviour in `test/golden/refs/java/node-micro-layout.json`. This task replays every row. It
is the mission's conformance evidence (AC2, NS1–NS6). All other nodespacing classes are landed; don't edit them
(stop 1). A replay mismatch is diagnosed, never fixed by changing the vectors (stops 4, 5).

## Task
1. Port to `src/alg/common/`:
   - `nodespacing/NodeLabelAndSizeCalculator.ts` (`N/NodeLabelAndSizeCalculator.java`, 291 lines):
     - `process(graph)` (`:63`) and `process(graph, node, applyStuff, ignoreInsidePortLabels)` (`:86`). These are
       overloads: name them per §6.5 and journal the names.
     - `computeInsideNodeLabelPadding` (`:225`).
     - Keep the phase order and the code-name comments verbatim.
   - `nodespacing/NodeDimensionCalculation.ts` (`N/NodeDimensionCalculation.java`): `calculateLabelAndNodeSizes`,
     `calculateNodeMargins`, `getNodeMarginCalculator`, `sortPortLists` (`:40-107`).
   - `NodeMicroLayout.ts` (`J/NodeMicroLayout.java`):
     - private constructor;
     - `forGraph(ElkNode | GraphAdapter)`, two Java overloads that dispatch at run time (§6.5), the `ElkNode` one via
       `ElkGraphAdapters.adapt`;
     - `execute()` (`:60-64`).
2. `test/helpers/node-micro-layout-replay.ts`: the NS3 harness shared by the replay test. It works in four steps:
   1. `ElkGraphJson.forGraph(input).toElk()` (`src/graph/json/ElkGraphJson.ts:204`);
   2. post-order over the nodes that have children, running `NodeMicroLayout.forGraph(node).execute()`;
   3. collect `{nodes, ports, labels}` in the NS6 traversal order;
   4. decode the hex doubles.
   Throws are captured as `{class, message}`.
3. `src/alg/common/NodeMicroLayoutVectors.test.ts`:
   - one `it` per row (`it.each` over the rows);
   - numbers compared within absolute 1e-6 (AD-4); ids, element counts and throws (class simple name and message)
     exactly;
   - the row counts per group asserted against `rowCounts`;
   - load the JSON once (`beforeAll` or module scope).
4. Unit tests for the three entry points:
   - the `forGraph` dispatch;
   - `execute()` calling sort, sizes and margins in Java order (observable through results, not mocks);
   - `getNodeMarginCalculator` returning a fresh calculator.
5. Coverage: run `npm run coverage` (orchestrator, alone) and read `src/alg/common/nodespacing/**` branch coverage.
   - Below 90 %: add Java-derived unit tests to the files of this task's write-set.
   - Still short and the branches only reachable from files outside the write-set: stop 10 with the list of uncovered
     `file:line`.

## Write-set
`src/alg/common/nodespacing/{NodeLabelAndSizeCalculator,NodeDimensionCalculation}*.ts`, `src/alg/common/NodeMicroLayout.ts`,
`src/alg/common/NodeMicroLayoutVectors.test.ts`, `test/helpers/node-micro-layout-replay.ts` (+ their `.test.ts`).

## Read-set
- `N/{NodeLabelAndSizeCalculator,NodeDimensionCalculation}.java`, `J/NodeMicroLayout.java`.
- All landed `src/alg/common/nodespacing/**` (read only).
- `test/golden/refs/java/node-micro-layout.json` (header fields, a few rows; never load it whole into the agent's
  context), `tools/vectors/NodeMicroLayoutVectors.java` header comment.
- `src/graph/json/ElkGraphJson.ts:32-110,189-210`, `src/core/util/adapters/ElkGraphAdapters.ts`, `longBitsToDouble` from
  `src/java/lang/JavaDouble.ts` (decoding pattern: `src/alg/common/overlaps/OverlapsVectors.test.ts:25`).
- `decisions.md#ns1--inputs-stored-in-the-json` through `#ns6--recorded-fields-and-comparison`.

## Interface contracts
- **Input:** T1's JSON shape (`batch-1/T1-node-micro-layout-vectors.md#interface-contracts-output-consumed-by-t7`).
- **Output, for 7a/8x:**
  - `NodeMicroLayout.forGraph(...).execute()`;
  - `NodeDimensionCalculation.{calculateLabelAndNodeSizes, calculateNodeMargins, getNodeMarginCalculator,
    sortPortLists}(adapter)`;
  - the `NodeLabelAndSizeCalculator.process` overloads.

## Acceptance criteria
- Given every row of `node-micro-layout.json`, when replayed, then every number matches within 1e-6 and every id,
  count and throw matches exactly.
- Given the row counts, when compared with `rowCounts`, then they are equal for all four groups.
- Given `npm run coverage`, when it runs, then the global gate is green and `src/alg/common/nodespacing/**` branch
  coverage is ≥ 90 %.
- Given `npm test` at similar load, when compared with the baseline, then the replay adds ≤ 5 s; 5–10 s is journaled.
- Given `git diff main -- test/golden/refs/java/node-micro-layout.json` after this task, then it shows only T1's
  addition (no re-recording).

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
