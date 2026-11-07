<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 7 — Site rows

One task, **serial** after T14. T16 turns every S scenario of `unreached.md` into a `sites/<Class>/<name>[/<variant>]` step row recorded
by the same interpreter as `scenarios/*`, in the recorder T1 wrote. 7f's T15 is the precedent: non-`sites` rows are proven
byte-identical before the ref is replaced, and a scenario that cannot reach its branch returns to the orchestrator as a U candidate.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T16 | Site rows for the unreached branches ([brief](T16-site-rows.md)) | java-architect | tools/vectors/LayeredLabelsVectors.java, test/golden/refs/java/layered-labels.json, test/helpers/layered-labels-replay-*.ts (new ops only) | T14 | [x] |

T16 reopens the recorder file T1 and T15 wrote, so it never runs in parallel with T15 (batch 6 is done first). The batch is done
when the acceptance criteria pass and the README gates are green; the new rows replay through `LayeredLabelsVectors.test.ts`
unchanged in structure (its `sites` group was empty until now).
