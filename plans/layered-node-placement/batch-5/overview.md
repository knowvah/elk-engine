<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 5 — Site rows for the unreached branches

One task after T9. Every S scenario of `unreached.md` becomes a `sites/*` step row recorded by the same interpreter
as `scenarios/*`; the landed `models/*` and `scenarios/*` rows stay byte-identical.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T11 | Site rows for the unreached branches ([brief](T11-site-rows.md)) | java-architect | tools/vectors/LayeredPlacementVectors.java (sites group), test/golden/refs/java/layered-placement.json, test/helpers/layered-placement-replay-*.ts (new ops only) | T9 | [x] |

The batch is done when every S id has rows, T8's replay is green over the new rows, the per-branch hit deltas are
reported, and the README gates are green. The agent never runs `npm run coverage` and never commits.
