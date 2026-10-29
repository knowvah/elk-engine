<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11 — Site rows for the unreached branches

**Agent:** java-architect (sonnet; resume T1's agent) · **Commit:** `test(T11): record layered phase site rows`

## Context

Mission 7b (README), B7, T9's `unreached.md`. Every S scenario becomes a `sites/<Class>/<name>` step row recorded
by the same interpreter as `scenarios/*`. 7a's T10 (`plans/layered-framework/batch-7/T10-site-recorder-x5.md`) is the
precedent, at a smaller scale.

## Task

1. Add the `sites` group to `LayeredPhaseVectors.java`: one row per S scenario of `unreached.md`, ids as listed,
   steps in T1's vocabulary; a scenario that needs a new op adds it to the Java interpreter and to
   `test/helpers/layered-phase-replay-ops.ts` (journal the op; existing rows byte-identical).
2. Re-run `layered-phase-vectors.sh`; `models/*` and `scenarios/*` rows must be byte-identical to the landed file
   (compare before replacing); `rowCounts.sites` equals the S count.
3. Replay check: `npx vitest run src/alg/layered/LayeredPhaseVectors.test.ts` passes with the new rows (T8's test reads
   the counts from the file); a mismatch is a port defect to diagnose at origin, never a row to adjust.

## Write-set

`tools/vectors/LayeredPhaseVectors.java`, `test/golden/refs/java/layered-phases.json`,
`test/helpers/layered-phase-replay-ops.ts` (new ops only).

## Read-set

`plans/layered-cycles-layers/unreached.md`, `batch-1/T1-phase-recorder.md` § Interface contract, the Java for each
scenario's branch.

## Interface contract (consumed by T12)

Row ids `sites/<Class>/<name>` exactly as `unreached.md` lists them; `expected` carries the fields the table names.

## Acceptance criteria

- Given the re-recorded file, when diffed against the landed one, then only `sites/*` rows and `rowCounts.sites` differ.
- Given `unreached.md`, when its S ids are compared with the file, then every id has a row and no row lacks an entry.
- Given T8's replay, when run, then every site row matches.

## Observability / Rollback

N/A. Reversible.
