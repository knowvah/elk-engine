<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Wiring, unstaging, pre-approved assertions

One task. T8 makes hierarchical layout run: the two facades delegate to their sections, the last enum arm is wired, the staged
markers and rows go, and H7's assertion changes land in the same commit, so the tree is green before and after it.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T8  | Wiring and unstaging ([brief](T8-wiring.md)) | typescript-pro | H7's files, the two facades, `IntermediateProcessorStrategyCreate.ts`, `staged-classes.json` | T5, T6, T7 | [x] |
