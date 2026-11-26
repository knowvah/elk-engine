<!-- SPDX-License-Identifier: EPL-2.0 -->

# rectpacking-open-arm: mission brief (issue #81)

## Objective

Mission 8c left one rectpacking arm neither reached nor proven dead: `Compaction.java:364`, the early `return false` in
`placeBeside` (port `src/alg/rectpacking/p2packing/CompactionPlacement.ts:117`). #81 asks for "a constructive input (then an
additive recorder row …) or a proof from the Java (then a `U` row)". 8c searched at `8aaa3c14`. Since then the pin has moved to
`8bca22f4`, which carries eclipse-elk/elk#1239. Planning found that #1239 removes the only route to a multi-rect `nextBlock` in
`placeBeside`, and the arm needs one. This mission proves that from the Java first, and supports it with an instrumented search and
an oracle cross-check ([D1](decisions.md#d1-try-the-proof-first-from-a-planning-hypothesis),
[D2](decisions.md#d2-supporting-evidence-for-a-proof)). If the proof breaks, the mission records the input on the oracle instead
([D4](decisions.md#d4-if-the-proof-breaks-record-the-input-in-a-new-ref-file)).

Exit (#81):

- **Done (D3).** Lemmas L1-L5 are proven at `8bca22f4`, each with Java file:line and `sg` enumerations with positive controls. The
  search of at least 100,000 flag-on inputs has zero violations and zero arm hits. At least 1,000 cross-checked inputs are equal
  to the oracle at 1e-6. `plans/alg-packing/unreached.md` ends with an addendum holding `U` row 19.
- **Or done (D4).** A shrunk input reaches the arm on the oracle. It is recorded by script into a new
  `test/golden/refs/java/rectpacking-extra.json` and replayed by a new test. `rectpacking.json` stays byte-identical.
- **Otherwise a partial (D5).** The narrowed state lands, and the summary says partial.
- On every branch:
  - The five doc sentences that call the arm open (`docs/conformance.md`, `docs/architecture/alg-packing.md`) are current.
  - One row is appended to `plans/alg-packing/decision-journal.md`, and #81 has a comment.
  - Queue gates 1-7 are green and journaled, and there is one squashed commit on the base with `Refs: #81`.
  - `plans/roadmap.md` gains `## Revision <date> (rectpacking-open-arm)`.

**Not in this mission:**

- #73 (the non-terminating inputs): the search only guards against them.
- #78 (`calculateBlockStacks`), #107 (the other rectpacking arm), and any change to rectpacking behaviour.
- Any change to a non-test `src/` file, to a landed ref, vector, golden or expected value, to an oracle patch or to `ELK_COMMIT`.
- Any write to `~/git/knowvah/elk`, and any upstream issue (pure dead code is not filed, D3).
- Re-measuring the arm at `8aaa3c14`. It is optional, and a push-forward ([stop-conditions.md](stop-conditions.md)).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md) and
   `.agent-notes/rectpacking-open-arm-planning.md`. Then read `plans/alg-packing/unreached.md` (the `U` table and `:77-83`) and
   `plans/alg-packing/decision-journal.md:71-73`. Then run `gh issue view 81 --comments` and `gh issue view 73`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/rectpacking-open-arm .agent-notes/rectpacking-open-arm-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add rectpacking-open-arm mission brief"`. Record the squash base in the
   journal: the driver's base if the prompt names one, otherwise that commit's parent (`e8ae1428` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004. That held at planning.
   Otherwise follow stop 2.
5. Baseline: see the journal's `plan` rows. Rerun it only if the base sha differs from `e8ae1428`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. Under D3 and D5 the mission changes only docs and plans text. Under D4
it adds a recorder plan, a ref file and a test, and changes no landed expectation.

| File | Action | Task |
| ---- | ---- | ---- |
| This mission's journal, the README batch table and summary | Modify | T1, T2, T3 |
| `$TMPDIR/rectpacking-open-arm/**` (snapshot, search, logs; never committed) | Create | T1 |
| `plans/alg-packing/unreached.md` (appended addendum), `plans/alg-packing/decision-journal.md` (one appended row) | Modify | T2 |
| `docs/conformance.md` (`:2279`, `:2403-2404`), `docs/architecture/alg-packing.md` (`:23`, `:260`, `:534`) | Modify | T2 |
| D4 only: `tools/vectors/RectPackingVectors.java`, `tools/vectors/rectpacking-vectors.sh`, `test/golden/refs/java/rectpacking-extra.json` (new), `src/alg/rectpacking/RectPackingExtraVectors.test.ts` (new), `test/helpers/rectpacking-replay-rows.ts` (optional parameter) | Modify / Create | T2 |
| `plans/roadmap.md` (appended section), `.agent-notes/rectpacking-open-arm.md` | Modify / Create | T3 |

No package, env var or database change.

## Quality gates

- After T2, run `npx prettier --check <changed files>` and `npm run docs:build`. Under D4, also run
  `npx vitest run src/alg/rectpacking test/helpers/rectpacking-replay-dump.test.ts` (33 files and 207 tests at planning, plus the
  new file) and `npm run typecheck`.
- T3 runs queue gates 1-7 ([T3](batch-2/T3-close-out.md)).
- Before a JVM run, check `uptime`, wait while it is above 12, and run under `nice -n 10`.
- Start the search, the cross-check and the coverage run detached with `nohup ... ; echo "exit $?"`, and poll for at most
  9 minutes at a time.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 7 (a cross-checked input exposes a port difference)
and stop 8 (time, which leads to D5).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Proof, search, oracle cross-check | T1 | — | [x] |
| [2](batch-2/overview.md) | Records; gates, roadmap and squash | T2, T3 | 1 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns all three tasks, every commit and every `gh` call. No subagents: the work is
sequential (proof, then search, then records) and touches few files.

**Time:** about 3 h under D3 or D5. T1 takes up to 3 h of budget (90 min of proof, 60 min of search and 30 min of cross-check;
the search and the cross-check run detached while the proof rows are written). T2 takes 40 min, T3 60 min. D4 adds about 50 min
to T2.

## Landing

1. Tag the tip `rectpacking-open-arm/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with T3's message. The footer is
   `Refs: #81`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D6 and the auto-confirmed record.
- [stop-conditions.md](stop-conditions.md), [diagrams/data-flow.md](diagrams/data-flow.md) and
  [diagrams/component-map.md](diagrams/component-map.md).
- Precedents:
  - `plans/alg-packing/unreached.md`: the `U` row format, and row 9 as a proof by control flow.
  - `plans/tree-recorder-gaps/decisions.md` D1-D3: a new ref file instead of appending to a pinned one.
  - `plans/spore-recursion-depth/`: the queue brief shape, and an appended closing row in `plans/alg-packing/decision-journal.md`.

## Mission summary (2026-11-24)

Completed 2026-11-24: 3 of 3 tasks, branch D3 (a proof, not a partial). No halt. One gate rerun (coverage, machine load).

- **Result.** `Compaction.java:364-365` is dead at the pin `8bca22f4`: lemmas L1-L5 hold
  ([decision-journal.md](decision-journal.md), the five `lemma` rows; [evidence.md](evidence.md) § 2), L1 corrected to "at
  most one rect". The arm is `U` row 19 in the addendum of `plans/alg-packing/unreached.md`.
- **Evidence.** `ast-grep` enumerations with positive controls for every "only" claim (evidence § 3). Search: 1,000,000
  seeded flag-on inputs, 4,717,461 flag-on `placeBeside` calls (1,418,504 with `shouldRowHeigthBeReevalauted`), 0
  violations, 0 arm hits, 0 timeouts (the brief asked for 100,000). Cross-check: 1,200 inputs equal to the oracle at 1e-6 (the brief
  asked for 1,000).
- **Landed.** The addendum; the closing row in `plans/alg-packing/decision-journal.md`; the five doc sentences
  (`docs/conformance.md`, `docs/architecture/alg-packing.md`); the roadmap revision; `.agent-notes/rectpacking-open-arm.md`;
  a comment on #81 (labels unchanged). No `src/` file and no landed ref, vector, golden or assertion changed.
- **Not as planned.**
  - `evidence.md` is a new file of this brief: the proof, the hit lists and the harness texts do not fit journal cells
    (T1 `deviation`).
  - The search ran batch child processes under a per-input watchdog, not one process per input (T1 `decision`), with a
    second probe for the invariants of L2-L4.
  - The old-pin explanation is shown on the port by a mutant control (the line of #1239 removed): the optional push-forward
    of the stop conditions, done without a build at `8aaa3c14`.
  - The first cross-check comparison reported 557 option-key differences from the scratch script's registry (T1
    `diagnosis`); fixed in the script, no input dropped.
  - The first coverage run failed on five timeouts under a load average of 263 from other sessions (T3 `diagnosis`); the
    second passed with the base's numbers.
- **Decisions.** D0-D6 as planned; D4 and D5 not taken. Push-forwards: the harness shape, the cross-check tool
  (`tools/oracle/run.sh --cases`), the wording of the rows, the mutant control.
- **Gates.** Queue gates 1-7 green: format, typecheck, complexity (no violation); coverage 1,222 files, 50,706 tests,
  98.82 / 97.01 / 98.57 / 98.86; docs build; CodeQL with no new accepted entry; `test/golden/refs/` untouched against the
  base.
- **Open.** #107 (not worked here): L4 gives `rows.size() > nextRowIndex` at `Compaction.java:325` and `:416`. No issue
  was filed.
