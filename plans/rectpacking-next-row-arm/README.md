<!-- SPDX-License-Identifier: EPL-2.0 -->

# rectpacking-next-row-arm: mission brief (issue #107)

## Objective

Since eclipse-elk/elk#1239 (in the pin `8bca22f4`), no recorded row reaches the false arm of `if (rows.size() > nextRowIndex)`
in `placeBelow` (`Compaction.java:325`) and `placeBeside` (`:416`). In the port both sites share `removeFromNextRow`
(`src/alg/rectpacking/p2packing/CompactionPlacement.ts:55`), with 1017 taken and 0 not taken. #107 asks for "a constructive
input that reaches the arm at `8bca22f4` (then an additive recorder row), or a proof from the Java that it is dead (then a `U`
row in `plans/alg-packing/unreached.md`)". Mission `rectpacking-open-arm` (#81) proved invariant **I** at the pin: a block's
parent row is the row that holds it, so `wasFromNextRow` picks the first block of `rows.get(nextRowIndex)`. This mission proves
the two guards always true from **I**, for both values of `rowHeightReevaluation`
([D1](decisions.md#d1-prove-first-from-invariant-i)). It supports the proof with an instrumented search and an oracle
cross-check ([D2](decisions.md#d2-supporting-evidence)). If the proof breaks, the mission records the input on the oracle
instead ([D4](decisions.md#d4-if-the-proof-breaks-record-the-input-in-a-new-ref-file)).

Exit (#107):

- **Done (D3).** Lemmas N1-N4 are proven at `8bca22f4` with Java file:line, and every "only" claim has an `ast-grep`
  enumeration with a positive control. The search of at least 100,000 inputs (both flag values) has zero violations and zero
  false-arm hits. The mutant control reaches the arm. At least 1,000 cross-checked inputs equal the oracle at 1e-6.
  `plans/alg-packing/unreached.md` ends with a `#107` addendum holding `U` row 20.
- **Or done (D4).** A shrunk input reaches the arm on the oracle. It is recorded by script into a new
  `test/golden/refs/java/rectpacking-extra.json` and replayed by a new test. `rectpacking.json` stays byte-identical.
- **Otherwise a partial (D5).** The narrowed state lands, and the summary says partial.
- On every branch:
  - The doc sentences about the arm are current (`docs/conformance.md`, `docs/architecture/alg-packing.md`).
  - One row is appended to `plans/alg-packing/decision-journal.md`, and #107 has a comment.
  - Queue gates 1-7 are green and journaled, and there is one squashed commit on the base with `Refs: #107`.
  - `plans/roadmap.md` gains `## Revision <date> (rectpacking-next-row-arm)`.

**Not in this mission:**

- `Compaction.java:127` (the guard of the empty-`nextBlock` branch, `Compaction.ts:181`), #73, #78, #80, and any change to
  rectpacking behaviour.
- Any change to a non-test `src/` file, to a landed ref, vector, golden or expected value, to an oracle patch or to `ELK_COMMIT`.
- Any write to `~/git/knowvah/elk`, and any upstream issue (pure dead code is not filed, D3).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md) and
   `.agent-notes/rectpacking-next-row-arm-planning.md`. Then read `plans/rectpacking-open-arm/evidence.md` § 2 (L3, L4), § 3
   (enumerations E2, E3, E6, E8) and § 6 (the harness), and `.agent-notes/rectpacking-open-arm.md`. Then run
   `gh issue view 107 --comments`.
3. Check that `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, run
   `git add plans/rectpacking-next-row-arm .agent-notes/rectpacking-next-row-arm-planning.md`, then
   `git -c commit.gpgsign=false commit -m "docs(plans): add rectpacking-next-row-arm mission brief"`. Record the squash base in
   the journal: the driver's base if the prompt names one, otherwise that commit's parent (`35916b90` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004. That held at planning.
   Otherwise follow stop 2.
5. Baseline: see the journal's `plan` row. Rerun it only if the base sha differs from `35916b90`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

No data model, API contract or service dependency changes. Under D3 and D5 the mission changes only docs and plans text. Under D4
it adds a recorder plan, a ref file and a test, and changes no landed expectation.

| File | Action | Task |
| ---- | ---- | ---- |
| This mission's journal, `evidence.md` (new), the README batch table and summary | Create / Modify | T1, T2, T3 |
| `$TMPDIR/rectpacking-next-row-arm/**` (snapshot, search, logs; never committed) | Create | T1 |
| `plans/alg-packing/unreached.md` (appended addendum), `plans/alg-packing/decision-journal.md` (one appended row) | Modify | T2 |
| `docs/conformance.md` (`:2278-2283`, `:2414-2419`), `docs/architecture/alg-packing.md` (`:259-264`, `:547`) | Modify | T2 |
| D4 only: `tools/vectors/RectPackingVectors.java`, `tools/vectors/rectpacking-vectors.sh`, `test/golden/refs/java/rectpacking-extra.json` (new), `src/alg/rectpacking/RectPackingExtraVectors.test.ts` (new), `test/helpers/rectpacking-replay-rows.ts` (optional parameter) | Modify / Create | T2 |
| `plans/roadmap.md` (appended section), `.agent-notes/rectpacking-next-row-arm.md` | Modify / Create | T3 |

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

See [stop-conditions.md](stop-conditions.md). The likeliest to fire are stop 7 (a cross-checked input exposes a port difference),
stop 8 (time, which leads to D5) and stop 2 (machine load delays the JVM cross-check; wait, do not skip it).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Proof, search, oracle cross-check | T1 | — | [[x] |
| [2](batch-2/overview.md) | Records; gates, roadmap and squash | T2, T3 | 1 | [[x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns all three tasks, every commit and every `gh` call. No subagents: the work is
sequential (proof, then search, then records) and touches few files.

**Time:** about 2.5 h under D3 or D5. T1 takes up to 2 h 15 min of budget (45 min of proof, 60 min of search and 30 min of
cross-check; the search and the cross-check run detached while the proof is written). T2 takes 40 min, T3 60 min. D4 adds about
50 min to T2.

## Landing

1. Tag the tip `rectpacking-next-row-arm/pre-squash`.
2. Run `git reset --soft <base>`, then one `git -c commit.gpgsign=false commit -F <file>` with T3's message. The footer is
   `Refs: #107`, with no attribution lines.
3. Never push.

## Reference

- [decisions.md](decisions.md) holds D0-D6 and the auto-confirmed record.
- [stop-conditions.md](stop-conditions.md), [diagrams/data-flow.md](diagrams/data-flow.md) and
  [diagrams/component-map.md](diagrams/component-map.md).
- Precedents:
  - `plans/rectpacking-open-arm/`: the same brief shape for #81; its `evidence.md` holds invariant **I** (§ 2 L4), the
    enumerations (§ 3) and a reusable search and cross-check harness (§ 6).
  - `plans/alg-packing/unreached.md`: the `U` row format, and the addendum of 2026-11-24 (row 19).
  - `plans/tree-recorder-gaps/decisions.md` D1-D3: a new ref file instead of appending to a pinned one.

## Mission summary (2026-11-24)

Completed 2026-11-24: 3 of 3 tasks, branch D3 (a proof, not a partial). No halt, no gate rerun.

- **Result.** `Compaction.java:325` and `:416` are true whenever they run at the pin `8bca22f4`, for both values of
  `rowHeightReevaluation`: N0-N4 hold ([decision-journal.md](decision-journal.md), the five `lemma` rows;
  [evidence.md](evidence.md) § 2). The false arm (`CompactionPlacement.ts:55` in the port) is `U` row 20 in the `#107` addendum
  of `plans/alg-packing/unreached.md`.
- **Evidence.**
  - Enumerations: an `ast-grep` enumeration with a positive control for every "only" claim. #81's E2, E3, E6 and E8 give the
    same hit lists (evidence § 3).
  - Search: 1,000,000 seeded inputs, 500,000 per flag value. Each site was reached at least 186,741 times per flag value;
    0 false-arm hits, 0 violations, 0 timeouts (the brief asked for 100,000 inputs and 1,000 reaches).
  - Mutant control: it fires.
  - Cross-check: 1,200 inputs equal to the oracle at 1e-6 (the brief asked for 1,000).
- **Landed.**
  - Records: the addendum, the closing row in `plans/alg-packing/decision-journal.md`, the doc sentences
    (`docs/conformance.md`, `docs/architecture/alg-packing.md`) and the roadmap revision.
  - Notes: `.agent-notes/rectpacking-next-row-arm.md`.
  - A comment on #107 (labels unchanged).
  - No `src/` file and no landed ref, vector, golden or assertion changed.
- **Not as planned.**
  - Prettier re-padded the columns of the issue table in `docs/architecture/alg-packing.md`, because the #107 cell grew. This
    is a format change only.
  - The oracle cross-check waited about 7 minutes for the load average to fall from 145 to 12 (stop 2's rule, not a stop).
- **Decisions.**
  - D0-D6 as planned; D4 and D5 were not taken.
  - Push-forwards: #81's generator and search reused unchanged, the new probes, and the side count of `Compaction.java:127`
    (both arms reached, nothing filed).
- **Gates.** Queue gates 1-7 green:
  - format, typecheck and complexity (no violation);
  - coverage: 1,257 files, 51,943 tests, 98.85 / 97.02 / 98.63 / 98.9;
  - docs build, and CodeQL with no new accepted entry;
  - `test/golden/refs/` untouched against the base.
- **Open.** Nothing. No issue was filed, and with `U` rows 19 and 20 the rectpacking bundle has no open arm.
