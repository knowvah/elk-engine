<!-- SPDX-License-Identifier: EPL-2.0 -->

# Execution observations: spore-jitter-exact (issue #106, 2026-11-24)

Planning-time notes are in `spore-jitter-exact-planning.md`. Journal: `plans/spore-jitter-exact/decision-journal.md`.

## Observation: a shifted spore input passes every exact check of the recorder unchanged

- **Context**: T1, the first recording of the `shift` group. The planning note warned that the `jitterNodes > 0` path of
  `SporeLayoutVectors.java` `build` had never run the round-trip, stepwise-against-engine and build-twice checks.
- **Finding**: all four jitter scenarios passed those checks on the first run, with no recorder change beyond routing the
  group. The importer builds its `Random` from `randomSeed` on every `importGraph`, so the stepwise run, the engine run and
  the re-imported input draw the same sequence. The port replays the 4 rows with 1,357 doubles raw-bit identical and 0
  within 1e-6, the 12 shifted centres included, and needed no `src/` change.
- **Impact**: a spore input with coincident centres can be an exact row in any group as long as `randomSeed` is not 0. The
  invariants-only form of the `jitter` rows is history, not a limit of the oracle.
- **Confidence**: High

## Observation: a new row group couples the ref and the rows helper in both directions

- **Context**: T1 step 7, choosing what goes into the recorder commit.
- **Finding**: `parseSporeFile` rejects a ref with a group that `SPORE_ROW_GROUPS` does not list (`unknown group`), and
  `rowCountsDifference` rejects a ref whose `rowCounts` lacks a group that the list has (`rowCounts.shift is undefined`).
  Neither order of two commits leaves the landed replays green.
- **Impact**: a mission that adds a group to a vector ref puts the ref and the helper's group list in one commit; the new
  tests can follow in the next.
- **Confidence**: High

## Observation: the `SPORE_REPORT` tally is not printed by the default reporter when stdout is a pipe

- **Context**: T2, reading the raw-bit tally of `SporeLayoutVectors.test.ts`.
- **Finding**: `SPORE_REPORT=1 npx vitest run <file> | grep "spore replay"` printed nothing; the same command with
  `--reporter=verbose` printed both tally lines (`stdout | <file>` blocks).
- **Impact**: read a `console.info` tally of a vitest file with `--reporter=verbose`; an empty grep is not a missing tally.
- **Confidence**: Medium (two runs, one machine; the reporter's rule was not read in the vitest docs)
