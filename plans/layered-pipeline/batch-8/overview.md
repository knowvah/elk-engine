<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 8 — Site rows for unreached branches

One task after T13's map.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T15 | `sites/*` rows per S scenario ([brief](T15-site-rows.md)) | java-architect | tools/vectors/LayeredPipelineVectors.java, test/golden/refs/java/layered-pipeline.json, test/helpers/layered-pipeline-replay-*.ts (new ops only) | T13 | [x] |

The batch is done when every S scenario has a row or a U correction and existing rows are byte-identical.
