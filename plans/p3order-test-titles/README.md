<!-- SPDX-License-Identifier: EPL-2.0 -->

# p3order-test-titles: mission brief (issue #62)

## Objective

Mission 7h (issue #36) was allowed to change **header comments** only (decision H7,
`plans/layered-compound/decisions.md:27`), so three `describe` titles still say the nested-graph paths are U (not
reachable by any oracle row) "until 7h". Since 7h landed that is false: the nested rows of
`test/golden/refs/java/layered-compound.json` reach those paths (`plans/layered-compound/unreached.md`, § H8 closure,
row 4.1 and the § Crossing minimisation (H8 4) table). The three titles:

| File | Line | Title at planning |
| ---- | ---- | ----------------- |
| `src/alg/layered/p3order/LayerSweepCrossingMinimizerSweep.test.ts` | 122 | `the hierarchical sweep (hand-built nested graph; U for the rows until 7h)` |
| `src/alg/layered/p3order/LayerSweepTypeDecider.test.ts` | 109 | `LayerSweepTypeDecider on a nested graph (hand-built; U for the rows until 7h)` |
| `src/alg/layered/p3order/GraphInfoHolder.test.ts` | 151 | `GraphInfoHolder: a graph nested in a node (hand-built; U until 7h)` |

Rename each title so it states what is true now (D1). **No assertion, no `it` body, no other line changes** (D2).

Exit (#62: "Rename the titles; no assertion changes"):

- The three titles no longer say "U" or "until 7h"; each says what [D1](decisions.md#d1-title-wording) requires and
  is backed by a cited row of the 7h closure (journaled).
- `git diff <base> -- src/` touches exactly those three lines; the test count and results of the three files match
  the base.
- Nothing in `test/golden/refs/` changes. Queue gates 1-7 green and journaled. One squashed commit on the base.
  `plans/roadmap.md` gains `## Revision <date> (p3order-test-titles)`.

**Not in this mission:** any other stale staging text found on the way. Planning found one:
`src/alg/layered/ElkLayeredTestExecutionState.ts:6` says `ElkLayered.prepareLayoutTest` "is staged until 7f".
T2 checks it and files it as a `follow-up` if it is stale (D3). No oracle run, no recorder, no JVM, no ref change.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `.agent-notes/p3order-test-titles-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/p3order-test-titles .agent-notes/p3order-test-titles-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add p3order-test-titles mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`68f37f6e` at planning).
4. Oracle bookkeeping (no oracle run in this mission, but the queue rules ask for the record): check that
   `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (it did at planning), and run
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/`. Journal both.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After T1: the three test files (`npx vitest run src/alg/layered/p3order/{LayerSweepCrossingMinimizerSweep,LayerSweepTypeDecider,GraphInfoHolder}.test.ts`),
same test count as the base, all passing; `npx prettier --check` on the three files. T2 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count (200 at base)
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: no recorder input changes, so empty
```

The full suite takes minutes: start it detached as the queue rules show and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The only plausible one is 3 (a title's claim is not backed by the
closure).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Rename the three titles | T1 | — | [x] |
| [2](batch-2/overview.md) | Close-out: follow-up, gates, roadmap, squash | T2 | 1 | [x] |

## Execution model

Recommended executor: `fable`, working alone. Two one-line edits do not justify a subagent; the orchestrator owns
every edit, commit, `gh` call, `plans/` and `.agent-notes/`.

## Landing

Subject `test(layered): retitle three p3order nested-graph suites after 7h` (≤ 72, lowercase). The body gives the
why: H7 limited 7h to header comments, so these titles still claimed U; the 7h closure rows now reach the paths;
no assertion changed. Footer `Refs: #62`, no attribution lines (queue rule). Tag `p3order-test-titles/pre-squash`,
`git reset --soft <base>`, one commit with `git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[batch-1/T1-rename-titles.md](batch-1/T1-rename-titles.md) · [batch-2/T2-close-out.md](batch-2/T2-close-out.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary (2026-11-20)

- **Tasks:** 2 of 2 (T1, T2). Squash base `68f37f6e5364ff71ea977d5c528bd5591f163641`; per-task history under the tag
  `p3order-test-titles/pre-squash`.
- **Result:** the three `describe` titles are renamed; `git diff 68f37f6e -- src/` is three lines in three test
  files. No assertion, `it` title, body, comment, ref or tool changed. The three suites: 31 tests passed before and
  after.
- **Decisions:** D1-D3 as planned. One push-forward within D1, flagged for review: titles 2 and 3 are longer than
  the proposed table because each suite asserts one item the `layered-compound.json` rows do not reach
  (`LayerSweepTypeDecider.ts:66`, the `crossMinDeterministic()` arm; `GraphInfoHolder.parentGraphData`), so each
  title names it as reached by the ported suites only. Backed by the closure (rows 4.1, 4.1a, table H8 4) and by a
  TypeScript coverage run of the rows (journal, T1 `finding` rows).
- **Gates (1-7):** all green. `format:check`, `typecheck`, `complexity` exit 0 (1,377 files, 10,718 functions);
  coverage 98.81 / 96.99 / 98.56 / 98.86 with 1,173 files and 49,305 tests passed, 93 skipped; `docs:build` 200
  typedoc warnings (as at the base); `codeql` every finding accepted, no new entry; refs diff empty.
- **Stops:** none met. No `needs-ruling` issue.
- **Follow-up:** #130 (`follow-up`), other staging text made false by 7f, 7f2 and 7h, including
  `ElkLayeredTestExecutionState.ts:6` and the two header comments that say the rows prove the two items above.
- **Notes:** `.agent-notes/p3order-test-titles.md`.
