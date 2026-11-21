<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning notes: layered-evidence-gaps (issue #49, 2026-11-21)

## Observation: layered never calls NodeMicroLayout

- **Context**: Scoping item 4 ("the `node-micro-layout.json` sweep never sets a port alignment").
- **Finding**: `LabelAndNodeSizeProcessor.ts:51` (Java `:68`) calls `NodeDimensionCalculation.calculateLabelAndNodeSizes`;
  `NodeMicroLayout` is called only by mrtree, vertiflex, rectpacking, radial and libavoid. Both share
  `PortPlacementCalculator`, which is where alignment and border offsets act.
- **Impact**: Layered evidence for port alignment belongs in a layered ref (`layered-pipeline.json`), not
  `node-micro-layout.json`.
- **Confidence**: High

## Observation: the 13 ptolemy IPP rows are vacuous by input, not by option

- **Context**: Item 1.
- **Finding**: The 9 vendored ptolemy inputs (`test/golden/inputs/realworld/ptolemy/`) have FIXED_ORDER nodes but no edge
  leaving a WEST port or entering an EAST port, so `InvertedPortProcessor` adds nothing and `testValidNodeOrder`'s
  assertions never run. About 41 of the 550 corpus ptolemy `.elkg` files have such a port (static XML scan, unverified);
  no tool under `tools/` converts `.elkg` to the vendored JSON.
- **Impact**: A non-vacuous ptolemy row needs vendoring tooling first.
- **Confidence**: High for the 9 files; Low for the 41.

## Observation: row-count pins differ by ref and group

- **Context**: Choosing where new rows go.
- **Finding**: `ElkLayered.test.ts:51` hard-codes `toHaveLength(199)` for `layered-pipeline.json` `full` rows;
  `LayeredPipelineVectors.test.ts:93-100` reads every group count from the ref's `rowCounts`; `layered-order.json` has no
  count pin. The routing tests pin counts (`plans/layered-edge-routing/unreached.md:12`: 883 rows + 6 counts).
- **Impact**: Adding `scenarios/*` rows to the pipeline ref needs no test edit; adding `full/*` rows does.
- **Confidence**: High (pipeline, order); Medium (routing, from the earlier record)

## Observation: two N/S hierarchical-port dummies per layer are easy to make

- **Context**: Item 2.
- **Finding**: `HierarchicalPortConstraintProcessor.java:251-292` creates one new dummy per original N/S external-port
  dummy per adjacent layer, so one inner node fed by two NORTH external ports gets two dummies in the layer before it.
  The existing `port-dummy-size/*` scenarios chain each port to its own node.
- **Impact**: The two-dummy HPDS row needs only a different edge pattern, not a new mechanism.
- **Confidence**: High (by reading; T2 confirms on the oracle)
