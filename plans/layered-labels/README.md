<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered labels — Mission Brief (mission 7f2, second brief of row 7f)

## Objective

Make labelled and commented layouts run. Port the label family (`LabelDummyInserter`, `LabelDummySwitcher`,
`LabelDummyRemover`, `LabelSideSelector`, `EndLabelPreprocessor`, `EndLabelPostprocessor`, `LabelManagementProcessor`), the
comment processors, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` and the debug utilities (`DotDebugUtil`,
`JsonDebugUtil`, `DebugUtil`): about 5,230 Java lines, 12 enum arms (G1). Close 7f's hand-offs (G9).

Exit:

- every row of the new `test/golden/refs/java/layered-labels.json` replays at the AD-4 bar, logged debug graphs per G3;
- the 59 rows pinned to 7f2 (FX6, FX7) replay their recorded expectations; `site/provider/flat` and `cancelled` compare their
  recorded layout (FX5); FX2's parallel-edge end-label scenario equals the oracle;
- the 12 Java suites of [java-baseline.md](java-baseline.md) pass in TS with the Java's own assertions; the oracle runs equal the
  baseline at mission start and end;
- the label sweep matches at stride 1 when `ELK_MODELS_DIR` is present, refusals only in 7g's and 7h's categories (G7);
- `LayeredLayoutProvider.layout` runs labels, comments, unzipping and logging; self loops, wrapping, compaction throw naming 7g,
  `INCLUDE_CHILDREN` 7h; `staged-classes.json` holds no 7f2 row; fresh-process imports succeed;
- landed vectors, goldens and refs are unchanged, except `layered-label-metrics.json`, which only gains keys (G8).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); 7f's F1–F16 and FX1–FX8
   (`plans/layered-pipeline/decisions.md`) and the earlier missions' rows they name also apply.
3. Read `.agent-notes/layered-pipeline.md`, `layered-labels-planning.md`, `layered-edge-routing.md` and `layered-crossing-min.md`;
   state what affects the approach (the E1 recipe; `-XX:hashCode=2` and identity-hash order; staged arms fail at plan build;
   plans captured in the real run; the runner's label metrics; `initElkReflect`; unboxing checks; removed-element encoding;
   row inventories; timed gates under foreign load; private scratch directories; ugrep vs `/usr/bin/grep`; `vitest -t` matches
   titles only).
4. Branch: if `feature/layered-labels` does not exist, `git switch -c feature/layered-labels` from `main`, then
   `git add plans/layered-labels .agent-notes/layered-labels-planning.md && git commit --no-gpg-sign -m "docs(plans): add layered-labels mission brief"`;
   otherwise `git switch feature/layered-labels`.
5. Run [java-baseline.md](java-baseline.md)'s suites once and journal it; any difference is stop 18.
6. Re-measure `npm test` on `main` (every sweep dir `/nonexistent`) at the quietest load available and journal it as stop 11's
   baseline. Invoke new scripts as `bash tools/...`.
7. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-labels`, branched from `main` at or after `22fcfcb` (the PR 29 merge).

- **Commits:** one **unsigned** commit per task (`--no-gpg-sign`), subject `<type>(TN): <desc>` (Conventional Commits, ≤ 72
  chars, lowercase, no attribution), plus `docs(plans): mark batch N done`. The journal cites task ids, never SHAs.
- **Landing (stop 14):** keep the per-task history on `feature/layered-labels-backup`; regroup into **at most 5 commits** (each
  body listing its task ids, each typechecking and passing the suite alone in a scratch worktree with absolute `ELK_*` dirs; the
  regrouped tree byte-identical to the backup; adapt the grouping where a commit needs another's files):
  1. `test(layered): record label vectors and metrics from the oracle` — T1, T3, T15's oracle script, T16;
  2. `feat(layered): port the label, comment and unzipping processors` — T2, T4a–T8;
  3. `feat(layered): port the debug utilities and the interactive visitor` — T9, T10;
  4. `test(layered): wire the label arms and port their suites` — T11, T12, T13a–c, T15's test, T17a–b;
  5. `docs(layered): record mission 7f2, its plan, decisions and follow-ups` — brief, T14, T18's journal rows, T19.

  Journal the regroup on both branches, then hand the user `git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main`,
  `git push -u origin feature/layered-labels`, and the PR with "Create a merge commit". The executor never signs, pushes,
  opens a PR, merges, or pushes or opens anything upstream (G10).

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Recorder pattern | `tools/vectors/LayeredPipelineVectors.java` (core, `--sweep`/`--dump`, `layout` ops), `layered-pipeline-vectors.sh` |
| Replay pattern | `test/helpers/layered-pipeline-replay-{rows,ops,names}.ts`, `layered-pipeline-sweep.ts`, `layered-routing-replay-*.ts` |
| Runner | `test/helpers/layout-test-runner.ts`, `layout-test-labels.ts`, `layout-test-sources.ts` |
| Models | `test/golden/inputs/**`, `$ELK_MODELS_DIR` (pinned `ac5af2ba…`: `tests/layered/**`, `tickets/layered/**`, `examples/**`) |
| Oracle | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH; `MODELS_REPO` for the JUnit suites |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, every landed recorder and script (7a–7f, the label
  metrics recorder excepted for its texts list, G8), any landed file under `test/golden/refs/` except
  `layered-label-metrics.json` (G8), `test/helpers/*-fixtures.ts`, the landed replay helpers (new files import them), except
  the files G11 lists.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`,
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone** (check `uptime`; `ps` for orphaned
vitest workers; rerun timeout-only failures at normal load):

```bash
npm run format:check && npm run typecheck && npm run complexity   # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk                        # incl. entry points and staged classes
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90
env $SWEEPS npm test                                              # ≤ baseline + 20 s (stop 11)
npx vitest run src/alg/layered/LayeredLabelsVectors.test.ts       # alone ≤ 30 s, from T12
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-labels.json, M refs/java/layered-label-metrics.json (added keys only, G8 test),
#   A inputs/**, M inputs/manifest.json, A corpus/labels-sweep.test.ts
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options        # byte-identical
for v in framework phase order placement routing site pipeline; do bash tools/vectors/layered-$v-vectors.sh <s>/$v; done
#   each ref cmp-identical to test/golden/refs/java (landed refs still reproduce)
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms && git diff --exit-code test/golden/refs/elk*   # at mission end
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <java-baseline.md's suites>   # start and end
git show --name-only --format= HEAD                               # ⊆ the task's write-set
```

`npm run docs:build` green before T19 is marked done. Parallel agents never run `npm run coverage` and never commit.

## Stop conditions: halt, journal, wait for the user

[stop-conditions.md](stop-conditions.md) lists all 22 (confirmed at planning). The ones most likely to arise: 1 write-set, 3
AD-13, 17 divergence (a hashed container's order, except G3's pre-decided debug-JSON property order), 19 a formerly pinned row
that cannot replay for a non-port-defect reason, 20 a label-metrics entry changes, 22 anything outside this repo and local
`../elk` worktree branches.

## Push-forward: decide and journal

Splits (sections behind a facade, nested types in prefixed files, helpers at Java boundaries); rows, label-manager kinds and new
step ops with their TS twins; suite allocation by plan dump or a TS throw naming 7g/7h; appending missing label texts under G8's
proof; AD-10 insertion order with a twin where iteration is observable; sweep stride, timeout and 7g/7h refusals; U with its Java
line; unsigned upstream fix branches (G10); agent prompts, scratch directories, test organisation, prose typos per CLAUDE.md, 1–3
line pre-existing fixes, timeout-only reruns, journal rows, `.agent-notes/layered-labels.md`, commit messages.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorder, replay helpers, label metrics | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Ports: labels, end labels, comments, unzipper, debug, visitor | T4a, T4b, T5, T6, T7, T8, T9, T10 | 1 | [x] |
| [3](batch-3/overview.md) | Wiring, pre-approved assertions, unpinning | T11 | 2 | [x] |
| [4](batch-4/overview.md) | Replay every row | T12 | 3 | [x] |
| [5](batch-5/overview.md) | Ported suites | T13a, T13b, T13c | 4 | [x] |
| [6](batch-6/overview.md) | Coverage map; label sweep | T14, T15 | 4 | [x] |
| [7](batch-7/overview.md) | Site rows | T16 | 6 | [x] |
| [8](batch-8/overview.md) | Anchored unit tests | T17a, T17b | 7 | [x] |
| [9](batch-9/overview.md) | Upstream fix branches | T18 | 8 | [x] |
| [10](batch-10/overview.md) | Docs, roadmap, summary, 7g hand-off | T19 | 9 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[java-baseline.md](java-baseline.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md) · `unreached.md` (written by T14)

## Mission summary (2026-11-06)

**Tasks.** 23 of 23 planned (T1–T19 with T4a–b, T13a–c, T17a–b) done in ten batches, plus fix commits on T2 (four, all
in the replay helpers), T9 (one, G11a) and three push-forward appends to T3's metrics table. Every batch's gates ran alone
and passed. T14's classification and T19's documents were drafted by an agent and checked by the orchestrator (journaled);
T18 ran beside T16 once its inputs were done.

**Exit evidence.**

- `layered-labels.json`: 1,305 rows (full 399, models 640, scenarios 224, sites 42), 14,315,720 bytes; every row replays at
  AD-4 through the real pipeline (`LayeredLabelsVectors.test.ts`, about 7 s alone); the 7 logged rows compare whole
  recordings under G3/G3a; FX2's parallel end labels equal the oracle in both `END_LABELS` orders.
- The 59 rows pinned to 7f2 replay their recorded expectations (57 `layered-pipeline.json`, 2 `layered-phases.json`); one
  7g row stays pinned; `site/provider/flat` and `cancelled` compare their recorded layout (FX5).
- The 11 Java suites of `java-baseline.md` pass with the Java's own assertions, plus the `NodeMarginCalculatorTest` and
  `SortByInputModelProcessorTest` hand-offs (vendored scope; corpus-wide, the only failures are 7g's
  `SelfLoopPreProcessor`); the oracle runs equal `java-baseline.md` at mission start and end.
- The label sweep matches 935 of 935 `ok` cases at stride 1 (1,105 cases over 221 models), refusals only in 7g's (105) and
  7h's (50) categories, 15 throw-parity cases.
- `LayeredLayoutProvider.layout` lays out labels, comments, unzipping and logging; self loops, wrapping and compaction throw
  naming 7g, `INCLUDE_CHILDREN` 7h; `staged-classes.json` holds no 7f2 row; the 15 new entry points import in a fresh
  process.
- Landed vectors, goldens and refs are unchanged (8 vector programs and both goldens regenerations reproduce byte for
  byte); `layered-label-metrics.json` only gained keys (1,380 → 2,258, the G8 test pins the old entries).

**Decisions during the run (user).** G3a: debug strings print identity hashes through the shim and are compared with the
hashes normalised. G11a: the `OrthogonalEdgeRouter` logging test G11 missed flips to the Java's logged tags. 88 journal
rows record executor decisions, fixes and gates.

**Divergences fixed at origin.** None in the port: no row, suite or sweep case needed a change to a ported class after its
own task. The four defects found were in the replay helpers, each with its artifact in the journal: detached baseline
ports and edges that left the graph missing from the labels dump; the label manager twin's class name and `toString`;
`.elkt` values no Java enum has kept as option proxies; `LabelManagementOptions` unregistered.

**Gates.** See the batch rows and the T19 rows of the journal: last full run format, typecheck, complexity, architecture
and melk clean; coverage 99.05 / 97.17 / 99.12 / 99.06; `npm test` within baseline + 20 s at similar load throughout
(74.3 s baseline; back-to-back differences −10 to +19 s under foreign load).

**Flags for the user.** Upstream (G10): two unsigned local branches `fix/end-label-group-self-add` and
`fix/end-label-group-order` in `../elk-end-label-group-*` worktrees and an issue draft for BF/DF model-order layering —
the commands are in the journal's T18 `handover` rows; further candidates there (visitor `IndexOutOfBoundsException`,
dead `ABOVE` arms, dead reverser label checks) need your call. Five `SPACE_EFFICIENT_LAYER` mutants survive on the one
row that reaches them. Follow-ups: `plans/roadmap.md` § Revision 2026-11-06 (layered-labels).
