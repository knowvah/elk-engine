<!-- SPDX-License-Identifier: EPL-2.0 -->

# tree-recorder-gaps: mission brief (issue #66)

## Objective

Issue #66 lists the follow-ups of mission 8a's mutation spot check and coverage closure (T19). None blocks the port.
Each one is a recorder scenario that would turn a Java-traced test or a mutant no recorded field observes into oracle
evidence, for `alg.radial`, `alg.vertiflex` and `alg.mrtree`. This mission adds those scenarios to the three
recorders, records them into **new** ref files, replays every new row at the AD-4 bar, and shows for each item that
its row takes the arm or kills the mutant. There is no production `src/` change.

The authoritative item list, with the Java and TS sites and the leads found at planning, is [items.md](items.md):
11 items (radial R-a to R-d, vertiflex V-a and V-b, mrtree M-a to M-d) plus M-e, the dump extension, which is a
`needs-ruling` part ([D5](decisions.md#d5-the-dump-extension-is-a-needs-ruling-part)).

Planning found three facts the issue does not state:

- `radial.json` (309 ids, `test/helpers/radial-replay-rows.test.ts:71`) and `vertiflex.json` (247 / 216 / 8,
  `test/helpers/vertiflex-replay-rows.test.ts:42`) have their counts pinned by committed tests. Appending rows to
  them is an AD-13 STOP, as it was for #156. So each new row goes into a new file ([D1](decisions.md#d1-three-new-ref-files-existing-refs-byte-identical)).
- `mrtree-extra.json` is 8,117,818 bytes against its 8 MiB cap (`MrTreeVectors.java:234`), so the mrtree rows go into a third
  file as well.
- The dump extension (issue bullet 4) cannot land without re-recording `mrtree.json` and `mrtree-extra.json` and changing the
  frozen count `UNRESTORABLE_GRAPHS = 27` (`test/helpers/mrtree-replay-dump.test.ts:62`). Changing that count is an AD-13 STOP.

Exit (#66):

- Each of the 11 items has exactly one outcome ([D4](decisions.md#d4-one-outcome-per-item-and-the-evidence-for-it)),
  recorded in [items.md](items.md) and in a new section appended to `plans/alg-trees/unreached.md`.
- Every outcome-1 item has a row in `radial-extra.json`, `vertiflex-extra.json` or `mrtree-extra2.json`. Its evidence is
  the D4 check: a scoped coverage run that shows the arm, or a mutation run that shows the kill.
- Every row of the three new refs replays at the AD-4 bar. A row that diverges is kept out of the ref (stop 2).
- `radial.json`, `vertiflex.json`, `mrtree.json`, `mrtree-extra.json` and `mrtree-units.json` are byte-identical
  (gate 7, after cold reruns).
- M-e is filed as a `needs-ruling` issue (T1), and the brief names that issue. Filed: #161.
- Queue gates 1-7 are green and journaled. There is one squashed commit on the base. `plans/roadmap.md` gains
  `## Revision <date> (tree-recorder-gaps)`, and `.agent-notes/tree-recorder-gaps.md` is written.

**Not in this mission:**

- Any production `src/` change, including a fix for a divergence a new row exposes (stop 2: `follow-up`).
- Re-recording or editing any landed ref, or changing an existing test's expected value or count. The only edit to an
  existing test file is appending `'mrtree-extra2.json'` to `REF_FILES` in `src/alg/mrtree/MrTreeVectors.test.ts`, plus its
  comment.
- The mrtree dump extension itself (M-e), and any change to the stop-dump contract of any recorder.
- Splitting the recorders (#143), any oracle patch, `ELK_COMMIT` change or write to `~/git/knowvah/elk`.
- Arms outside the 11 items. An input that happens to reach another arm is noted in the journal, not searched for.
- The translated `docs-site/` pages.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [items.md](items.md),
   [decision-journal.md](decision-journal.md) and `.agent-notes/tree-recorder-gaps-planning.md`. Also read
   `.agent-notes/alg-trees.md` (the mutation kill timer, root-only options, dump limits) and
   `.agent-notes/vector-cache-and-key-line.md`. Then read `plans/alg-trees/unreached.md` and the T19 rows of
   `plans/alg-trees/decision-journal.md` (lines 85-99), and run `gh issue view 66 --comments`.
3. `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, commit it with
   `git add plans/tree-recorder-gaps .agent-notes/tree-recorder-gaps-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add tree-recorder-gaps mission brief"`. Record the squash base
   in the journal: the driver's base if the prompt names one, else that commit's parent (`70d9abed` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (true at planning,
   `builtAt` 2026-11-21T05:47:58Z). Otherwise rebuild with `tools/oracle/build.sh` and journal it. Record the output of
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.mrtree plugins/org.eclipse.elk.alg.radial plugins/org.eclipse.elk.alg.vertiflex plugins/org.eclipse.elk.core`.
   It was empty at planning. A change is journaled, not a stop.
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `70d9abed`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. Every file below is owned by one task:

| File | Action | Task |
| ---- | ------ | ---- |
| [items.md](items.md) (outcome column), the journal | Modify | T1 (and the orchestrator for T2-T4 reports) |
| `tools/vectors/RadialVectors.java` (a second plan and output only), `tools/vectors/radial-vectors.sh` (comments only) | Modify | T2 |
| `test/golden/refs/java/radial-extra.json` (by script) | Create | T2 |
| `src/alg/radial/RadialExtraVectors.test.ts`; `test/helpers/radial-replay-rows.ts` (a path helper only, if needed) | Create / Modify | T2 |
| `tools/vectors/VertiFlexVectors.java` (a second plan and output only), `tools/vectors/vertiflex-vectors.sh` (comments only) | Modify | T3 |
| `test/golden/refs/java/vertiflex-extra.json` (by script) | Create | T3 |
| `src/alg/vertiflex/VertiFlexExtraVectors.test.ts`; `test/helpers/vertiflex-replay-rows.ts` (a path helper only, if needed) | Create / Modify | T3 |
| `tools/vectors/MrTreeVectors.java` (a third plan and output only), `tools/vectors/mrtree-vectors.sh` (comments only) | Modify | T4 |
| `test/golden/refs/java/mrtree-extra2.json` (by script) | Create | T4 |
| `src/alg/mrtree/MrTreeVectors.test.ts` (append to `REF_FILES` and its comment); `test/helpers/mrtree-replay-rows.ts` (a path helper only, if needed) | Modify | T4 |
| `plans/alg-trees/unreached.md` (new section appended), `plans/alg-trees/decision-journal.md` (one closing row) | Modify | T5 |
| `docs/conformance.md` (the trees ref table near line 1832), `docs/architecture/alg-trees.md` (ref table near line 117, regen commands near line 309), `docs/architecture/elk-upgrade.md` (§ 7 outputs of the three scripts) | Modify | T5 |
| `plans/roadmap.md`, `.agent-notes/tree-recorder-gaps.md`, this README | Modify / Create | T6 |

No new package, env var or database change. Search and mutation scratch work goes under `$TMPDIR/tree-recorder-gaps/<bundle>/`
and is never committed.

## Quality gates

After each task: its own tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <changed files>`, and
`git diff --exit-code -- test/golden/refs/java/{radial,vertiflex,mrtree,mrtree-extra,mrtree-units}.json`. T6 runs queue gates
1-7 ([T6](batch-3/T6-close-out.md)). JVM runs: check `uptime`, wait above 12, run under `nice -n 10`. A cold tree recorder run
takes 3-6 s (`docs/architecture/elk-upgrade.md` § 7), so those runs may stay in the foreground. The full suite is started
detached, as the queue rules show.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 7 (an item's budget runs out, which makes it
outcome 4: push-forward, not a stop) and stop 2 (a new row diverges in TS: a partial).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Baseline, the needs-ruling issue, the mutation harness | T1 | — | [x] |
| [2](batch-2/overview.md) | Scenarios, new refs and replays (parallel, one per bundle) | T2, T3, T4 | 1 | [x] |
| [3](batch-3/overview.md) | Outcomes and docs; close-out and squash | T5, T6 | 2 | [x] |

## Execution model

Recommended executor: `fable`.

- The orchestrator owns T1, T5 and T6, the final regeneration of every ref, every commit, every `gh` call, `plans/` and
  `.agent-notes/`.
- T2, T3 and T4 have disjoint write-sets. Run them as three parallel background subagents (`claude`, opus, with the Opus
  scope compensation of `~/.claude/rules/model-routing.md`). Each prompt is its task file, plus D1-D8, its bundle's rows of
  [items.md](items.md), the T1 harness path and the planning notes. A subagent records into
  `$TMPDIR/tree-recorder-gaps/<bundle>/out/` and copies only its new file into `test/golden/refs/java/`. It never runs the
  full suite, `git commit` or `gh`. Its final report gives, per item: the outcome, the row ids, the D4 evidence output, or
  the proof or closest approach.
- Track each item's budget (D4) from the subagent's spawn time. Check in at least every 9 minutes.
- One commit per task before the squash.

**Time:** about 4 h. T1 takes 30 min, T2-T4 run in parallel within their budgets (at most 2.5 h), T5 takes 30 min, and T6
takes 45 min (the coverage run).

## Landing

1. Tag the tip `tree-recorder-gaps/pre-squash`.
2. `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>`.
3. The message:
   - Subject: `test(trees): add oracle rows for the 8a mutants and unrecorded arms` (or a better one within 72 characters).
   - Body: per bundle, how many items got each outcome; each outcome-1 item's row id; for outcome 3 a one-line proof,
     for outcome 4 the closest approach. Then the byte-identity proof of the five landed refs, and the `needs-ruling`
     (M-e) and any `follow-up` issue.
   - Footer `Refs: #66`, and the attribution trailer the session's system reminder names.
4. Never push.

## Reference

- [decisions.md](decisions.md): D1-D8 and the auto-confirmed record.
- [items.md](items.md), [stop-conditions.md](stop-conditions.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #66. Precedents: `plans/layered-arm-search/` (#59, the outcome scheme; #156, the pinned-list STOP) and
  `plans/alg-trees/` (8a; T19 rows of its journal).

## Mission summary (2026-11-23)

Completed 2026-11-23: 6 of 6 tasks. No halt, no partial apart from the planned `needs-ruling` part (M-e).

- **Result.** Each of the 11 items has one outcome ([items.md](items.md); `plans/alg-trees/unreached.md` § "tree-recorder-gaps
  (#66)"): recorded 9 (R-a, R-b, R-c, R-d, V-a, V-b, M-a, M-b, M-d), proven 1 (M-c, a mutant equivalent under V8), diverging 0,
  unreached 0. M-e is `needs-ruling` #161 and was not worked.
- **Landed.** `radial-extra.json` (7 rows), `vertiflex-extra.json` (4) and `mrtree-extra2.json` (3) with their recorder plans;
  `RadialExtraVectors.test.ts`, `VertiFlexExtraVectors.test.ts` and `'mrtree-extra2.json'` in `REF_FILES`; two path helpers;
  the doc tables; the appended 8a records; the roadmap revision; `.agent-notes/tree-recorder-gaps.md`. The five landed tree
  refs are byte-identical after cold reruns. No production `src/` file changed.
- **Not as planned.** M-b needed no row: three landed rows of `mrtree-extra.json` take the arm, in the port and on the oracle
  (T1 `finding`). M-c needed no row either: the mutant cannot be killed on V8, and the tie it was thought to need is already
  recorded (T4 `decision`). M-a's arm list came from T1's coverage runs and differs from the issue's wording (T1 `baseline`).
  The subagents ran in the foreground (headless session), not in the background.
- **Decisions.** D1-D8 as planned. Journaled push-forwards: the harness's lock, refusal and `MUTATE_T` filter (T1); R-d as
  three sub-mutants (T1); stops-only rows for mrtree and no row for the LEFT end-point arm (T4); a tie row tried and removed as
  redundant (T4); the vertical side counter's Java lines corrected to `EdgeRouter.java:270-274` (T4 `correction`); a CodeQL
  finding in the new recorder helper fixed, not accepted (T6 `fix`).
- **Gates.** Queue gates 1-7 green on the final tree (journal, T6 `gate`): coverage 1,195 files, 49,568 tests, 98.81 / 97.01 /
  98.56 / 98.86; refs against the base: three added files, nothing else. One coverage run in between lost two tests to
  timeouts under another session's load (T6 `divergence`); the rerun at normal load is green.
- **Issues.** #161 (`needs-ruling`, the dump extension). Follow-ups: #163 (two mrtree `EdgeRouter` arms still without
  recorded evidence), #164 (a disco test without a timeout). A comment on #65 adds an upstream radial defect (`overlap` and
  exactly equal tops) with a repro and an upstream draft.
- **Planning lesson.** Two of the issue's premises were stale (M-b, the M-c tie). A scoped coverage run of the landed replay
  per item at planning time would have shown both (`.agent-notes/tree-recorder-gaps.md`).
