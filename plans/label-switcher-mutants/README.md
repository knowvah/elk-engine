<!-- SPDX-License-Identifier: EPL-2.0 -->

# label-switcher-mutants: mission brief (issue #48)

## Objective

Mission 7f2 (`plans/layered-labels/decision-journal.md`, T17a row) left **five mutation survivors** in
`src/alg/layered/intermediate/LabelDummySwitcherSpaceEfficient.ts` (A3, A6, A7, A9, A10), all equivalent on the one
recorded `SPACE_EFFICIENT_LAYER` row `sites/LabelDummySwitcher/spaceEfficient`. Kill them with new oracle-recorded
site rows and anchored cases (issue #48).

The A-labels cannot be recovered: 7f2 kept its mutants in a scratch copy and journaled only the labels and the
count (11 of 16 killed). This mission therefore fixes a **reproducible mutant set**, [mutants.md](mutants.md)
M1-M18, which covers every decision point of the file and so contains every mutant 7f2 could have made there (D1).

Exit (#48 "Done when", read through D1):

- Every mutant in [mutants.md](mutants.md) is `killed` by the kill suite (D2), or `equivalent` with a proof from the
  code and the oracle (D6). "No row tells them apart" is not a proof.
- The new rows are recorded by `tools/vectors/layered-labels-vectors.sh` from the oracle (AD-13). Every row already
  in `test/golden/refs/java/layered-labels.json` stays byte-identical (D4).
- Each new row replays green in `LayeredLabelsVectors.test.ts` and has at least one anchored case in
  `LabelDummySwitcherSites.test.ts`, with literals copied from the row (D5).
- Queue gates 1-7 are green and journaled. One squashed commit sits on the base. `plans/roadmap.md` gains
  `## Revision <date> (label-switcher-mutants)`, and `.agent-notes/label-switcher-mutants.md` is written if anything
  is novel.

**Not in this mission:** mutation of any other `LabelDummySwitcher*` file; the other label strategies; a mutation
tool dependency (D1 rejects one); any `src/` change other than a diagnosed port defect (stop 5); the #55 graphs
(self-loops, wrapping, compaction).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [mutants.md](mutants.md),
   [decision-journal.md](decision-journal.md), `.agent-notes/label-switcher-mutants-planning.md`,
   `.agent-notes/layered-labels.md`, and `plans/layered-labels/unreached.md` rows Sc13 and `:153`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/label-switcher-mutants .agent-notes/label-switcher-mutants-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add label-switcher-mutants mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`bc7250e5` at planning).
4. Check that `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (it did at planning). Run
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered plugins/org.eclipse.elk.core`
   and journal the result.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own tests, `npm run typecheck`, `npx prettier --check <changed files>`, `npm run complexity`.
T4 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --stat <base> -- test/golden/refs/                       # gate 7: only layered-labels.json, append-only (D4)
```

**JVM use.** T1 may run one oracle probe (D6's layer-size check). T2 runs the labels recorder: cold
(`ELK_VECTORS_CACHE=off`), then warm for a byte-identical second run. Check `uptime` first (above 12, wait) and run
under `nice -n 10`, detached as the queue rules show. A cold run took about 48 s at 7f2.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The most likely to fire are stop 4 (an existing row changes bytes after
the recorder edit) and stop 5 (a new row does not replay: a port defect).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Mutant baseline and the layer-size check | T1 | — | [x] |
| [2](batch-2/overview.md) | Design and record the discriminating site rows | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Anchored cases and the mutation rerun | T3 | 2 | [x] |
| [4](batch-4/overview.md) | Close-out: gates, roadmap, notes, squash | T4 | 3 | [x] |

## Execution model

Recommended executor: `fable`. The chain is strictly sequential: each task needs the previous one's output. The
orchestrator owns every commit, every `gh` call, every JVM run, `plans/` and `.agent-notes/`. T3's anchored cases may
go to a `test-automator` or `typescript-pro` subagent (sonnet) with the T3 file as its brief. Subagents never commit,
never run `npm run coverage` (shared `coverage/`), and never start a JVM. Mutation runs happen only in a scratch
copy under `$TMPDIR` (D3), never in the worktree.

## Landing

Subject `test(layered): kill space-efficient label switcher mutation survivors` (≤ 72, lowercase), or
`fix(layered): …` if stop 5 led to a port fix. The body gives the why: 7f2's five survivors, the unrecoverable labels
and D1's superset, the rows added and what each discriminates, and the counts (killed / equivalent). It names the ref
change (append-only, `rowCounts.sites` old → new) and every issue filed. Footer `Refs: #48`, no attribution lines
(queue rule). Tag `label-switcher-mutants/pre-squash`, run `git reset --soft <base>`, and make one commit with
`git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [mutants.md](mutants.md) ·
[decision-journal.md](decision-journal.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-19): halted at T4, gate 4

**Done: T1, T2, T3. T4 is halted on #124.** Base `bc7250e5c12e97c6f4c715d3d4d277548533596b`; the task commits are on
`chore/issue-queue`, not squashed.

- **T1.** Baseline of the mutant set against the kill suite; eleven mutants added for decision points planning's
  table missed (M19-M29, 29 in all): 19 killed, 10 survived. D6's fact is shown on the oracle and from the code:
  every layer's `getSize().x` is 0 when the switcher runs.
- **T2.** Two site rows recorded, `sites/LabelDummySwitcher/spaceEfficient-fitsAndTies` and `…-vertical`; the ref
  change is append-only (0 of 1,305 earlier rows differ, `rowCounts.sites` 42 → 44, 14,353,655 bytes); the literal D4
  names follows the header. A third row, for M11, needs a NaN spacing that the recorder refuses (#123).
- **T3.** Eight anchored cases, additions only. Rerun: **26 killed, 2 equivalent with proofs (M1, M5), 1 open (M11)**;
  of planning's M1-M18: 15 killed, 2 equivalent, 1 open ([mutants.md](mutants.md)).
- **T4 (halted).** Gates 1-3, 5, 6 green; gate 7's proof holds and the recorder rerun is byte-identical to the ref.
  **Gate 4 is red by one test**: `test/helpers/layered-labels-replay-rows.test.ts:96` pins `sites: 42` a second time,
  and D4 names only its twin. AD-13 makes that edit the maintainer's (#124). 49,304 other tests pass.

**Left after a yes on #124:** `sites: 42` → `44` at `:96`; gate 4; the roadmap revision; the tag
`label-switcher-mutants/pre-squash` and the squash.

**Decisions for review:** the added mutants M19-M29 (journal, 19:37); `elk.direction=DOWN` on the second row (19:46);
the two doc files outside the write-set (20:05); the second light JVM run of T1, a javac pass (19:42).

**Issues filed:** #123 (`needs-ruling`: M11 differs from the Java only on a NaN potential width, and a recorder
refuses NaN), #124 (`needs-ruling`: the second `sites` literal; halts the mission), #125 (`follow-up`: 7f2's T17b
survivors are equivalent only on their row).

## Mission summary (2026-11-20): done

**Done: 4 of 4 tasks (T1-T4).** The summary above is the halt of 2026-11-19 and is kept as written; this one closes
the mission. Base `bc7250e5c12e97c6f4c715d3d4d277548533596b`.

- **#124 ruled yes** (maintainer, 2026-11-20): `test/helpers/layered-labels-replay-rows.test.ts:96` follows the
  recorder header, `sites: 42` → `44`, journaled as `ad13`. No other assertion changed.
- **Result.** 29 one-edit mutants ([mutants.md](mutants.md)): **26 killed, 2 equivalent with proofs (M1, M5), 1 open
  (M11, #123)**; 19 killed before. Of planning's M1-M18: 15 killed, 2 equivalent, 1 open. Two site rows
  (`…/spaceEfficient-fitsAndTies`, `…/spaceEfficient-vertical`) and eight anchored cases; no `src/` change.
- **Gates 1-7 green on the final tree** (journal, 2026-11-20 13:25): 1,173 files and 49,305 tests passed, 93 skipped,
  0 failed; coverage 98.81 / 96.99 / 98.56 / 98.86; 200 typedoc warnings (200 at the base); CodeQL clean, no new
  accepted entry; the ref change is append-only (0 of 1,305 base rows differ, `rowCounts.sites` 42 → 44) and a cold
  recorder rerun is byte-identical to the landed ref.
- **Exit criteria.** Met except "every mutant killed or equivalent" for M11, which is `open` by stop 6 and waits on
  #123; the driver's rule for a question that blocks only some rows applies (file it, leave the row, finish the rest).

**Decisions for review:** as listed in the summary above, plus the two `ad13` rows (journal, 2026-11-19 19:53 and
2026-11-20 13:12).

**Issues:** #123 (`needs-ruling`, open: M11 and the NaN row), #124 (ruled yes, edit landed here), #125 (`follow-up`:
7f2's T17b survivors). Landing: tag `label-switcher-mutants/pre-squash`, then one commit on the base, `Refs: #48`.
