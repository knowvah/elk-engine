<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Replay test and re-anchored sites

Two parallel tasks, both consuming T2's `nodespacing-sites.json`. Disjoint write-sets; both read the same fixtures.

| ID  | Description                                                        | Agent          | Writes                                                                                                                                                                                 | Depends On | Done |
| --- | ------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---- |
| T3a | Generic replay test; re-anchor the T2, T3, T5 sites               | typescript-pro | src/alg/common/nodespacing/NodespacingSiteVectors.test.ts, internal/NodeLabelLocation.test.ts, internal/algorithm/NodeLabelAndSizeUtilities.test.ts, NodeMarginCalculator.test.ts, test/helpers/nodespacing-site-replay.ts | T2         | [x]  |
| T3b | Re-anchor the T4 and T6 sites and the T1 scenarios                 | typescript-pro | internal/algorithm/{HorizontalPortPlacementSizeCalculator,PortPlacementCalculator,VerticalPortPlacementSizeCalculator,LabelPlacer,NodeSizeCalculator}.test.ts                           | T2         | [x]  |

Either task stops (stop 4/5/7) on a mismatch; neither edits `src/` implementation or re-records. The batch is done
when every row replays and the README gates are green.
