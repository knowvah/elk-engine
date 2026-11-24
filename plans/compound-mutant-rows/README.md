<!-- SPDX-License-Identifier: EPL-2.0 -->

# compound-mutant-rows: mission brief (issue #60)

## Objective

Mission 7h (T15) left 21 mutation survivors over the compound classes. Ten are equivalent. The rest are reached by
rows of `layered-compound.json`, but no recorded field observes them. Issue #60 lists an oracle graph for each one.
This mission:

- rebuilds those mutants;
- records the graphs as new rows of the compound recorder, so every existing row stays byte-identical;
- replays every new row at the AD-4 bar;
- shows for each item that its row kills the mutant.

K9 (the monitor work of `ElkLayered`) gets the recorder aid the issue asks for: a `worked` site mode. There is no
production `src/` change.

The authoritative item list is [items.md](items.md): I1-I7 from the issue's table, and I8 (R1…R12), which is
conditional (D7).

Planning found these facts that the issue does not state:

- 11 of the 13 graphs give a row that the twins test's pinned list `DIFFERING_ROWS` selects. The planning run of
  2026-11-23 parked #60 on that question, and the maintainer requeued it right after ruling the same question on #156.
  [D1](decisions.md#d1-the-twins-list-may-take-this-issues-ids-the-156-ruling-applied-to-60) reads that as the
  ruling. The extension lands as its own commit, and no other pinned list may change.
- The I6 group (R29-R38) is visible only when the layered top-level graph has an ElkNode parent. The recorder's
  stop machinery has never run on such a root. [D3](decisions.md#d3-the-two-models-rows-i3-i6-use-the-existing-stop-machinery-unchanged)
  tries a `sites` row first. Any change to the stop contract is a `needs-ruling` partial.
- #156's withheld patch touches the same recorder, list and ref. D2 keeps the new rows in a separate array, and T6
  tells #156 that its SHA-256 values no longer hold.

Exit (#60):

- Each item I1-I8 has exactly one D6 outcome, recorded in [items.md](items.md) and in a new section appended to
  `plans/layered-compound/unreached.md`.
- Every outcome-1 item has a row in `layered-compound.json`, and its mutants are killed by the D5 test set against
  the new ref.
- Every new row replays at the AD-4 bar. A row that diverges is kept out of the ref (stop 2).
- Every existing row of `layered-compound.json` is byte-identical and in its order (the D5 diff), and every other ref
  is byte-identical (gate 7, after a cold rerun).
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (compound-mutant-rows)`, and `.agent-notes/compound-mutant-rows.md` is written.

**Not in this mission:**

- Any production `src/` change, including a fix for a divergence that a new row exposes (stop 2: `follow-up`).
- Re-recording or editing any existing row, or changing any existing test's expected value. The only exception is
  appending ids to `DIFFERING_ROWS` under D1.
- #156's ten rows. That issue is its own queue item.
- Splitting the recorder (#143). Any oracle patch, `ELK_COMMIT` change, or write to `~/git/knowvah/elk`.
- Mutants or arms outside [items.md](items.md). An input that happens to reach another arm is noted in the journal,
  not searched for.
- The translated `docs-site/` pages.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [items.md](items.md),
   [decision-journal.md](decision-journal.md) and `.agent-notes/compound-mutant-rows-planning.md`. Then read
   `.agent-notes/tree-recorder-gaps.md` (the mutation harness), `.agent-notes/layered-arm-search.md` (the pinned-list
   lesson), the T15 rows of `plans/layered-compound/decision-journal.md` (`:171-178`), and run
   `gh issue view 60 --comments` and `gh issue view 156 --comments`.
3. `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, commit it with
   `git add plans/compound-mutant-rows .agent-notes/compound-mutant-rows-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add compound-mutant-rows mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`e30d1c5c` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (true at planning,
   `builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it. Record the output of
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered plugins/org.eclipse.elk.core`.
   It was empty at planning. A change is journaled, not a stop.
5. Baseline: see the journal's `plan` row. Rerun it only if the base sha differs from `e30d1c5c`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. One ref grows by appended rows. Every file below has one
owning task at a time:

| File | Action | Task |
| ---- | ------ | ---- |
| [items.md](items.md), the journal | Modify | T1, T5 (orchestrator throughout) |
| `tools/vectors/LayeredCompoundVectors.java` (`EVIDENCE_ROWS` and its loop, `evidenceModelSpecs`, mode `worked` / `WorkRecorder`, header comments only) | Modify | T2 → T3 → T4 |
| `tools/vectors/layered-compound-vectors.sh` (comments only, if needed) | Modify | T2 |
| `test/golden/refs/java/layered-compound.json` (by script only) | Modify (append) | T2 → T3 → T4, T6 |
| `src/alg/layered/LayeredCompoundTwins.test.ts` (`DIFFERING_ROWS` append only, D1) | Modify | T2 → T3 → T4 |
| `test/helpers/layered-compound-site-arms.json` | Modify | T2, T3 |
| `test/helpers/layered-compound-replay-sites.ts`, `test/helpers/layered-compound-replay-sites.test.ts` | Modify | T4 |
| `plans/layered-compound/unreached.md` (appended section), `plans/layered-compound/decision-journal.md` (one row) | Modify | T5 |
| `docs/architecture/alg-layered-compound.md`, `docs/conformance.md`, `docs/architecture/elk-upgrade.md` (if needed) | Modify | T5 |
| `plans/roadmap.md`, `.agent-notes/compound-mutant-rows.md`, this README | Modify / Create | T6 |

No new package, env var or database change. Scratch work (mutants, scratch recordings, TS probes) goes under
`$TMPDIR/compound-mutant-rows/` and is never committed.

**The D5 id-keyed diff** (after every regeneration): load the base ref and the new ref, then check four things. Every
base row id is present in the new ref with byte-equal JSON and in the same relative order. The new ids are exactly the
ones this task added, and each is appended after the last base row of its group. The header differs only in
`rowCounts`. `jdk` and `oracle` are unchanged. Keep the script at `$TMPDIR/compound-mutant-rows/d5.mjs`, and journal
its output.

## Quality gates

After each task: its own tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <changed files>`,
the D5 diff, and `git diff --exit-code -- test/golden/refs/ ':!test/golden/refs/java/layered-compound.json'`. T6 runs
queue gates 1-7 ([T6](batch-3/T6-close-out.md)). JVM runs: check `uptime`, wait above 12, and run under `nice -n 10`.
A cold compound recorder run takes about 11 s, so it may stay in the foreground. The full suite is started detached,
as the queue rules show.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire:

- stop 1 for I6, if the stop machinery needs a change for a root without `INCLUDE_CHILDREN`;
- stop 2, a new row that diverges in TS (a partial);
- stop 7, an item's budget running out (outcome 4, push-forward).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Baseline, harness, mutant reconstruction | T1 | — | [x] |
| [2](batch-2/overview.md) | Record the rows (sequential: one recorder, one ref) | T2, T3, T4 | 1 | [x] |
| [3](batch-3/overview.md) | Outcomes and docs; close-out and squash | T5, T6 | 2 | [x] |

## Execution model

Recommended executor: `fable`.

- The orchestrator owns every task, every recorder run, every commit, every `gh` call, `plans/` and `.agent-notes/`.
- D8: the only parallel step is the I5 graph search during T2. Optionally, run one background subagent (`claude`,
  opus, with the Opus scope compensation of `~/.claude/rules/model-routing.md`). Its prompt is the I5 row of
  [items.md](items.md), D5, the T1 mutants and harness path, and the TS replay helpers. It returns candidate graphs
  with TS evidence, and never edits tracked files or runs `git` or `gh`. Check in at least every 9 minutes.
- One commit per task before the squash, plus the separate D1 list commit(s).

**Time:** about 3.5 h. T1 takes 40 min, T2 75 min, T3 45 min, T4 40 min, T5 25 min, and T6 45 min (the coverage run).

## Landing

1. Tag the tip `compound-mutant-rows/pre-squash`.
2. `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>`.
3. The message:
   - Subject: `test(layered): add oracle rows for the 7h compound survivors` (or a better one within 72 characters).
   - Body: per item, the outcome and row id; the `DIFFERING_ROWS` ids added under D1 and their basis (#156 ruling,
     #60 requeue); the `worked` mode; the ref's growth (rows and bytes) and the D5 proof; any `needs-ruling` or
     `follow-up` issue.
   - Footer `Refs: #60`, and the attribution trailer the session's system reminder names.
4. Never push.

## Reference

- [decisions.md](decisions.md): D1-D8 and the auto-confirmed record.
- [items.md](items.md), [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #60 and its parking comment. Issue #156 and its ruling. Precedents: `plans/layered-loops-evidence/` (#55, the
  same shape for 7g), `plans/layered-arm-search/` (#59, the pinned-list stop), `plans/tree-recorder-gaps/` (#66, the
  mutation harness).

## Mission summary (2026-11-23)

Completed 2026-11-23: 6 of 6 tasks. No halt. One partial (stop 4), which left every item at outcome 1.

- **Result.** Each of I1-I8 has outcome 1, recorded ([items.md](items.md); `plans/layered-compound/unreached.md` § "Mutant
  rows (issue #60, compound-mutant-rows)"). 58 one-token mutants were rebuilt: 26 survived every row at the named arms and
  are killed by the new rows; 4 at those arms are equivalent (D14b, D14c, F11, F20, argued in items.md); 24 were killed at
  base (first guesses); 4 are equivalent as 7h's G21 and G22 (`exported` → `true`).
- **Landed.** 17 `sites` rows in a new `EVIDENCE_ROWS` array of the compound recorder (`layered-compound.json`: 557 rows,
  12,575,221 bytes, every earlier row byte-identical); the site mode `worked` with `WorkRecorder` on both sides and
  `replayWorkedSite`; 33 arm-table entries for 16 rows; nine ids in the twins list (D1); the docs rows; the appended 7h
  records; the roadmap revision; `.agent-notes/compound-mutant-rows.md`. No production `src/` file changed.
- **Not as planned.**
  - I3 and I6 landed as `sites` rows (`mergedThickness`, `resizerTopLevel{Child,Width,Height}`), not as `models` rows: a
    test pins the `models` group to ten preprocessor stops (T3 `stop`, issue #165, patch in `withheld/`).
  - I6 has three rows: the rebuilt mutants of the two guard operands need a graph that grows on one axis only (T1).
  - I8 got its row. D7 read literally gives outcome 5, but the same class test kills I6's mutants at base, and the issue
    asks for oracle rows; both groups were decided on the row suites (T1 `decision`). **Flagged for review**: drop the one
    `nonSquarePort` entry if D7 was meant literally.
  - G18 is not at the arm items.md names (the merge arm of `introduceHierarchicalEdgeSegment`): the survivor is the guard on
    the push in the caller (`CompoundGraphPreprocessorSegments.ts:298`).
  - `recursiveWork` uses the graph of `fixedSideOut`, not Sc4, so that it adds no id to the twins list (T4).
  - No I5 subagent: the issue's five graphs separated every flow mutant in the first probe.
- **Decisions.** D1-D8 as planned, D3 ending in the sites form and D7 as above. D1: nine ids, in two separate commits of
  the pre-squash history (`293df228`, `b286f156`); **flagged for review**, because the basis is the requeue of #60 after the
  #156 ruling, not a written ruling on #60.
- **Gates.** Queue gates 1-7 green on the final tree (journal, T6 `gate`): coverage 1,195 files, 49,611 tests, 98.81 /
  97.01 / 98.56 / 98.86; CodeQL with no new accepted entry; the ref against the base: 17 appended rows and `rowCounts`.
- **Issues.** #165 (`needs-ruling`, the pinned count of preprocessor stops). Comments: #156 (hand-off), #60 (hand-back).
  No follow-up issue.
- **Planning lesson.** The brief listed one pinned list over compound rows; a pinned count met the `models` rows. A scratch
  recording of one row per group at planning time, followed by the whole suite, would have shown it.
