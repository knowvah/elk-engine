<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — Rectpacking p1 + p3, p2; spore providers and suites

Parallel; disjoint write-sets.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T9 | Rectpacking width approximation (p1) and whitespace elimination (p3) ([brief](T9-rectpacking-p1-p3.md)) | typescript-pro | src/alg/rectpacking/{p1widthapproximation/**,p3whitespaceelimination/**} | T6 | [x] |
| T10 | Rectpacking packing (p2) ([brief](T10-rectpacking-p2.md)) | typescript-pro | src/alg/rectpacking/p2packing/** | T6 | [x] |
| T11 | Spore providers, `ShrinkTree`, both suites, `jitter` rows ([brief](T11-spore-providers.md)) | typescript-pro | src/alg/spore/{OverlapRemovalLayoutProvider,ShrinkTree,ShrinkTreeLayoutProvider,UtilsTest,ScanlineOverlapRemovalTest,SporeLayoutVectors}*.ts | T7 | [x] |

Each task unstages its own classes and removes their `staged-classes.json` rows; the orchestrator merges the json edits in task order.
