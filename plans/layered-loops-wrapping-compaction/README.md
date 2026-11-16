<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered loops, wrapping, compaction — Mission Brief (mission 7g, issue #35)

## Objective

Make self loops, graph wrapping and compaction run in the layered pipeline. Port `intermediate/loops/**`, `intermediate/wrapping/**`,
`intermediate/compaction/**`, `compaction/**`, the four self-loop processors, `DummySelfLoopProcessor` and `ComponentsCompactor`
(about 12,190 Java lines), wire the 9 pending 7g arms of `IntermediateProcessorStrategy`, and close the hand-offs of
`plans/roadmap.md` § Revision 2026-11-06 (layered-labels) "Hand-offs to 7g" (W1).

Exit (issue #35 "done when"):

- every row of the new `test/golden/refs/java/layered-loops.json` replays at the AD-4 bar through the real pipeline;
- the formerly pinned row `models/ptolemy-sinewaveoptimization/N1/DIRECTION_PREPROCESSOR/DOWN` replays its recorded expectation
  (W4); `full/labels/ticket-213_componentsCompaction` is a row; the loops sweep matches at stride 1 with its pipeline-sweep (600)
  and label-sweep (105) parts recorded, refusals only in 7h's categories (W5);
- the 10 suites of [java-baseline.md](java-baseline.md) pass in TS with the Java's own assertions; the oracle runs equal the
  baseline at mission start and end; the corpus-wide runs of W8's five suites end with 0 failures;
- `NodeMarginCalculatorTest` runs its `SelfLoopRouter` hook; R9 is rechecked under compaction (W7); the 3 U items are reached or
  re-classified (W10);
- the enum tally shows only 7h's `HIERARCHICAL_NODE_RESIZER` pending; `staged-classes.json` holds no 7g row; fresh-process
  imports succeed;
- landed vectors, goldens and refs are byte-identical; the queue gates pass; one squashed commit on the base (W11);
- `plans/roadmap.md` gains `## Revision <end date> (layered-loops-wrapping-compaction)` with hand-offs to 7h.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full; the queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md);
   7f2's G-rows and 7f's F-rows apply where W1–W14 are silent.
3. Read `.agent-notes/layered-labels.md`, `layered-pipeline.md`, `layered-edge-routing.md`, `recorder-identity-hash.md` and
   `layered-loops-wrapping-compaction-planning.md`; state in the journal what affects the approach (whole-plan refusal; staged
   arms fail at plan build; plans captured in the real run; `-XX:hashCode=2`; the four recorder dump rules; marker-and-row
   staging; `toEqual` on enums is vacuous; shared support inside `src/` must be a `.test.ts`; the launcher masks short stacks).
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is uncommitted, commit it:
   `git add plans/layered-loops-wrapping-compaction .agent-notes/layered-loops-wrapping-compaction-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add layered-loops-wrapping-compaction mission brief"`.
5. Check the oracle stamp (`$ELK_ORACLE_DIR/oracle-build.json` names `tools/oracle/ELK_COMMIT` and patches `0001`, `0002`) and
   `git -C $ELK_SOURCE_DIR diff --stat <pin>..HEAD` over the layered, core, common and layered-test bundles (empty at planning;
   journal any change).
6. Run [java-baseline.md](java-baseline.md)'s command and journal it; any difference is stop 18.
7. Measure `npm test` (every sweep dir `/nonexistent`) and journal it with `uptime` as stop 11's baseline.
8. Find the first batch below marked `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec `J`, tests `JT` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/`, `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Recorder pattern | `tools/vectors/LayeredLabelsVectors.java` (core, `--sweep`/`--dump`, refusal, step ops), `layered-labels-vectors.sh`, `tools/oracle/labels-sweep.sh` |
| Replay pattern | `test/helpers/layered-labels-replay-{rows,ops,logged}.ts`, `layered-pipeline-replay-*.ts`, `layered-labels-sweep.ts` |
| Runner | `test/helpers/layout-test-runner.ts`, `layout-test-labels.ts`, `layout-test-sources.ts`, `ptolemy-suite-sources.ts` |
| Models | `test/golden/inputs/**`; `$ELK_MODELS_DIR` pinned `ac5af2ba…` (`tests/layered/{self_loops,compaction_oned,connected_components,splines}/**`, `tickets/layered/**`, `realworld/ptolemy/**`) |
| Oracle | `$ELK_ORACLE_DIR` (built; check the stamp); JDK 21; `MODELS_REPO` for the suites |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, every landed recorder and script, any landed file under
  `test/golden/refs/`, `test/helpers/*-fixtures.ts`, the landed replay helpers (new files import them); W9's files are the
  only assertion exceptions.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`,
`npx vitest run test/architecture`, in the foreground. After every batch the orchestrator runs these **alone** (check `uptime`;
`ps` for orphaned vitest workers; rerun timeout-only failures at normal load):

```bash
npm run format:check && npm run typecheck && npm run complexity   # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk                        # incl. entry points and staged classes
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90 (the full suite)
env $SWEEPS npm test                                              # ≤ baseline + 20 s (stop 11)
npx vitest run src/alg/layered/LayeredLoopsVectors.test.ts        # alone ≤ 30 s, from T16
git diff --name-status <base> -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-loops.json, A inputs/loops/**, M inputs/manifest.json, A corpus/loops-sweep.test.ts
#   (plus refs/java/layered-label-metrics.json added keys only, if stop 20's push-forward ran)
```

At mission end, additionally (queue gates 1–6 plus the oracle evidence; journal each result):

```bash
npm run docs:build
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options        # byte-identical
for v in framework phase order placement routing site pipeline labels; do bash tools/vectors/layered-$v-vectors.sh <s>/$v; done
#   each ref cmp-identical to test/golden/refs/java (landed refs still reproduce)
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms && git diff --exit-code test/golden/refs/elk*
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <java-baseline.md's suites>   # equal to the baseline
PIPELINE_SUITES_FULL=1 npx vitest run <W8's five suites>          # 0 failures
bash tools/oracle/loops-sweep.sh && npx vitest run test/corpus/loops-sweep.test.ts   # stride 1
```

JVM recorders and sweeps: `uptime` first (above 12, wait), then `nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &`
and foreground polls of at most 9 minutes. Parallel agents never run `npm run coverage` and never commit.

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md) lists 22, in the queue form (a partial block → `needs-ruling`, finish the rest). Most
likely: 3 AD-13, 17 divergence (a hashed container's order, W6/W7), 19 the unpinned row, 22 upstream.

Push-forward (decide and journal): splits (sections behind a facade, nested types in prefixed files, helpers at Java
boundaries); rows, families, trims to fit 16 MiB and step ops with their TS twins; AD-10 insertion order with a twin where
iteration is observable; sweep stride, timeout and 7h refusals; U with its Java line; label texts under G8's proof; agent
prompts, scratch directories, test organisation, prose typos per CLAUDE.md, 1–3 line pre-existing fixes, timeout-only reruns,
journal rows, `.agent-notes/layered-loops-wrapping-compaction.md`, `follow-up` issues for defects outside the mission.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorder, replay helpers, `compaction.oned`, `recthull` | T1, T2, T3, T4 | — | [x] |
| [2](batch-2/overview.md) | Loops model, cut heuristics, intermediate compaction, `compaction.components` | T5, T6, T7, T8 | 1 | [x] |
| [3](batch-3/overview.md) | Loops ordering and routing core, wrapping processors, `ComponentsCompactor` | T9, T10, T11, T12 | 2 | [x] |
| [4](batch-4/overview.md) | Self-loop routers | T13 | 3 | [x] |
| [5](batch-5/overview.md) | Self-loop processors | T14 | 4 | [x] |
| [6](batch-6/overview.md) | Wiring, pre-approved assertions, unpinning | T15 | 5 | [x] |
| [7](batch-7/overview.md) | Replay every row; R9 and AD-10 twins | T16 | 6 | [x] |
| [8](batch-8/overview.md) | Issue suites and corpus runs; coverage map; loops sweep | T17, T18, T19 | 7 | [x] |
| [9](batch-9/overview.md) | Site rows | T20 | 8 | [x] |
| [10](batch-10/overview.md) | Anchored unit tests, mutation checks | T21 | 9 | [x] |
| [11](batch-11/overview.md) | Docs, roadmap revision, notes, squash | T22 | 10 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[java-baseline.md](java-baseline.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md) · `unreached.md` (written by T18)

## Mission summary (2026-11-10)

**Done: 22 of 22 tasks, 11 of 11 batches.** Self loops, graph wrapping and compaction run in the layered pipeline; the enum
tally is 58 arms ported, 1 pending (7h `HIERARCHICAL_NODE_RESIZER`); `staged-classes.json` holds no 7g row.

**Exit evidence** (each a journal row):

- `layered-loops.json`: full 731, models 307, scenarios 525, sites 64; every row replays through the real pipeline with no
  mismatch (`LayeredLoopsVectors.test.ts`, 1,637 tests, 8 s alone).
- The formerly pinned row replays its recorded expectation; `full/converted/labels/ticket-213_componentsCompaction` is a row.
- Loops sweep at stride 1: 3,073 cases (part a 600, part b 105, part c 2,368), 2,997 hash-equal, 0 mismatches, 76 throws on
  both sides, 0 refusals.
- The 10 baseline suites pass in TS with the Java's assertions; the oracle runs at start and end equal the baseline; the
  corpus-wide runs end with 0 failures at the oracle's counts (550, 550, 2,200, 550, 551).
- `NodeMarginCalculatorTest` runs its `SelfLoopRouter` hook; R9 holds for the router and one compaction site matches only in
  insertion order (#54); the three W10 items: one reached, two U with their Java lines.
- Landed vectors, goldens and generated options are byte-identical; queue gates 1–6 pass (coverage 98.78 / 96.75 / 98.77 / 98.79).

**Decisions during the run** (journal `push-forward`/`fix` rows): self-loop processors ported with their packages (batch 2
boundary move); T13 with T14 and T16 with T17 and T19 in parallel; the two router base classes entered through the enum
(T15); the stale ptolemy self-loop filter removed and two corpus-mode timeouts set (T17); NaN-canonical sweep hash (T19);
the label-manager twin follows the row's recorder (T20). **Port defects found by the oracle rows: none**; no 7g class changed
after its port task.

**Flags for the maintainer:** #53 (NaN-canonical hash amends W5), #54 (R9: `SplineSegment.edges` order observable on 7 rows),
#56 (upstream drafts: `GraphStats.java:295-302`, `LabelPlacer.java:296`, `PortRestorer.java:180-188`, `SplineSegment.java:82`,
NaN layouts, oracle throws), all `needs-ruling`; #55 (`follow-up`: 11 mutation survivors and two unreached arms that need new
oracle graphs). The label-metrics table grew by 43 texts.
