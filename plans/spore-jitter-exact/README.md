<!-- SPDX-License-Identifier: EPL-2.0 -->

# spore-jitter-exact: mission brief (issue #106)

## Objective

Since eclipse-elk/elk#1242 (pin `8bca22f4`) the spore importer shifts coincident centres with a `Random` seeded by
`randomSeed` (default 1; `ElkGraphImporter.java:130-136`, the shift at `:177-178`, `shiftUntilUnique` at `:256-268`). The
four `jitter` rows of `spore-layout.json` still hold invariants only (PK4), so no recorded row covers the import-time
shift with exact values (#106). This mission adds a new exact row group, `shift`: one row per jitter scenario, with every
stop (`import` with the shifted `originalVertex` values through `end` with the ELK dump). The four `jitter` rows and every
other landed row stay byte-identical ([D1](decisions.md#d1-an-additive-shift-group-beside-the-jitter-rows)).

Exit (#106):

- `tools/vectors/SporeLayoutVectors.java` records 4 `shift` rows (`shift/{overlap,compaction}/{corpus,dup5}/default`),
  each with `jitterNodes` > 0, through the recorder's round-trip and stability checks. The regenerated
  `test/golden/refs/java/spore-layout.json` differs from the base only by those 4 rows and `"shift": 4` in `rowCounts`
  (checked by script, [D5](decisions.md#d5-proof-that-the-landed-rows-did-not-move)).
- The port replays all 4 rows at the AD-4 bar: every stop, the engine's end dump, `jitterNodes` and the tie summary
  ([D4](decisions.md#d4-the-port-side-checks)). The raw-bit tally of the new rows is journaled.
- `docs/architecture/alg-packing.md` § 3.2 and its #106 rows, and the PK4 text of `docs/conformance.md`, are current.
- Queue gates 1-7 are green and journaled. One squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (spore-jitter-exact)`; `.agent-notes/spore-jitter-exact.md` is written.

**Not in this mission:**

- Changing, removing or re-shaping the 4 `jitter` rows, or any landed row, count assertion or expected value (AD-13).
- Rows with a non-default `randomSeed`. `randomSeed` 0 means an unseeded `new Random()` (`:132-133`), which cannot be exact.
- Any change to `src/` unless a replay of the new rows shows a port defect (stop 2), any oracle patch, `ELK_COMMIT`, or a
  write to `~/git/knowvah/elk`.
- #108 (NaN rectangles in `sporeOverlap`) and #107 (rectpacking arm).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   `.agent-notes/spore-jitter-exact-planning.md`, and the seeded-shift and stack-frame observations of
   `.agent-notes/elk-pin-move-8bca22f4.md`. Then run `gh issue view 106 --comments`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/spore-jitter-exact .agent-notes/spore-jitter-exact-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add spore-jitter-exact mission brief"`. Record the squash base in
   the journal: the driver's base if the prompt names one, otherwise that commit's parent (`2fbb1e24` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004. That held at planning
   (`builtAt` 2026-11-25T00:05:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it (stop 7).
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.spore plugins/org.eclipse.elk.alg.common`
   was empty at planning; journal the result again.
5. Baseline: the journal's `plan` row. Rerun it only if the base sha differs from `2fbb1e24`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes; no `src/` change is planned. One vector ref gains rows. Each file
is owned by one task:

| File | Action | Task |
| ---- | ---- | ---- |
| `tools/vectors/SporeLayoutVectors.java` (group `shift`, header comment), `tools/vectors/spore-layout-vectors.sh` (header comment only) | Modify | T1 |
| `test/golden/refs/java/spore-layout.json` (by script only) | Regenerate | T1 |
| `test/helpers/spore-replay-rows.ts` (group, type, overload, validation), `src/alg/spore/SporeLayoutVectors.test.ts`, `src/alg/spore/ElkGraphImporter.test.ts` (new `describe` blocks only) | Modify | T2 |
| `src/alg/spore/**` and `src/java/util/Random.ts`, only under stop 2 | Modify | T2 |
| `docs/architecture/alg-packing.md`, `docs/conformance.md`, `plans/alg-packing/decision-journal.md` (one appended row) | Modify | T3 |
| `plans/roadmap.md` (appended section), `.agent-notes/spore-jitter-exact.md`, the journal, this README | Modify / Create | T3 (journal and README: every task) |

No package, env var or database change. Scratch output lives under `$TMPDIR/spore-jitter-exact/` and is never committed.

## Quality gates

After T1 and T2: `npx vitest run src/alg/spore test/helpers/spore-replay-dump.test.ts` (19 files, 849 passed and 1 skipped at
planning), `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity` (read the report, not the exit
code). T3 runs queue gates 1-7 ([T3](batch-3/T3-docs-and-close-out.md)). Before the JVM recorder check `uptime`; above 12,
wait; run it under `nice -n 10`, detached as the queue rules show (about 70 s cold). Start the full suite detached and poll
for at most 9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 1 (a recorder self-check that the jitter path
never ran, such as stepwise vs engine) and stop 2 (a port difference on the shifted centres).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorder group `shift` and the regenerated ref | T1 | — | [x] |
| [2](batch-2/overview.md) | Port replay of the `shift` rows | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Docs, gates, close-out and squash | T3 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The work is serial and small (one recorder, one ref, three test files): the orchestrator runs
all three tasks itself. A subagent is optional for T2 only (`claude`, opus, with the Opus scope compensation of
`~/.claude/rules/model-routing.md` and the T2 file as its prompt); the orchestrator keeps every commit, `gh` call, `plans/`
and `.agent-notes/` write. Commit after each task; T3 squashes.

**Time:** about 2 h. T1 60 min, T2 40 min, T3 50 min (the coverage run dominates).

## Landing

1. Tag the tip `spore-jitter-exact/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with the message of T3 step 8.
   The footer is `Refs: #106`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D6 and the auto-confirmed record.
- [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md),
  [diagrams/data-flow.md](diagrams/data-flow.md).
- Precedent for an additive group: `objects` (T13b of mission 8c), in `ROW_GROUPS` but not `GROUPS`
  (`SporeLayoutVectors.java:228-232`), so `tieSummary` and `optionCoverage` stayed as they were.
- Precedent for exact shift evidence: `stops/overlap/scanlineHitboxes/default` (the `updateGraph` shift,
  `plans/elk-pin-move-8bca22f4/decision-journal.md`, T3 `fix` row of 2026-11-18 09:26).

## Mission summary (2026-11-24)

Completed 2026-11-24: 3 of 3 tasks. No halt, no partial. No stop condition fired on a row: stops 1 and 2, the likeliest, were
not reached.

- **Result.** #106 is done in the additive form: `spore-layout.json` holds 4 exact `shift` rows
  (`shift/{overlap,compaction}/{corpus,dup5}/default`, 11, 11, 1 and 1 shifted centres) beside the unchanged `jitter` rows,
  and the port replays them with 1,357 doubles raw-bit identical and none inexact
  ([decision-journal.md](decision-journal.md), T2 `evidence`).
- **Landed.** The recorder group (`tools/vectors/SporeLayoutVectors.java`, the header line of `spore-layout-vectors.sh`); the
  regenerated ref (340 to 344 rows; D5: 340 byte-identical, header changed by `rowCounts.shift` alone; a cold rerun is
  `cmp`-identical); the group in `test/helpers/spore-replay-rows.ts`; 14 new tests in new `describe` blocks of
  `SporeLayoutVectors.test.ts` and `ElkGraphImporter.test.ts`; the docs (`alg-packing.md` § 2, § 3.2, § 5,
  `conformance.md`); the 8c closing row; the roadmap revision; `.agent-notes/spore-jitter-exact.md`. No `src/` production
  file, landed row, count or assertion changed, and nothing outside the brief's table was written.
- **Not as planned.**
  - The helper's group list went into the T1 commit, not T2: the ref and the list reject each other in either order (T1
    `decision`).
  - The importer test asserts exactly `jitterNodes` vertices off their child centre, where D4 said "at least" (T2
    `evidence`).
  - Extra evidence the brief did not ask for: a mutation check (a wrong seed fails all 8 exact tests) and a cold rerun of
    the recorder against the committed ref.
  - The coverage gate took three runs: two wall-clock timeouts of `test/corpus/phase-sweep.test.ts` under other sessions'
    load, with 0 mismatches (T3 `diagnosis`); nothing was changed between the runs.
- **Decisions.** D0-D6 as planned. D6: the two 8c ref tables are snapshots and stay; a sentence after each gives 340 and
  344.
- **Gates.** Queue gates 1-7 green on the final tree (T3 `gate`): coverage 1,257 files, 51,943 tests passed, 83 skipped,
  98.85 / 97.02 / 98.63 / 98.90; CodeQL with no new accepted entry; refs against the base differ in
  `java/spore-layout.json` alone.
- **Issues.** None filed. #106 has a comment with the result; its labels are unchanged.
- **Planning lesson.** The exact checks of a spore recorder hold on shifted inputs, so a future coincident-centre scenario
  can be planned as an exact row from the start (`.agent-notes/spore-jitter-exact.md`).
