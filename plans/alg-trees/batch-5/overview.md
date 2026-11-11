<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — mrtree routing; fan and compaction processors

Two tasks **in parallel** after batch 4; both replace T6 staged bodies and keep markers and rows.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T15 | mrtree `EdgeRouter`, `MultiLevelEdgeNodeNodeGap` ([brief](T15-mrtree-routing.md)) | typescript-pro | src/alg/mrtree/p4route/** | T12, T14 | [x] |
| T16 | mrtree `FanProcessor` (V4), `CompactionProcessor` ([brief](T16-mrtree-fan-compaction.md)) | typescript-pro | src/alg/mrtree/intermediate/{FanProcessor,CompactionProcessor}* | T12, T14 | [x] |
