<!-- SPDX-License-Identifier: EPL-2.0 -->

# layered-stress-cases: mission brief (issue #58)

## Objective

Carry out the maintainer's ruling on #58 (2026-11-13, option 1). Mission 7h held back three runner cases whose models
lay a child out with `elk.stress`: `Issue665Test` 1 of 1 and `Issue700Test` 2 of 4. Stress is now ported (8b). This
mission removes the hold-back so that both suites run every case with the Java's assertions unchanged, matching the
oracle's counts (1/0 and 4/0).

| # | Ruling item | Task |
| - | ----------- | ---- |
| 1 | Delete `STRESS_PENDING` and its helper and pin test; register `elk.stress` (and `elk.force`) where the suites get their providers | [T3](batch-1/T3-runner-stress.md), [T4](batch-2/T4-remove-hold-back.md) |
| 2 | Append four label texts to `layered-label-metrics.json`, recorded by script on JDK 21.0.1 arm64 and equal to the ruling's values | [T1](batch-1/T1-label-metrics.md) |
| 3 | Vendor `665_includeChildrenDoesntStop.elkt` and `hierarchicalLayoutMixing.elkt` under `compound/`, with manifest rows | [T2](batch-1/T2-vendor-inputs.md) |
| 4 | Update the 7h and 8b docs, and add a new H13 row to the 7h journal | [T5](batch-3/T5-docs.md) |

Exit:

- Both suites pass in default mode (vendored, no `PIPELINE_SUITES_FULL`) with 1 and 4 layout cases.
- They also pass under `PIPELINE_SUITES_FULL=1`, with and without the fixed measurer.
- `java-tests.sh` gives the same counts.
- The only ref change is the four appended keys.
- No change to stress, force or layered sources.
- Queue gates 1-7 are green.
- One squashed commit sits on the base, with `Refs: #58`, a roadmap revision and agent notes.

**Not in this mission:**

- `tickets/layered/588_hierarchicalLayoutNPE.elkt`: no suite reads it (ruling boundary);
- registering the other six providers of `PlainJavaInitialization` (D1);
- any change to `src/alg/force`, `src/alg/layered` production code, the compound recorder, or another ref;
- oracle patches;
- any write to `~/git/knowvah/elk`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md),
   [decision-journal.md](decision-journal.md), `.agent-notes/layered-stress-cases-planning.md`,
   `.agent-notes/alg-force-disco.md` (the #58 observation), `.agent-notes/layered-compound.md` (H13), and
   `gh issue view 58 --comments`.
3. `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed, commit it with
   `git add plans/layered-stress-cases .agent-notes/layered-stress-cases-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add layered-stress-cases mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`32ca890e` at planning).
4. Oracle: `~/git/knowvah/elk-oracle/oracle-build.json` must name `8bca22f4…` and patches 0001-0004 (true at planning,
   built 2026-11-21T05:47:58Z). Record the output of
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/org.eclipse.elk.alg.layered plugins/org.eclipse.elk.alg.force test/org.eclipse.elk.alg.test test/org.eclipse.elk.alg.layered.test`
   (empty at planning; a change is journaled, not a stop).
5. Baseline at planning: see the journal's `plan` rows. Rerun it only if the base sha differs from `32ca890e`.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Blast radius

There is no data model, API contract or service dependency change: test code, test data and docs only, with no `src/`
production file. The public package is unaffected.

| File | Action | Task |
| ---- | ------ | ---- |
| `tools/vectors/layered-label-metrics-texts.txt` | Modify (append 4 lines) | T1 |
| `test/golden/refs/java/layered-label-metrics.json` | Modify (recorder output, 4 keys appended) | T1 |
| `test/golden/inputs/compound/tickets/layered/665_includeChildrenDoesntStop.elkt` | Create (byte copy) | T2 |
| `test/golden/inputs/compound/examples/hierarchy/hierarchicalLayoutMixing.elkt` | Create (byte copy) | T2 |
| `test/golden/inputs/manifest.json` | Modify (2 rows) | T2 |
| `test/golden/algorithm-refs.test.ts` | Modify (inventory list, D4) | T2 |
| `test/helpers/layout-test-runner.ts`, `test/helpers/layout-test-runner.test.ts` | Modify | T3 |
| `test/helpers/stress-pending.ts`, `test/helpers/stress-pending.test.ts` | Delete | T4 |
| `src/alg/layered/issues/Issue665Test.test.ts`, `Issue700Test.test.ts` | Modify | T4 |
| `docs/conformance.md`, `docs/architecture/{alg-layered-compound,alg-force-disco,text-sizing-seam,alg-packing}.md` | Modify | T5 |
| `plans/layered-compound/decision-journal.md` | Append one row | T5 |
| `plans/roadmap.md`, `.agent-notes/layered-stress-cases.md`, this README, the journal | Modify / Create | T6 (journal: every task) |

No new package, env var or database change.

## Quality gates

After each task, run its own tests (`npx vitest run <files>`), `npm run typecheck`, and
`npx prettier --check <changed files>`. T6 runs queue gates 1-7 and journals each.

JVM runs are T1's recorder (JDK only, seconds) and T4's `java-tests.sh` over two classes. Before the latter, check
`uptime` and wait if it is above 12. Run it under `nice -n 10`, detached, with `echo "exit $?"` as the log's last line.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The ones most likely to fire are 1 (the recorder's fonts give a different
value) and 3 (a case fails once stress is registered). Both are halts.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Inputs, label metrics, runner registration | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Remove the hold-back | T4 | 1 | [x] |
| [3](batch-3/overview.md) | Docs; close-out and squash | T5, T6 | 2 | [x] |

## Execution model

Recommended executor: `fable`. The mission is small (six tasks, each 5-15 minutes), so running it inline in one session
is the default.

- The orchestrator owns every JVM run, the ref replacement, every commit and every `gh` call, plus `plans/` and
  `.agent-notes/`.
- T2 and T3 may run as foreground subagents (`typescript-pro`, sonnet) with the task file as the prompt. They never
  commit, never run the full suite or a JVM, and never write outside their write-set.
- One commit per task before the squash.

## Landing

- Subject and body: [D8](decisions.md#d8). Footer `Refs: #58`, no attribution lines.
- Tag `layered-stress-cases/pre-squash`, run `git reset --soft <base>`, then make one commit with
  `git -c commit.gpgsign=false commit -F <file>`. Never push.

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md)

## Mission summary

Completed 2026-11-21: 6 of 6 tasks, no halt, no stop condition fired.

- **Result.** `Issue665Test` runs 1 of 1 and `Issue700Test` 4 of 4 with the Java's assertions, in default mode
  (vendored), under `PIPELINE_SUITES_FULL=1` and with the fixed measurer. The oracle (8bca22f4 + 0001-0004) gives
  `runs=1 failures=0` and `runs=4 failures=0`. The port's layout of both stress models is byte-equal to the oracle's
  export.
- **Ref change (one, ruling-authorised).** `test/golden/refs/java/layered-label-metrics.json`: four keys appended by
  script with the ruling's values; 2,317 earlier entries byte-identical (the ruling's 2,258 was an older count).
- **Test changes (ruling-authorised, D3/D4).** The pin test of the hold-back is deleted; `Issue700Test`'s count goes
  from 2 to 4; `Issue665Test` gains a count test of 1; the inventory test gains a two-entry list.
- **Decisions.** D1-D8 as planned. Journaled push-forwards: the helper's name, seat and probes (T3); `MODELS_REPO` for
  `java-tests.sh` after the brief's command failed without it (T4); `docs/architecture/overview.md` changed outside the
  planned write-set (T5). One journal row corrects the reasoning of an earlier one (T3, option suffixes).
- **Gates.** Queue gates 1-7 green: coverage 98.81 / 97.01 / 98.56 / 98.86 with 49,557 tests passed and 83 skipped;
  200 typedoc warnings as at the base; codeql with no new accepted entry; no ref changed besides the metrics table.
- **Issues.** #150 (`follow-up`). No `needs-ruling`.
- **Landing.** Per-task history under the tag `layered-stress-cases/pre-squash`; one squashed commit on `32ca890e`
  with `Refs: #58`.
