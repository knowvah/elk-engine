<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-jitter-exact: decisions

## D0: the source this mission executes

Issue #106 (`follow-up`, `queue:ready`, filed by `elk-pin-move-8bca22f4`, decision D3): "turn the `jitter` rows into exact
rows (the end dump, and the `import` stop with the shifted centres), or add exact twins beside them." The issue offers both
forms; D1 picks one. No ruling is needed: the issue asks for new rows, and D1 changes no landed row.

## D1: an additive `shift` group beside the jitter rows

**Decision.** A new row group `shift`, recorded for the four `jitterSpecs()` scenarios (`corpus` and `dup5`, both
algorithms, `DEFAULT_ONLY`). Ids `shift/<alg>/<scenario>/default`. The `jitter` rows stay as they are.

**Why.** It is the only form that leaves every landed row and every frozen count untouched:

- Converting the `jitter` rows changes 4 landed rows, drops the `runsAgree` and displacement evidence, and changes the frozen
  `toHaveLength(4)` of `SporeLayoutVectors.test.ts`.
- Twins in the `full` and `stops` groups change 7 frozen counts in 6 test files (`114`/`113` full, `61` stops,
  `36` compaction and `25` overlap stops in `ShrinkTreeCompactionPhase.test.ts` and `GrowTreePhase.test.ts`, the stops loops
  of `DelaunayTriangulationPhase.test.ts` and `MinSTPhase.test.ts`), and pull the jitter rows into per-phase proofs that
  never asked for them. Each would be an AD-13 change.
- A new group needs only new tests and the one header key (D3).

## D2: the row shape is the stops shape

**Decision.** `expected = { algorithm, jitterNodes, tieOrder, stops }`, exactly as a `stops` row, with `jitterNodes` > 0 in
the row and in the `import` stop. The `end` stop carries the ELK dump; the recorder already fails a row whose stepwise end
differs from the engine run on a fresh import (`SporeLayoutVectors.java`, `build`), so one row holds both "the end dump and
the import stop" of #106, plus every stop between.

**How.** In `build`, the `jitterNodes > 0` branch keeps returning the invariants row for a planned `full` row and nothing for
`stops`; a planned `shift` row falls through to the exact path (round trip, stepwise vs engine, throws checks) and is built
like a `stops` row with group `shift`. A planned `shift` row with `jitterNodes == 0` fails the recording ("did not reach the
shiftUntilUnique loop"). `buildRows` records `stable(s, f, SHIFT)` for each `jitterSpecs()` factor after its jitter row, so
the build-twice byte check covers it.

## D3: `shift` is in `ROW_GROUPS`, not `GROUPS`

**Decision.** Follow the `objects` precedent (T13b, `SporeLayoutVectors.java:228-232`): `ROW_GROUPS` gains `SHIFT` between
`JITTER` and `OBJECTS`; `GROUPS` does not, and `countCoverage` is not called for `shift`. The header then changes only by
`"shift": 4` in `rowCounts`; `tieSummary` and `optionCoverage` stay byte-equal. Rows sort by `ROW_GROUPS`, so the new rows
sit between the `jitter` and `objects` rows; the `objects` rows move down unchanged.

## D4: the port-side checks

**Decision.** `test/helpers/spore-replay-rows.ts` gains `'shift'` in `SPORE_ROW_GROUPS` (after `'jitter'`), a `ShiftRow` type
(the `StopsRow` shape with group `shift`), a `loadSporeRows('shift')` overload, and `checkRow` validates a `shift` row as a
stops row. Tests (new `describe` blocks only):

- `src/alg/spore/SporeLayoutVectors.test.ts`: the ref has 4 shift rows; per row, through the real providers, the step
  sequence and every stop equal the row at AD-4, `result.dump` equals the `end` stop's dump fields, `jitterNodes` equals the
  row and is > 0, and the tie summary equals `tieOrder`. The tally of the new rows is reported by `SPORE_REPORT=1`.
- `src/alg/spore/ElkGraphImporter.test.ts`: the importer's stops (`underlying`, `import`, `update`, `end`) of each shift row
  equal the port dump, as its stops block does; plus one assertion that at least `jitterNodes` `import` vertices differ from
  their child's centre (the shift is in the recorded values, not only in the count).

Every landed `describe` block, count and assertion stays as it is.

## D5: proof that the landed rows did not move

**Decision.** After the regeneration, a scratch node script (under `$TMPDIR/spore-jitter-exact/`, quoted in the journal)
compares the new ref with `git show <base>:test/golden/refs/java/spore-layout.json`: every base row id exists with a
byte-identical row string, the only new ids are the 4 `shift/…` rows, and the headers are equal by JSON comparison apart from
`rowCounts.shift`. Journal the regeneration with the oracle commit and patch set (no new patch id: `0001`-`0004`).

## D6: docs

**Decision.** `docs/architecture/alg-packing.md` § 3.2 (PK4) says the shift is exact in the `shift` group, and its rows at
`:524` and `:536` stop naming #106 as open. `docs/conformance.md`: the PK4 text near `:346-352` and `:2321`, and the spore row
of the ref table near `:2242` gains `shift 4` in its last column only if that table states current counts (it said `339`
rows at planning: if it is a historical snapshot, leave it and say so in the journal). One closing row appended to
`plans/alg-packing/decision-journal.md` (PK4 is 8c's decision).

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on 2026-11-24.

| Decision | Chosen | Rejected | Evidence |
| -------- | ------ | -------- | -------- |
| D1 | new `shift` group | convert the 4 `jitter` rows; twins in `full`/`stops` | frozen counts: `SporeLayoutVectors.test.ts:94-95,121,208`, `ElkGraphImporter.test.ts:64,92-93`, `ShrinkTreeCompactionPhase.test.ts:25`, `GrowTreePhase.test.ts:27` |
| D2 | stops shape, one row per scenario | separate full and import-only rows | `build` already checks stepwise end = engine dump; #106 asks for both |
| D3 | `ROW_GROUPS` only | add to `GROUPS` (every `optionCoverage` line and `tieSummary` change) | T13b `objects` precedent, `SporeLayoutVectors.java:230` |
| D4 | new describe blocks in the two replay files | a new test file | the replays already own the stop comparison helpers |
| D5 | scripted byte check of the old rows | eyeball the diff | AD-13; the 0004 regeneration row of `plans/spore-scanline-0004/decision-journal.md` checked rows by id the same way |
| D6 | update current-state text only | rewrite historical count tables | `alg-packing.md:145` and `conformance.md:2242` still say 339 rows (pre-#104) |

No decision is Irreversible; nothing here is reserved for the maintainer (no new divergence, no oracle patch, no landed
expected value).
