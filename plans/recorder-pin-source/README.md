<!-- SPDX-License-Identifier: EPL-2.0 -->

# recorder-pin-source: mission brief (issue #96)

## Objective

The pinned ELK commit is written 42 times under `tools/`: once in `tools/oracle/ELK_COMMIT` (AD-2) and once in each
of 41 `tools/vectors/*Vectors.java` recorders as `ELK_COMMIT = "8bca22f4…"`. That constant, not the oracle, is the
`elkCommit` / `oracle` stamp a vector ref prints. Every recorder script already dies unless `oracle-build.json` names
the commit in `tools/oracle/ELK_COMMIT`, so the constant can only repeat that file, and a pin move has to `sed` all 41
(runbook `docs/architecture/elk-upgrade.md` § 5 step 3). Two more recorders, `CoreJdkVectors.java` and
`GuavaVectors.java`, have no script; their command lines live only in their headers and in runbook § 7.3.

Exit (#96 "Done when", both of its options):

- The full pin appears under `tools/` only in `tools/oracle/ELK_COMMIT` (plus `tools/melk/sources/manifest.json`, a
  generated stamp with its own writer and check, [D4](decisions.md#d4-a-fitness-test-holds-the-single-source)). The
  41 recorders read it from the system property `elk.commit`, which the scripts pass from `tools/oracle/ELK_COMMIT`
  ([D1](decisions.md#d1-the-scripts-pass-the-pin-as--delkcommit),
  [D2](decisions.md#d2-a-lazy-checked-accessor-replaces-the-constant)). A fitness test enforces it.
- `tools/vectors/core-jdk-vectors.sh` and `tools/vectors/guava-vectors.sh` exist, in the form of
  `gson-vectors.sh`/`java-vectors.sh`, executable, and runbook § 7.3 names them, so
  `test/docs/elk-upgrade-runbook.test.ts` finds them by its `*-vectors.sh` rule
  ([D3](decisions.md#d3-the-two-new-scripts-run-the-documented-commands-on-unchanged-sources)).
- **Every ref is byte-identical**, proven by a cold run of every recorder (each `cache:` line `recorded` or
  `rows 0/N`), `git diff --exit-code test/golden/refs/`, and `cmp` of the two new scripts' output against
  `test/golden/refs/java/`. The eight layered sweeps whose program changed reproduce their `results.jsonl` byte for
  byte ([D5](decisions.md#d5-proof-cold-recorders-sweeps-and-the-negative-path)). Any ref change is an AD-13 STOP.
- Queue gates 1-7 green and journaled; one squashed commit on the base; `plans/roadmap.md` gains
  `## Revision <date> (recorder-pin-source)`.

**Not in this mission:** #50 (multi-file `javac` build, melk `List<Integer>`, `KVectorChain` dump;
[D6](decisions.md#d6-issue-50-stays-separate)); any edit to `CoreJdkVectors.java`, `GuavaVectors.java`,
`JavaVectors.java`, `GsonVectors.java`, `LabelSizingVectors.java` or `LayeredLabelMetricsVectors.java`; any change to
the vector-cache salt formula; any oracle patch, `ELK_COMMIT` change or rebuild; the translated `docs-site/` pages.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md`. The queue rules in your system prompt override it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md), [decision-journal.md](decision-journal.md),
   and `.agent-notes/recorder-pin-source-planning.md` (identity-hash risk, sweep before-side, timings).
3. Branch: `git branch --show-current` prints `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/recorder-pin-source .agent-notes/recorder-pin-source-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add recorder-pin-source mission brief"`. Record the squash
   base in the journal: the driver's base if the prompt names one, else that commit's parent (`f69bbe41` at planning).
4. Oracle bookkeeping: `$ELK_ORACLE_DIR/oracle-build.json` names `8bca22f4afa3371562d2f702d59929818f7f7b71` and
   patches 0001-0003 (true at planning, `builtAt` 2026-11-18T15:18:16Z); record its `shasum -a 256`; run
   `git -C ~/git/knowvah/elk log --oneline 8bca22f4..HEAD -- plugins/` (empty at planning). Journal all three. If the
   stamp is off, rebuild with `tools/oracle/build.sh` and journal it (queue rules); the cache goes cold either way.
5. `$ELK_MODELS_DIR` (`../../eclipse-elk/elk-models`) is at the commit in `test/corpus/manifest.json`; journal it.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Quality gates

Per task: the checks in its file. T4 runs queue gates 1-7:

```bash
npm run format:check && npm run typecheck && npm run complexity   # never trust plain lizard's exit code
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent LABEL_SIZING_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90, the full suite
npm run docs:build                                                # typedoc warnings: journal the count
npm run codeql                                                    # every finding fixed or accepted with a reason
git diff --exit-code <base> -- test/golden/refs/                  # gate 7: empty
```

T3's sweep consumer tests run once without the `/nonexistent` overrides (T3 step 6). The full suite takes minutes:
start it detached as the queue rules show and poll it.

## Stop conditions and push-forward

See [stop-conditions.md](stop-conditions.md). The likely one is 3: an unpinned recorder (no `-XX:hashCode=2`) whose
output follows identity hashes changes when its source changes (`.agent-notes/recorder-identity-hash.md`).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Sweep before-side, then one source for the pin | T0, T1 | — | [x] |
| [2](batch-2/overview.md) | Scripts for `CoreJdkVectors` and `GuavaVectors`; runbook | T2 | 1 | [x] |
| [3](batch-3/overview.md) | Cold proof: every recorder, the sweeps, the negative path | T3 | 2 | [x] |
| [4](batch-4/overview.md) | Close-out: gates, roadmap, squash | T4 | 3 | [x] |

## Execution model

Recommended executor: `fable`, working alone. The 41 recorder edits are one mechanical transformation that must stay
consistent (one unit, one writer); the proof is long-running JVM work the orchestrator must poll itself. No subagent.
The queue driver supplies the session's permissions, so no `.claude/settings.autonomous.json` is generated.

**Time:** about 1 h of edits and short recorders, plus the `elkj-vectors.sh` lane (4 h 23 min to 4 h 49 min cold in
the last two moves). Start that lane as soon as every `tools/vectors/` edit is committed (end of T2) and do the rest
of T3 and T4's gates beside it, polling at most 9 minutes at a time. Never end a turn while it runs.

## Landing

Squash every commit of the mission into exactly one on the base: tag the tip `recorder-pin-source/pre-squash`, then
`git reset --soft <base>` and one `git -c commit.gpgsign=false commit -F <file>`. Subject
`chore(vectors): read the pinned elk commit from one file` (or a better one within 72 chars), a body that says why
(the 41 constants could only repeat `ELK_COMMIT`; a forgotten `sed` re-records with the wrong stamp; two recorders had
no script; refs proven byte-identical by a cold run), footer `Refs: #96`, and the attribution trailer the session's
system reminder names. Never push.

## Reference

- [decisions.md](decisions.md): D1-D6 and the auto-confirmed record.
- [diagrams/data-flow.md](diagrams/data-flow.md), [diagrams/component-map.md](diagrams/component-map.md).
- Issue #96; overlaps #50. `.agent-notes/elk-upgrade-runbook.md` (the original finding, cold timings),
  `.agent-notes/elk-pin-move-8bca22f4.md` (lanes, load), `.agent-notes/recorder-identity-hash.md`.

## Mission summary (2026-11-20)

- **Done.** T0-T4, all four batches; no stop condition fired and nothing is left for a ruling.
- **The pin has one source under `tools/`.** `tools/oracle/ELK_COMMIT`, plus the generated `.melk` stamp. The 41
  stamping recorders read the system property `elk.commit` through a lazy checked accessor (`elkCommit()`);
  `vector-cache.sh` (26 scripts) and the four direct scripts pass it. 38 recorders also call the accessor at the start
  of their vector path; all 41 refuse, before writing a file, when started without the property.
- **Fitness test.** `test/architecture/elk-pin.fitness.test.ts` (9 tests), red on the base with 41 offenders, green
  after T1. D4 item 3 was kept. Its program-name rule moved unchanged into `test/helpers/recorder-scripts.ts`.
- **Two scripts.** `tools/vectors/core-jdk-vectors.sh` and `tools/vectors/guava-vectors.sh`, mode 755, named in runbook
  § 7.3; their six outputs are `cmp`-identical to the refs; both Java sources are unedited.
- **Cold proof.** Every stamping recorder ran cold (35 programs through the 29 short scripts in 6 min 17 s; the `elkj`
  lane in 4 h 03 min with `rows 0/281` and `rows 0/126`; no `hit`), and `git diff --exit-code f69bbe41 --
  test/golden/refs/` is empty with no untracked file. The 13 unpinned scripts' 24 refs did not move. The eight sweeps
  were fresh at the base, reran after T1 and are byte-equal (67,111 lines); their consumer tests pass.
- **Decisions made on the way** (journal): the shared test helper and `docs/architecture/core-engine.md` § 7.6 are
  write-set additions; `docs/translation-rules.md` was left alone (source of a translated page); the lane was started
  at a 1-minute load of 14.9 by mistake and kept, because no `elkj` recorder has a wall-clock timeout; three journal
  counts were corrected by later rows.
- **Gates.** 1-7 green: coverage exit 0 with 1,177 files and 49,333 tests passed, 93 skipped, 0 failed and
  98.81 / 96.99 / 98.56 / 98.86; typedoc 200 warnings; CodeQL "every finding is accepted" with `accepted.json`
  unchanged; gate 7 empty. The oracle was not rebuilt (`8bca22f4…`, patches 0001-0003).
- **Landing.** Tag `recorder-pin-source/pre-squash` keeps the per-task history; one commit on `f69bbe41`, footer
  `Refs: #96`, not pushed, unsigned.
- **Open for the maintainer.** Closing #96 when the branch merges; #134 and #135 (`follow-up`).
