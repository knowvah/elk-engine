<!-- SPDX-License-Identifier: EPL-2.0 -->

# dev-assert-restore: mission brief (issue #127)

## Objective

Carry out the maintainer's rulings of 2026-11-20 on #112 (row #32, option 2), #113 (all nine rows, option 2) and #119
(option a). Ten Java `assert` statements that #45 left as comments become live `devAssert` calls again, and every test
step that drives one of them on purpose runs with assertions off through one shared `withAssertions(false, …)` helper.
That is the AD-13 approval in #127: it covers the assertions-off wrapping and the #119 swap, and **no expected value
changes anywhere** (every test, vector and golden keeps its values).

| # | Java | TS site | Ruling | Wrapped where |
| - | ---- | ------- | ------ | ------------- |
| 32 | `EndLabelPreprocessor.java:377` | `src/alg/layered/intermediate/EndLabelPreprocessorPlacement.ts` `removeLabelOverlaps` | #112 opt. 2 | replay runners, rows with an unsized end label (D3), 170 tests |
| 9 | `InstancePool.java:59` | `src/core/util/InstancePool.ts` constructor | #113 opt. 2 | 4 core test files |
| 12 | `NodeContext.java:277` | `src/alg/common/nodespacing/internal/NodeContext.ts` | #113 | `NodeContext.test.ts` |
| 13 | `HorizontalPortPlacementSizeCalculator.java:212` | `…/algorithm/HorizontalPortPlacementSizeCalculator.ts` | #113 | 9 `adapters/sweep-*` rows |
| 21 | `LGraphUtil.java:821` | `src/alg/layered/graph/LGraphUtilExternalPorts.ts` `freeExternalPortSide` | #113 | 3 rows × 2 replays |
| 22 | `LGraphUtil.java:907` | same file, `placeDummy` default arm | #113 | 1 row × 2 replays + 1 test |
| 23 | `LNode.java:165` | `src/alg/layered/graph/LNode.ts` `setGraph` | #113 | `LNode.test.ts` |
| 40 | `HighDegreeNodeLayeringProcessor.java:255` | `…/intermediate/HighDegreeNodeLayeringProcessor.ts` `moveTree` | #113 | 1 test |
| 116 | `EdgeLabelSideSelection.java:58` | `src/alg/layered/options/EdgeLabelSideSelection.ts` `transpose` | #113 | 1 test |
| 123 | `ForsterConstraintResolver.java:239` | `src/alg/layered/p3order/ForsterConstraintResolver.ts` | #113 | 2 tests |

Plus one **new** test per restored site (ten) pinning the `AssertionError` with assertions on, the #119 swap in
`Issue447Test.test.ts`, docs that still say these sites are comments, and an appended superseding section in
`plans/dev-assert/inventory.md`.

Exit (#127): ten sites restored (or, for a site that fires elsewhere, left a comment with a `needs-ruling` issue,
stop 4); the suite green with assertions on **and** with `ELK_DEV_ASSERTIONS=off`; the ten layered sweeps under
`test/corpus/` green at stride 1 with assertions on; queue gates 1-7 green, `test/golden/refs/` byte-identical; one
squashed commit on the base; `plans/roadmap.md` gains `## Revision <date> (dev-assert-restore)`;
`.agent-notes/dev-assert-restore.md` is written.

**Not in this mission:** #4, #5, #114 and the two `ThresholdStrategy` asserts stay comments (#112 ruling; #128); any
vector, golden, recorder or oracle patch; any `src/` change beyond the ten sites; any change to an expected value,
tolerance or case list.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   `.agent-notes/dev-assert-restore-planning.md`, and the rulings: `gh issue view 127`, `gh issue view 112 --comments`,
   `gh issue view 113 --comments` (the row tables there are this mission's lists).
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/dev-assert-restore .agent-notes/dev-assert-restore-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add dev-assert-restore mission brief"`. Record the squash base
   in the journal: the driver's base if the prompt names one, else that commit's parent (`b716710e` at planning).
4. Oracle: check `~/git/knowvah/elk-oracle/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (true at
   planning); record `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` (empty at planning). The oracle
   is used only for stop-4 evidence (`-ea` stacks).
5. Baseline at planning (`b716710e`, gate env, assertions on): `npm run coverage` exit 0, 1,178 files passed, 10
   skipped; 49,337 tests passed, 93 skipped, 0 failed; coverage 98.81 / 96.99 / 98.56 / 98.86; `format:check` and
   `typecheck` clean. Journal it as the base (rerun only if the base sha differs).
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After each task: its own files' tests (`npx vitest run <files>`), `npm run typecheck`, `npx prettier --check <changed
files>`. T7 runs queue gates 1-7 and journals each:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite (base 98.81/96.99/98.56/98.86)
env $SWEEPS ELK_DEV_ASSERTIONS=off npx vitest run                 # #127: green with assertions off too
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

No recorder input changes, so gate 7 reruns nothing. The sweeps (T6) are the mission's oracle evidence. The suite
takes about 20 minutes; start long runs detached and poll (queue rules).

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). Most likely to fire: 4 (a restored site fires on a test or sweep case
outside its ruled set) and 5 (the #32 predicate selects a count other than 170).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Helper + #119; restore the ten sites and take the firing census | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | Wraps and new tests: #32 runners; #113 core/common; #113 layered | T3, T4, T5 | 1 | [x] |
| [3](batch-3/overview.md) | Suite both modes, sweeps at stride 1; close-out, squash | T6, T7 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The orchestrator owns T1, T2, T6, T7, every commit, every `gh` call, `plans/` and
`.agent-notes/`. T3, T4 and T5 have disjoint write-sets and may run as parallel subagents (`typescript-pro`, sonnet);
each task file plus [census.md](census.md) (written by T2) is the prompt. Subagents never commit, never run the full
suite or `npm run coverage`, never start a JVM, use a private `$TMPDIR/<task>/` scratch directory, and return their
report to the orchestrator, which journals it. Between T2 and the end of batch 2 the suite is red by design (sites
restored, wraps not yet in); the per-task commits are squashed, so no red commit lands.

## Landing

Subject `test: restore ten java asserts behind an assertions-off switch` (≤ 72, lowercase). The body gives the why:
the three rulings, the AD-13 approval (wrapping and the #119 swap only, no expected value changed), the #32 predicate
and its count, the ten new `AssertionError` tests, any site left a comment under stop 4 with its issue. Footer
`Refs: #127, #112, #113, #119`, no attribution lines (queue rule). Tag `dev-assert-restore/pre-squash`,
`git reset --soft <base>`, one commit with `git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[census.md](census.md) (T2) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-20)

- **Tasks:** 7 of 7 (T1-T7). T3-T5 were done by the orchestrator in sequence, not by subagents (journal, batch 2).
- **Sites:** all ten restored; none went back to a comment (stop 4 did not fire in the suite or in a sweep).
- **Decisions journaled:** the loose `!= null` at #9 (D5); `SHORT_MIN_VALUE` as a file-local constant and
  `getBarycenter()!` at #123; three runner wraps instead of the six planned files; `assertionErrorOf` as a second
  helper; the row-id set of #21/#22 in `lgraph-site-external-tables.ts`; the `alg-layered-placement.md` line outside
  T7's list. **For review:** the #32 predicate selects 572 tests, not 170 (mechanism in the journal, T3 finding;
  issue #138).
- **Gates:** queue gates 1-7 green on the final tree; suite green with assertions on and off (49,361 passed, 93
  skipped); coverage 98.81 / 96.99 / 98.56 / 98.86 (the base's); ten sweeps green at stride 1 with assertions on;
  `test/golden/refs/` byte-identical.
- **Issues:** #137, #138 (`follow-up`). No `needs-ruling`.
- **Known gaps:** no corpus run of the non-layered algorithms has assertions on (#137).
