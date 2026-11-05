<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — The driver

One task after batch 2. T8 replaces the staged `ElkLayered`, adds `GraphConfigurator`, wires the six arms and applies T8's F9
assertion changes. From here `LayeredLayoutProvider.layout` runs.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T8  | `GraphConfigurator`, `ElkLayered`, six arms, F9 edits, entry points ([brief](T8-driver.md)) | typescript-pro | src/alg/layered/{ElkLayered,GraphConfigurator}*.ts + tests, the Create section, the F9 files, test/architecture/{staged-classes.json,layered-entry-points.fitness.test.ts} | T4, T5, T6, T7 | [x] |

The batch is done when T8's acceptance criteria pass and the README gates are green.
