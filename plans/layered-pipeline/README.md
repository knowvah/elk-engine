<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered pipeline — Mission Brief (mission 7f, first brief of row 7f)

## Objective

Make the layered pipeline run. Port `ElkLayered` and `GraphConfigurator`, the `components` package except
`ComponentsCompactor`, `GraphTransformer`, `HierarchicalPortOrthogonalEdgeRouter`, `EndLabelSorter`,
`HypernodesProcessor` and `ConstraintsPostprocessor`: about 5,190 Java lines and six enum arms (F1). The second brief
of the row, 7f2 `layered-labels`, ports the label family, comments, `AlternatingLayerUnzipper`,
`InteractiveLayeredGraphVisitor` and the debug utilities.

Exit:

- every row of the new `test/golden/refs/java/layered-pipeline.json` replays at the AD-4 bar (F3, F4);
- the four `test/golden/refs/elk/ptolemy-*` goldens equal the TS layout (F4), unregenerated;
- every landed `models/*` row of `layered-phases.json`, `layered-order.json`, `layered-placement.json` and
  `layered-routing.json` replays through the real `ElkLayered` with a plan equal to its `prefix` (F5, SC4);
- the Java suites T1 allocates to this brief pass in TS with the Java's own assertions, and `failures=0` on the oracle
  at mission start and end (F7, F8, [java-baseline.md](java-baseline.md));
- the local sweep over the 550 ptolemy models matches at stride 1 when `ELK_MODELS_DIR` is present, refusals only in
  F1's categories (F6);
- `LayeredLayoutProvider.layout` runs; labels and comments throw naming 7f2, self loops, wrapping and compaction 7g,
  `INCLUDE_CHILDREN` 7h; fresh-process imports succeed (F10);
- landed vectors, goldens and refs are unchanged; no `src/index.ts` export; `staged-classes.json` loses `ElkLayered` and
  gains `ComponentsCompactor`, `CompoundGraphPreprocessor`, `CompoundGraphPostprocessor`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); the earlier decision sets they name
   also apply (7e's R1–R14, 7d's N1–N12, 7c's C1–C13, 7b's SC/B/E rows, 7a's L/S/X rows in particular).
3. Read `.agent-notes/layered-edge-routing.md`, `layered-edge-routing-planning.md`, `layered-node-placement.md`,
   `layered-crossing-min.md` and `layered-cycles-layers.md`; state what affects the approach (the enum import cycle and
   the E1 recipe, `-XX:hashCode=2` and identity-hash order, `initElkReflect` for hand-built graphs, unboxing checks,
   removed-element encoding in dumps, row inventories and `CALLERS` tables, timed gates under foreign load, private
   scratchpad subdirectories, files written through Bash bypassing the complexity hook, ugrep vs `/usr/bin/grep`).
4. Branch: if `feature/layered-pipeline` does not exist, `git switch -c feature/layered-pipeline` from `main`, then
   `git add plans/layered-pipeline .agent-notes/layered-edge-routing-planning.md .agent-notes/layered-pipeline-planning.md && git commit -m "docs(plans): add layered-pipeline mission brief"`;
   otherwise `git switch feature/layered-pipeline`.
5. Run the full Java baseline once and journal it (F8):
   `MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <the 54 classes of java-baseline.md>`. Any difference from
   [java-baseline.md](java-baseline.md) is stop 18.
6. Re-measure `npm test` on `main` (every sweep dir `/nonexistent`), at the quietest load available, and journal it as the stop 11 baseline ([decisions.md](decisions.md#baseline)). Invoke the two new scripts as `bash tools/...`, which the existing permission rules allow.
7. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-pipeline`, branched from `main` at or after `2d4c2b7` (the PR 28 merge).

- **Commits:** one **unsigned** commit per task (`--no-gpg-sign`), subject `<type>(TN): <desc>` (Conventional Commits, ≤72
  chars, lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 14):** keep the per-task history on `feature/layered-pipeline-backup`; regroup into **at most 5
  commits**, each body listing its task ids (F15), each typechecking and passing the suite alone in a scratch worktree
  with absolute `ELK_*` dirs exported (adapt the grouping where a commit needs another's files):
  1. `test(layered): record pipeline vectors from the oracle` — T1, T15, T14's oracle script;
  2. `feat(layered): port the connected components placers and processors` — T2, T4, T5, T6, T7;
  3. `feat(layered): run the layered pipeline end to end` — T3, T8, T9, T10, T14's test and helper;
  4. `test(layered): port full-layout suites and anchor unit tests` — T11, T12a–c, T16a, T16b;
  5. `docs(layered): record mission 7f, its plan, decisions and follow-ups` — brief, T13, T17, batch markers.

  The regrouped tree is byte-identical to the backup. Journal the regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-pipeline
gh pr create --base main --head feature/layered-pipeline   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What             | Where                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Java spec, `J`   | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/`                                                                                                      |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/`; S1 suites under `test/org.eclipse.elk.alg.common.test` and `test/org.eclipse.elk.core.test`       |
| Test framework   | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.test/src/org/eclipse/elk/alg/test/framework/` (read for semantics; `LayoutTestRunner`, `WhiteboxRecorder`; F7 ports a subset, not line by line)    |
| Recorder pattern | `tools/vectors/LayeredRoutingVectors.java` lines 1–1,857, `LayeredRoutingSweep.java`, `layered-routing-vectors.sh` (7e; copy the core, cite the origin)                                     |
| Replay patterns  | `test/helpers/layered-routing-replay-*.ts` (7e), `layered-placement-replay-*.ts` (7d), `layered-order-replay-*.ts` (7c), `layered-phase-replay-*.ts` (7b), `layered-framework-replay.ts` (7a) |
| Export twin      | `test/helpers/graph-json-oracle.ts` (`exportLikeOracle`), `test/golden/compare-json.ts` (`compareLayout`), `tools/oracle/harness/CaseRunner.java:59,87-92`                                  |
| Models           | `test/golden/inputs/**`, `$ELK_MODELS_DIR` (pinned `ac5af2ba…`: 550 ptolemy; `tests/layered/**`, `tickets/layered/**`)                                                                      |
| Oracle           | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH; `MODELS_REPO` for the JUnit suites                                                                                                               |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, the 7b–7e recorders and scripts
  (`LayeredPhaseVectors`, `LayeredOrderVectors`, `LayeredPlacementVectors`, `LayeredRoutingVectors`, `LayeredRoutingSweep`
  and their `.sh`), `tools/oracle/{order-sweep.sh,phase-sweep.sh,placement-sweep.sh,routing-sweep.sh,java-tests.sh}`, any
  landed file under `test/golden/refs/`, `test/helpers/*-fixtures.ts`, the 7a helpers except `layered-site-replay.ts`
  (F9, T8 only), the 7b–7e helpers (`layered-{phase,order,placement,routing}-replay-*.ts`, `layered-*-sweep.ts`) or the
  7c-tests creators; 7f helpers import them.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with JVM
jobs or agent test runs (check `uptime`; `ps` for orphaned vitest workers; rerun timeout-only failures at normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk             # all pass, incl. the entry-point fitness test (T8 adds three)
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                           # 90/90/90/90
env $SWEEPS npm test                                   # ≤ baseline + 20 s (stop 11)
npx vitest run src/alg/layered/LayeredPipelineVectors.test.ts   # alone ≤ 30 s (stop 11), from T9
npx vitest run src/alg/layered/LayeredPipelineReplay.test.ts    # alone ≤ 30 s (stop 11), from T10
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-pipeline.json, A inputs/** (T1, T12), M inputs/manifest.json, A corpus/pipeline-sweep.test.ts
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options   # generated files byte-identical
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
tools/vectors/layered-routing-vectors.sh <s>/r && cmp <s>/r/layered-routing.json test/golden/refs/java/layered-routing.json
#   (steps file and the 7a/7b/7c/7d scripts likewise, as the 7e README lists them)   # landed refs still reproduce
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh <this brief's classes>   # java-baseline.md counts (start, end)
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T17 is marked done.
- Parallel agents never run `npm run coverage` and never commit; the orchestrator commits per task.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's). Off
   limits: everything under "Never edit" above, `src/core/**`, `src/graph/**`, `src/alg/common/**`, `src/java/**`,
   `src/alg/layered/{graph,p1cycles,p2layers,p3order,p4nodes,p5edges}/**` and the 7b–7e processors. The F9 files are the
   only exception, in T2 and T8 only.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one location is
   edited three times in a row for the same check.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion, unless it
   is an F9 assertion; a hand-derived numeric expectation (L4); a `full`, `models` or `scenarios` row needing re-recording
   after T1 lands.
4. **Locked decisions:** a change would contradict F1–F16, earlier missions' decisions or AD-1…AD-16; a 7f class needs a
   later-mission member that L1 cannot stage.
5. **Recorder refusal:** a planned row's plan names a member outside the ported sets and the refusal is not in F1's
   categories (labels and comments 7f2; self loops, wrapping, compaction 7g; nested 7h).
6. **Randomness:** a row's seed is 0, or a ported class draws from anything but `InternalProperties.RANDOM`. The
   `new Random()` arm of `configureGraphProperties` is proven structurally only, never in a row.
7. **Recursion:** a deep-path case overflows under `--jitless` after the F11 rewrite, or a twin comparison diverges.
8. **Unreachable branch** that no scenario can reach and that is not provably dead from the Java (a provable one is U with
   its Java line, journaled, not a stop).
9. **Scenario count:** T13 finds more than about 30 numeric site scenarios.
10. **Coverage:** below 90/90/90/90 after T16, except shortfalls journaled as U.
11. **Suite time:** `npm test` more than baseline + 20 s at similar load ([baseline](decisions.md#baseline)), or
    `LayeredPipelineVectors.test.ts` or `LayeredPipelineReplay.test.ts` over 30 s alone.
12. **Byte-identity:** `regen-goldens.sh`, the landed vector scripts or `melk:generate` change a landed file.
13. **Size:** a ref file exceeds 16 MiB, or `LayeredPipelineVectors.java` exceeds 5,000 lines.
14. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.
15. **Temporal dead zone (F10):** the entry-point fitness test fails after wiring and the E1 recipe does not resolve it; an
    entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside the write-sets,
    a last-ulp difference the sweep's exact hash rejects, or a difference traced to the iteration order of a hashed
    container (including one in `components`); the known-divergence list and any hash-order remedy are the user's call.
18. **Java baseline drift:** the start or end run of a suite in scope differs from [java-baseline.md](java-baseline.md).
19. **F4 hash check:** the flagged recorder and an unflagged `refs/elk/ptolemy-*` golden disagree. T1 halts before recording
    any other row.
20. **SC4 mismatch that is not a plain port defect:** a landed `models/*` row cannot replay through the real driver because
    its recording assumed something the driver does not do (the `normalise` mirror differing from `GraphConfigurator`, for
    example). Landed rows and their assertions stay frozen; the user decides.
21. **Allocation shift:** T1's plan dump moves more than about a third of the planned suites out of this brief, or a
    suite's oracle run count cannot be reproduced over its inputs.

## Push-forward: decide and journal

- **Splits:** section modules behind a facade (P1), nested types in prefixed files (M15), helpers at Java method, section,
  switch-arm or loop boundaries (Java order and names kept); overload names per `alg-common.md` §6.5; a further split of
  T12a if it runs long.
- **Rows:** which small graphs become `scenarios/*`, which options join the `full` families (direction, routing, alignment,
  border offsets, model order, interactive), a new step op in the recorder and T3's ops helper (existing rows byte-identical).
- **Suites:** each suite's allocation as long as it follows the plan dump or a TS throw naming a later mission, one journal
  row each; vendoring more inputs a suite needs.
- **F11:** which candidates are true recursions, explicit-stack shapes, twin shape, deep-case size.
- **AD-10:** identity-hashed sites use insertion order, one journal row each; value-keyed membership sets keep `equals`
  semantics.
- **L1:** staging a referenced later-mission member with only the referenced members (journal; `staged-classes.json`).
- **Sweep:** stride, per-case timeout, accepted-refusal additions within F1's categories; skip when `ELK_MODELS_DIR` is absent.
- **Coverage:** journaling a U branch with its Java line instead of recording a row; which J items already have cases.
- **Housekeeping:** agent prompts and resumption, a private scratchpad subdirectory per parallel agent, test-file
  organisation, test-local helpers under `test/helpers/`, prose typos per the CLAUDE.md carve-out, 1–3 line pre-existing
  fixes in touched files, timeout-only reruns at lower load, wording of tests, journal rows,
  `.agent-notes/layered-pipeline.md` and commit messages.

## Batch progress

| Batch                     | Name                                                | Tasks             | Depends on | Status |
| ------------------------- | --------------------------------------------------- | ----------------- | ---------- | ------ |
| [1](batch-1/overview.md)  | Recorder and allocation, stages and tally, helpers  | T1, T2, T3        | —          | [x]    |
| [2](batch-2/overview.md)  | Components; transformer; hierarchical router; three | T4, T5, T6, T7    | 1          | [x]    |
| [3](batch-3/overview.md)  | The driver: configurator, `ElkLayered`, arms, F9    | T8                | 2          | [x]    |
| [4](batch-4/overview.md)  | Replay every row; goldens; SC4 re-replay            | T9, T10           | 3          | [x]    |
| [5](batch-5/overview.md)  | The JUnit runner subset                             | T11               | 3          | [x]    |
| [6](batch-6/overview.md)  | Ported full-layout suites                           | T12a, T12b, T12c  | 5          | [x]    |
| [7](batch-7/overview.md)  | Replay-alone coverage map; breadth sweep            | T13, T14          | 4          | [x]    |
| [8](batch-8/overview.md)  | Site rows for unreached branches                    | T15               | 7 (T13)    | [x]    |
| [9](batch-9/overview.md)  | Anchored unit tests                                 | T16a, T16b        | 8          | [x]    |
| [10](batch-10/overview.md) | Docs, roadmap, summary, 7f2 hand-off               | T17               | 9          | [x]    |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) · [java-baseline.md](java-baseline.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md) ·
`suite-allocation.md` (written by T1) · `unreached.md` (written by T13)


## Mission summary (2026-11-05)

**Tasks.** 18 of 18 planned (T1–T17 with T12a–c and T16a–b) done in ten batches, plus fix commits on T1, T3 (four) and
T11. Every batch's gates ran alone and passed.

**Exit evidence.**

- `layered-pipeline.json`: 1,239 rows; 1,181 replay at AD-4, 58 pinned to a later stage (FX7); the four
  `refs/elk/ptolemy-*` goldens equal the TS layout, unregenerated; the F4 check found them byte-identical under the flag.
- Every landed `models` row of the 7b–7e refs replays through the real `ElkLayered` with plan equality: 2,349 of 2,351, 2
  pinned (FX6).
- 28 Java suites allocated here pass with the Java's own assertions; the oracle runs of this brief's 24 baseline suites
  and the 4 S1 suites equal `java-baseline.md` at mission start and end.
- The sweep matches 6,646 of 6,646 `ok` cases at stride 1; refusals only in F1's categories (600, self loops).
- `LayeredLayoutProvider.layout` runs; labels and comments throw naming 7f2, self loops, wrapping and compaction 7g,
  `INCLUDE_CHILDREN` 7h; the 12 entry points import in a fresh process.
- Landed vectors, goldens and refs are unchanged (all eight vector programs and both goldens regenerations reproduce
  byte for byte); no `src/index.ts` export; `staged-classes.json` lost `ElkLayered` and gained `ComponentsCompactor` and
  the two compound processors.

**Decisions during the run (user).** FX1 strict F8 allocation; FX2 `EndLabelSorter` insertion order with a 7f2
scenario; FX3 `ComponentGroup` size hash; FX4 flip of a temporary T5 test; FX5 the provider rows throw 7f2 and label-free
site rows prove the driver; FX6 and FX7 pin 60 rows to their stage; FX8 recorded label metrics for the runner. About 60
journal rows record executor decisions and fixes.

**Divergences fixed at origin.** None in the port: no row, suite or sweep case needed a change to a ported class beyond
its own task (T8's test caught its own `NODE_PLACEMENT_REPEATER` slot before landing). Defects found and fixed were in
the test harness: `planNames` misnaming same-class members, component step ops, plan capture outside the run, the stop
row baseline (T3); T1's inputs closing the 7a recorder's tree; a direction-mode pairing in three test files (T6, T7);
missing label sizing and `@DefaultConfiguration` defaults in the runner (T11).

**Gates.** Last batch: format, typecheck, complexity, architecture and melk clean; coverage 98.83 / 96.80 / 98.96 /
98.83; `npm test` 62–90 s depending on foreign load, within the 96.3 s budget; the two replay files 6–10 s alone.

**Flags for the user.** The label metrics are a macOS snapshot (FX8); FX3's remedy is unobservable in final layouts on
the corpus; `../elk` is past the pin with no change in scope. Follow-ups: `plans/roadmap.md` § Revision 2026-11-05.
