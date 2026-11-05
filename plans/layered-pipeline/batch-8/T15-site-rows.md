<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Site rows for the unreached branches

**Agent:** java-architect (sonnet) · **Commit:** `test(T15): record layered pipeline site rows`
Scratch: a private subdirectory `<scratchpad>/T15/`.

## Context

Mission 7f, F12, T13's `unreached.md`. Every S scenario becomes a `sites/<Class>/<name>[/<variant>]` step row recorded by the same interpreter as `scenarios/*`. 7e's T13 is the precedent (`plans/layered-edge-routing/batch-7/T13-site-rows.md`, its journal rows give the per-branch verification method; site rows as a compact table with macros).

## Task

1. Add the `sites` rows to `LayeredPipelineVectors.java`: one per S item, ids as listed plus `/<variant>` where several; every node sized; a new step op goes into the Java interpreter and T3's ops helper (the 7b–7e helpers are never edited), journaled in the hand-back; existing rows byte-identical. Seeds with a spread when a row must record both outcomes of a draw (`.agent-notes/layered-edge-routing.md`).
2. Record to a scratch dir; prove the `full`, `models` and `scenarios` rows byte-identical (extract and `cmp`) before replacing the ref; `rowCounts.sites` updated; ≤ 16 MiB; recorder under 5,000 lines (stop 13).
3. Replay check: `npx vitest run src/alg/layered/LayeredPipelineVectors.test.ts` passes with the new rows; per-branch hit deltas (`-t '<row id>' --coverage`) report which branch each row reaches, and which it cannot, with the Java mechanism (those return to the orchestrator as U candidates for the `unreached.md` corrections section). Update row inventories and `CALLERS` tables in the same commit (the 7d and 7e lesson).

## Write-set

`tools/vectors/LayeredPipelineVectors.java`, `test/golden/refs/java/layered-pipeline.json`, `test/helpers/layered-pipeline-replay-*.ts` (new ops only).

## Read-set

`plans/layered-pipeline/unreached.md`, `batch-1/T1-pipeline-recorder.md` § Interface contract, the Java per branch, `tools/vectors/LayeredRoutingVectors.java:2610-2700` (the 7e macros, read only), `decisions.md` F12, F16.

## Interface contract (consumed by T16)

`sites/*` row ids as in `unreached.md`, with the fields each branch decides.

## Acceptance criteria

- Given `layered-pipeline.json`, when re-recorded, then non-`sites` rows are byte-identical and the file is under 16 MiB.
- Given each S scenario, when replayed, then its listed branch is reached, or it is reported as a U candidate with its mechanism.
- Given the recorder, when measured, then it is under 5,000 lines.

## Observability / Rollback

N/A — no new observable operations. Reversible.
