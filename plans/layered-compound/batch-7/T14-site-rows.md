<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Site rows

**Agent:** java-architect (recorder part), then typescript-pro (replay part), in sequence · **Commit:** `test(T14): record and
replay the 7h site rows`
Scratch: `$TMPDIR/7h/T14/`.

## Context

Mission 7h, H2, H8, H12 (F12 shape; 7g's T20, `src/alg/layered/LayeredLoopsSites.test.ts`). T12 lists the scenarios (`Sc1…`, about
40 at most) that reach S-classified branches. They include the `reviewAndCorrectHierarchicalProcessors` throw (a row whose
`expected` records the exception class and message) if T12 listed it.

## Task

1. Add a `sites` group to `LayeredCompoundVectors.java`: one row per scenario, inline `elk`, with the full step list or a
   hierarchical stop as T12 says. `expected` is recorded from the oracle. The `full`, `models` and `scenarios` groups must stay
   byte-identical (check with `cmp` on a group-filtered extract), and `rowCounts.sites` is updated.
2. `src/alg/layered/LayeredCompoundSites.test.ts`: replay every `sites` row under its scenario title through T2's helpers, and
   check that the TS sites T12 names are reached (instrumented counter or a coverage check, as 7g's T20 did).
3. Re-run T9's file. `LayeredCompoundVectors.test.ts` also replays the `sites` group, if it loads all groups.

## Write-set

`tools/vectors/LayeredCompoundVectors.java`, `test/golden/refs/java/layered-compound.json`, `src/alg/layered/LayeredCompoundSites.test.ts`.

## Read-set

`plans/layered-compound/unreached.md` (T12), `src/alg/layered/LayeredLoopsSites.test.ts`,
`plans/layered-loops-wrapping-compaction/batch-9/T20-site-rows.md`, `decisions.md` H2, H8.

## Acceptance criteria

- Given the re-recorded ref, when diffed by group, then only `sites` and `rowCounts.sites` changed.
- Given every `sites` row, when replayed, then 0 mismatch, and each reaches its named TS site.
- Given the ref, then it is under 16 MiB and byte-identical on a second run.

## Observability / Rollback

N/A. Reversible.
