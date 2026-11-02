<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered crossing minimization: the hand-built JUnit suites — Mission Brief (mission 7c-tests)

## Objective

Port the fourteen unit-level JUnit suites of ELK's crossing minimization that mission 7c deferred (7c C1, amended by
T8): their three graph creators (`intermediate.greedyswitch.TestGraphCreator` with `MockRandom`,
`InLayerEdgeTestGraphCreator`, `NorthSouthEdgeTestGraphCreator`, 2,697 Java lines) into `test/helpers/`, and the
suites (211 tests, 280 runs with parameters; p3order 6, counting 3, greedyswitch 5) colocated as
`<JavaName>.test.ts`. Expected values are the Java tests' own literals (T1); `tools/oracle/java-tests.sh` (T2)
proves every one of the 280 runs passes on the pinned oracle. No vector, golden or ref changes.

Exit:

- the Java runner reports 280 runs, 0 failures on the oracle, per suite as listed in
  [decisions.md](decisions.md#baseline);
- every ported suite runs the same number of cases as its Java suite and passes; the 8 `@Ignore` methods (no `@Test`
  in Java, never collected) are kept as `it.skip` with their reason;
- any port defect a suite exposes is fixed at its origin in 7c production code with a diagnosis artifact, and the
  813-row order replay and the stride-2 order sweep still match (T7);
- [coverage.md](coverage.md) (written by T9) records which of 7c's unreached arms the suites now reach;
- out of scope, recorded in the roadmap: the unused root `layered/TestGraphCreator`, and the two full-layout suites
  `ConcreteSortByInputModelTest` and `AllowNonFlowPortsToSwitchSidesTest` (→ 7f).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); 7c's decisions
   (`plans/layered-crossing-min/decisions.md`, C1–C13) and earlier missions' decisions also apply.
3. Read `.agent-notes/layered-crossing-min.md`; state what affects the approach (`MockRandom` overrides the shim,
   identity assertions, the hierarchical sweep paths no row reaches, the timed gates' load sensitivity).
4. Branch: if `feature/layered-crossing-min-tests` does not exist, `git switch -c feature/layered-crossing-min-tests`
   from `main`, then `git add plans/layered-crossing-min-tests && git commit -m "docs(plans): add
   layered-crossing-min-tests mission brief"`; otherwise `git switch feature/layered-crossing-min-tests`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-crossing-min-tests`, branched from `main` at or after `734f7eb` (the PR 25 merge).

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 11):** keep the per-task history on `feature/layered-crossing-min-tests-backup`; regroup into **at
  most 5 commits**, each body listing its task ids, each typechecking and passing the suite alone in a scratch
  worktree with absolute `ELK_*` dirs:
  1. `test(layered): add the java test runner and the greedy-switch graph creators` — T1, T2, T3a, T3b;
  2. `test(layered): port the crossing-minimization suites` — T4, T5;
  3. `test(layered): port the counting and greedy-switch suites` — T6, T7, T8;
  4. `fix(layered): …` — only if the orchestrator fixed a port defect (T7 rule); otherwise omitted;
  5. `docs(layered): record mission 7c-tests, its plan and coverage` — brief, T9, T10, batch markers.

  The regrouped tree is byte-identical to the backup. Journal the regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-crossing-min-tests
gh pr create --base main --head feature/layered-crossing-min-tests
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Built oracle and test classes | `$ELK_ORACLE_DIR` (`oracle-build.json`; `test/org.eclipse.elk.alg.layered.test/target/classes`) |
| TS under test | `src/alg/layered/{p3order,p3order/counting,intermediate/greedyswitch,intermediate/preserveorder}/` |
| Precedents | `test/helpers/TestPhases.ts` (a ported Java test helper), `src/core/alg/LayoutProcessorConfigurationTest.test.ts` (`it.skip` for `@Ignore`) |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** any file under `test/golden/refs/` or `tools/vectors/`, the 7a/7b/7c replay helpers
  (`test/helpers/layered-*.ts`, `lgraph-*.ts`, `transform-site-*.ts`), or `plans/layered-crossing-min/**`.
- **Agents never edit `src/` production files.** A failing literal comes back as a diagnosis; the orchestrator applies
  T7 fixes between batches.
- Invoke the runner as `bash tools/oracle/java-tests.sh …` (the autonomous allow-list covers `bash tools/oracle/*`).

## Quality gates

Agents run their own suites, `npm run typecheck` and `npx prettier --check <files>`; they never run `npm run coverage`,
`npm test` or a JVM job, and never commit. After every batch the orchestrator runs these **alone** (check `uptime` and
`ps` for orphaned vitest workers; rerun timeout-only failures at a 1-minute load below 6):

```bash
npm run format:check && npm run typecheck && npm run complexity         # exit 0, complexity clean
npx vitest run test/architecture test/melk                              # all pass
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent npm run coverage   # exit 0; 90/90/90/90 (stop 10)
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent npm test           # ≤ baseline + 5 s (stop 9)
bash tools/oracle/java-tests.sh <the batch's suites>                    # Java counts unchanged (stop 6)
git diff --name-status main -- test/golden/ test/corpus/ tools/vectors/ # empty
git show --name-only --format= HEAD                                     # ⊆ the task's write-set
```

After any orchestrator fix to `src/` (T7), also:

```bash
npx vitest run src/alg/layered/LayeredOrderVectors.test.ts              # 813 pass
bash tools/oracle/order-sweep.sh && npx vitest run test/corpus/order-sweep.test.ts   # stride 2, 0 mismatches
```

At mission end: `npm run docs:build` green, and `tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set
algorithms && git diff --exit-code test/golden/refs/`.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (an agent touching `src/` production code counts).
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one location
   is edited three times for the same check.
3. **AD-13:** a test that can only pass by changing a Java literal, deleting a case, or skipping a passing Java test.
4. **Defect outside 7c files:** a diagnosed port defect whose origin is in `graph/`, `core/`, `java/`, `alg/common/` or
   a 7a/7b class.
5. **Oracle regression:** after a T7 fix, the 813-row replay or the stride-2 order sweep has a mismatch.
6. **Java baseline drift:** the Java runner's counts differ from [the baseline](decisions.md#baseline).
7. **Count mismatch:** a ported suite's run or skip count differs from the Java's and cannot be reconciled from the
   Java source.
8. **Randomness:** an outcome depends on an unseeded draw rather than on `MockRandom` or a fixed seed.
9. **Suite time:** more than about 5 s added to `npm test` over the baseline at similar load.
10. **Coverage:** below 90/90/90/90 at a batch gate.
11. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- TS idiom for JUnit, Hamcrest and Guava plumbing (`assertThat`/`is` → `expect`, `Lists.newArrayList` → spread,
  `Iterables.concat` → iteration); Java behaviour kept.
- TS-forced type guards or `!` where Java relies on an unchecked cast, noted inline.
- `@Ignore` reasons copied verbatim.
- A port defect inside 7c files: the orchestrator fixes it per T7 (diagnosis artifact in the journal, replay and sweep
  re-run).
- Test names: the Java method names; parameterised suites use the Java `@Parameters` name pattern.
- A creator method no ported suite calls is ported anyway (7d–7h suites use the creator).
- Arms the suites newly reach go into `coverage.md`; no new site rows.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Java runner, base creator | T1, T2 | — | [x] |
| [2](batch-2/overview.md) | Derived creators, p3order suites, between-layer counter suite | T3a, T3b, T4, T5, T6 | 1 (T2) | [x] |
| [3](batch-3/overview.md) | Counting and greedy-switch suites | T7, T8 | 2 (T3a, T3b) | [x] |
| [4](batch-4/overview.md) | Count audit and coverage | T9 | 3 | [x] |
| [5](batch-5/overview.md) | Docs, roadmap, summary | T10 | 4 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md) ·
[coverage.md](coverage.md) (written by T9)

## Mission summary (2026-11-03)

- **Tasks:** 12 of 12 (T1, T2, T3a, T3b, T4–T10) on `feature/layered-crossing-min-tests`; no stop condition hit; no
  T7-rule fix (every one of the 280 TS runs passes on the Java literals, so the 813-row replay and the stride-2 sweep
  were not re-run).
- **Exit evidence:** `tools/oracle/java-tests.sh` 280 runs, 0 failures on the oracle, per suite as the baseline; TS 280
  passed, 12 skipped (the 8 `@Ignore` methods × parameters), per suite equal to Java ([coverage.md](coverage.md));
  the suites newly reach three of 7c's "U nested" arms, no reclassification of 7c's map; the root
  `layered/TestGraphCreator` and the two full-layout suites are recorded in the roadmap (7f).
- **Decisions:** T1–T9 as approved; 12 push-forward rows in the [journal](decision-journal.md) (TS idiom per suite, the
  `MockRandom` field rename, the `SwitchDecider`/`GraphInfoHolder` constructor mappings, the one-file `LayerSweepCrossingMinimizerTest`
  at 1,584 lines, the removal of eight agent-added assertions from T4, the "before" coverage set, and the stop-9
  timing judged on the direct 2.0 s measurement under foreign load).
- **Gates:** every batch gate green (format, typecheck, complexity, architecture and melk, coverage 99.01 / 96.98 /
  99.03 / 99.01, `npm test` 717 files 27,948 passed 85 skipped, Java counts unchanged, refs untouched, write-sets
  respected); mission-end gates in the journal's last rows.
- **Follow-ups:** none new beyond the roadmap hand-offs; `.agent-notes/layered-crossing-min-tests.md` holds the run's
  observations.
