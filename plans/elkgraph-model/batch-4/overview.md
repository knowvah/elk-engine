<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Model completion, ElkGraphUtil, vector replay

One task: the remaining impl classes, the factory, `ElkGraphUtil`, the ported `ElkGraphUtilTest`,
and the `graph.json` replay that proves the whole model (D2, D9).

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T9 | `ElkConnectableShapeImpl`, `ElkNodeImpl`, `ElkPortImpl`, `ElkEdgeImpl`, `ElkEdgeSectionImpl`, `ElkGraphFactoryImpl`, `ElkGraphUtil` + ported `ElkGraphUtilTest` + `graph.json` replay | typescript-pro (effort high) | src/graph/impl/{ElkConnectableShapeImpl,ElkNodeImpl,ElkPortImpl,ElkEdgeImpl,ElkEdgeSectionImpl,ElkGraphFactoryImpl}.ts, src/graph/util/ElkGraphUtil.ts, src/graph/util/ElkGraphUtil.test.ts, src/graph/impl/ElkGraph.replay.test.ts, test/helpers/graph-vectors.ts | T2, T7, T8 | [x] |

Batch done when the replay reports 0 skipped scenarios and the README gates are green.
