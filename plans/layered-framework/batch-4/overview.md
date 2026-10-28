<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Graph transform and transform replay

One task: the ElkGraph ↔ LGraph transform and its oracle replay. It is the first consumer of
`layered-framework.json`; from here on, re-recording that file is stop 4.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T6  | `graph.transform` package, staged `LabelDummySwitcher`, transform replay and the shared replay helper | typescript-pro | see [T6](T6-graph-transform.md#write-set) | T1, T3, T4, T5 | [x] |

The batch is done when T6's acceptance criteria pass and the README gates are green.
