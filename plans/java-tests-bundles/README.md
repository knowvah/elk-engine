<!-- SPDX-License-Identifier: EPL-2.0 -->

# java-tests-bundles: mission brief (issue #97)

## Objective

`tools/oracle/java-tests.sh` puts only two test bundles on the classpath (`TEST_BUNDLES`, `:34`):
`alg.layered.test` and `alg.test`. Every other ported JUnit class has been run through a `sed`-made scratch copy of the
script (five architecture pages and seven `plans/*/java-baseline.md` carry the recipe), and the ELK upgrade runbook's
section 10 skips them. At planning (2026-11-20, pin `8bca22f4`) the port cites **143** JUnit classes by path, not the
issue's 124: 100 in `alg.layered.test`, 35 `.java` in eleven other bundles, and 8 `.xtend` suites in `graph.json.test`
that the issue's `.java`-only grep misses ([D4](decisions.md#d4-the-class-list-includes-the-xtend-suites-143-at-planning-not-124)).

A planning probe already ran the 43 non-layered classes with all thirteen bundles on the classpath and the current
third-party list: 278 runs, 0 failures ([D5](decisions.md#d5-evidence-before-and-after-on-the-pinned-oracle)).

Exit (#97, "done when"):

- `TEST_BUNDLES` carries the thirteen bundles of [D1](decisions.md#d1-carry-every-cited-test-bundle-in-test_bundles);
  `THIRD_PARTY` and everything under `tools/vectors/` are unchanged ([D2](decisions.md#d2-third_party-and-toolsvectors-do-not-change)).
- `test/architecture/java-tests-bundles.fitness.test.ts` fails when a TS file cites a test bundle the script does not
  carry ([D3](decisions.md#d3-a-fitness-test-keeps-the-list-complete)); red on the base, green after.
- All 143 classes run on the pinned oracle with one `java-tests.sh` call, `failures=0`; the 100 layered rows equal the
  landed script's run before the edit, the 43 others equal the planning probe; all 143 lines are journaled as the
  baseline (D5).
- `docs/architecture/elk-upgrade.md` § 10 (and § 5 step 1) and the six "Java baseline" paragraphs say what is true now
  ([D6](decisions.md#d6-docs-scope)).
- Queue gates 1-7 green and journaled. One squashed commit on the base; `plans/roadmap.md` gains
  `## Revision <date> (java-tests-bundles)`.

**Not in this mission:** any oracle rebuild, patch or `ELK_COMMIT` change; `org.eclipse.elk.shared.test`; the TS
`PIPELINE_SUITES_FULL` half of section 10; any edit to `tools/vectors/`, `plans/*/java-baseline.md` or past-tense
records in `docs/conformance.md`; any write inside `$ELK_ORACLE_DIR` (the JVM runs only read it; logs go to `$TMPDIR`).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `.agent-notes/java-tests-bundles-planning.md`.
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/java-tests-bundles .agent-notes/java-tests-bundles-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add java-tests-bundles mission brief"`. Record the squash base
   in the journal: the driver's base if the prompt names one, else that commit's parent (`5beafe57` at planning).
4. Oracle bookkeeping: check that `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4…` and patches 0001-0003 (it did
   at planning, `builtAt` 2026-11-18T15:18:16Z), check that `$ELK_ORACLE_DIR/test/<bsn>/target/classes` exists for each
   D1 bundle, and run `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/ test/`. Journal all three.
   A wrong stamp or a missing directory is stop 3, not a rebuild.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

After T1: `npx vitest run test/architecture/java-tests-bundles.fitness.test.ts`, `bash -n tools/oracle/java-tests.sh`,
`npx prettier --check` on the new test. After T2: `npx vitest run test/docs/elk-upgrade-runbook.test.ts` and
`npx prettier --check` on the edited docs. T3 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count (200 at base)
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/ tools/vectors/   # gate 7: both empty
```

The full suite and the JVM runs take minutes: check `uptime` (wait above 12), start them detached under `nice -n 10`
as the queue rules show, and poll in steps of at most 9 minutes.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likely ones are 4 (a count differs between before, after and the
probe) and 5 (a class cannot load with the current `THIRD_PARTY`).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Fitness test red, carry the bundles, JVM baseline | T1 | — | [x] |
| [2](batch-2/overview.md) | Runbook § 10 and the Java-baseline paragraphs | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Close-out: gates, roadmap, squash | T3 | 2 | [x] |

## Execution model

Recommended executor: `fable`, working alone. One array, one header comment, one small test and seven doc paragraphs
do not justify a subagent; the orchestrator owns every edit, commit, `gh` call, `plans/` and `.agent-notes/`. The queue
driver supplies the session's permissions, so no `.claude/settings.autonomous.json` is generated (the path is
gitignored).

## Landing

Squash every commit of the mission into exactly one on the base: tag the tip `java-tests-bundles/pre-squash`, then
`git reset --soft <base>` and one `git -c commit.gpgsign=false commit -F <file>`. Subject
`fix(oracle): run every ported junit bundle with java-tests.sh` (or a better one within 72 chars), a body that says
why (the scratch-copy recipe left 43 classes out of the upgrade runbook; the Xtend suites were missed by the `.java`
grep; the fitness test keeps the list complete; the wider classpath left the layered counts unchanged), footer
`Refs: #97`, and the attribution trailer the session's system reminder names. Never push.

## Reference

- [decisions.md](decisions.md): D1-D6 and the auto-confirmed record.
- [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #97, #44 (the rehearsal that found it); `plans/alg-trees/java-baseline.md` (the scratch-copy recipe this ends).

## Mission summary (2026-11-20)

- **Done.** T1-T3, all three batches; no stop condition fired and nothing is left for a ruling.
- **The script carries thirteen test bundles.** `TEST_BUNDLES` of `tools/oracle/java-tests.sh` is D1's fixed list;
  the array, its comment and the header comment are the only edits. `THIRD_PARTY` and `tools/vectors/` are unchanged.
- **Fitness test.** `test/architecture/java-tests-bundles.fitness.test.ts` (4 tests), red on the base with exactly
  the eleven new bundles missing, green after the edit.
- **JVM evidence.** Before (two bundles, 100 layered classes): 51,299 runs, 0 failures, 402 s. After (one call, 143
  classes): 51,577 runs, 0 failures, 432 s. The 100 layered lines are byte-identical; the 43 others (278 runs) equal
  the planning probe. The 143 lines are in [java-baseline.md](java-baseline.md).
- **Docs.** Runbook § 10 (two commands, `.java` and `.xtend`, 143 classes, about 7 minutes) and § 5 step 1; the
  Java-baseline paragraphs of six architecture pages call the landed script.
- **Decisions made on the way** (journal): the baseline lines live in `java-baseline.md`, a file the brief did not
  list, because a fenced block cannot sit in the journal table; the comment above the array changed with it; the
  `alg-packing.md` clause "last run for mission 8c" was brought up to date; commits carry no attribution trailer
  (the queue rules win over the brief's Landing).
- **Gates.** 1-7 green: coverage exit 0 with 1,178 files and 49,337 tests passed, 93 skipped, 0 failed and
  98.81 / 96.99 / 98.56 / 98.86; typedoc 200 warnings; CodeQL "every finding is accepted" with `accepted.json`
  unchanged; gate 7 empty. The oracle was not rebuilt (`8bca22f4…`, patches 0001-0003).
- **Landing.** Tag `java-tests-bundles/pre-squash` keeps the per-task history; one commit on `5beafe57`, footer
  `Refs: #97`, not pushed, unsigned.
- **Open for the maintainer.** Closing #97 when the branch merges; #136 (`follow-up`).
