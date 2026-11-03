<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Site and call rows for the unreached branches

One task after T11 (T12 may still be running: disjoint write-sets, but the recorder file is T12's until it lands —
start T13 only after T12's recorder commit).

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T13 | `sites/*` and more `calls/*` rows per `unreached.md` ([brief](T13-site-rows.md)) | java-architect | tools/vectors/LayeredRoutingVectors.java, test/golden/refs/java/layered-routing-steps.json, test/helpers/layered-routing-replay-*.ts (new ops only) | T11, T12 | [x] |

The batch is done when every S scenario has a row, the `models` ref is byte-identical and the README gates are green.
