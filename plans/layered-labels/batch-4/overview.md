<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — Replay every row

One task, **serial** after batch 3. T12 replays every row of `layered-labels.json` through the real driver and the step
interpreter. This is the proof batch: a divergence is traced to its origin with the diagnosis artifact (`~/.claude/rules/diagnosis.md`:
mechanism, `file:line` origin, causal chain, ruled out) and fixed in the 7f2 class that holds it, never by adjusting a row, a helper
or a tolerance (AD-13, stop 3). A mechanism outside the write-set is stop 1 or stop 17.

| ID  | Description | Agent | Writes | Depends On | Done |
| --- | ----------- | ----- | ------ | ---------- | ---- |
| T12 | Replay all rows of `layered-labels.json` ([brief](T12-replay.md)) | typescript-pro | src/alg/layered/LayeredLabelsVectors.test.ts, the 7f2 classes of T4a–T10 (fixes at origin only), plans/layered-labels/decision-journal.md | T1, T2, T11 | [x] |

T12 is the only task that writes the 7f2 classes while it runs. Batch 5 depends only on batch 3 (README), and its three tasks
write test files only; a port defect a suite finds is reported to the orchestrator, who routes the fix through T12's write-set
rather than letting a suite agent edit a class (stop 1). The batch is done when every row passes,
`npx vitest run src/alg/layered/LayeredLabelsVectors.test.ts` takes at most 30 s alone (stop 11) and the README gates are green.
