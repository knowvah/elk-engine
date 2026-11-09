<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — Site rows for the unreached branches

**Agent:** java-architect (sonnet) · **Commit:** `test(T16): record layered label site rows`
Scratch: a private subdirectory `<scratchpad>/T16/`.

## Context

Mission 7f2, G2, G12, F12, T14's `unreached.md`. Every S scenario becomes a `sites/<Class>/<name>[/<variant>]` step row recorded by the
same interpreter as `scenarios/*`. 7f's T15 is the precedent (`plans/layered-pipeline/batch-8/T15-site-rows.md`, its journal rows give
the per-branch verification method; site rows as a compact table with macros; `tools/vectors/LayeredRoutingVectors.java:2610-2700` shows
the 7e macros, read only).

## Task

1. Add the `sites` rows to `LayeredLabelsVectors.java`: one per S item, ids as `unreached.md` lists plus `/<variant>` where several; every
   node and label sized; a new step op goes into the Java interpreter **and** T2's ops helper (new ops only, the landed helpers are never
   edited), journaled in the hand-back; existing rows byte-identical. Use seeds with a spread when a row must record both outcomes of a draw.
2. Record to a scratch dir; prove the `full`, `models` and `scenarios` rows byte-identical (extract and `cmp`) **before** replacing the ref
   (a re-recorded row is stop 3); `rowCounts.sites` updated; ≤ 16 MiB; recorder under 5,000 lines (stop 13; T15's sweep code counts).
3. Replay check: `npx vitest run src/alg/layered/LayeredLabelsVectors.test.ts` passes with the new rows (its `sites` group was empty);
   per-branch hit deltas (`-t '<row id>$' --coverage`) report which branch each row reaches, and which it cannot, with the Java
   mechanism (those return to the orchestrator as U candidates for `unreached.md`'s corrections section). Update row inventories and
   `CALLERS` tables in the same commit (the 7d and 7e lesson).
4. Hand-built logging rows (`logging` op) for the debug utilities' branches (a nested graph, a graph with `TARGET_OFFSET` edges,
   `NORTH_SOUTH_PORT` dummies in `DotDebugUtil.writeLayer` and `JsonDebugUtil.getNodeName`) record the logged strings; G3 still applies.

## Write-set

`tools/vectors/LayeredLabelsVectors.java`, `test/golden/refs/java/layered-labels.json`, `test/helpers/layered-labels-replay-*.ts` (new ops only).

## Read-set

`plans/layered-labels/unreached.md`, `batch-1/T1-labels-recorder.md` § Interface contract, the Java per branch,
`tools/vectors/LayeredRoutingVectors.java:2610-2700` (read only), `plans/layered-pipeline/batch-8/T15-site-rows.md`,
`decisions.md` G2, G3, G12, F12, F16.

## Interface contract (consumed by T17a, T17b)

`sites/*` row ids as in `unreached.md`, with the fields each branch decides.

## Acceptance criteria

- Given `layered-labels.json`, when re-recorded, then non-`sites` rows are byte-identical and the file is under 16 MiB.
- Given each S scenario, when replayed, then its listed branch is reached, or it is reported as a U candidate with its mechanism.
- Given the recorder, when measured, then it is under 5,000 lines.
- Given `git diff main -- test/golden/refs/`, when read, then only `layered-labels.json` (added) and the metrics file (added keys) changed.

## Observability / Rollback

N/A — no new observable operations. Reversible.
