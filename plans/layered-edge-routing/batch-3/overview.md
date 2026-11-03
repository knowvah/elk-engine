<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — The spline router

One task after batch 2: `SplineEdgeRouter` needs T6's segment and nested types and T7's spline classes, and T9's
calculator needs this router's output (`isQualifiedAsStartingNode`, `SPLINE_DIMENSION`, the segments on the graph).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T8  | `SplineEdgeRouter` and its sections ([brief](T8-spline-router.md)) | typescript-pro | src/alg/layered/p5edges/splines/SplineEdgeRouter*.ts + tests (not the T6 nested-type files) | T4, T5, T6, T7 | [x] |

The batch is done when T8's acceptance criteria pass and the README gates are green.
