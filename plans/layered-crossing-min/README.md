<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered crossing minimization — Mission Brief (mission 7c)

## Objective

Port phase 3 of `org.eclipse.elk.alg.layered`: `p3order` (16 classes, 4,037 Java lines), `p3order.counting` (6,
1,450), `intermediate.greedyswitch` (5, 1,114), `intermediate.preserveorder` (3, 1,032) and the eight intermediate
processors a default pipeline runs between phase 2 and phase 3 — `PortSideProcessor`, `PortListSorter`,
`LongEdgeSplitter`, `InvertedPortProcessor`, `NorthSouthPortPreprocessor`, `HierarchicalPortConstraintProcessor`,
`SemiInteractiveCrossMinProcessor`, `SortByInputModelProcessor` (2,350) — about 10,000 Java lines (C2). The
hand-built JUnit suites and their four graph creators go to the sibling brief `7c-tests` (C1). `ElkLayered` and
`GraphConfigurator` stay staged for 7f.

Exit:

- every row of the new `test/golden/refs/java/layered-order.json` replays at the AD-4 bar: `models/*` (the real
  pipeline through P3, a greedy-switch processor or one of the eight processors on the vendored models, C3),
  `scenarios/*` (step-built graphs per class), `sites/*` (every branch the replays leave untaken);
- the ten portable `LayoutTestRunner` JUnit tests pass as invariants over the replayed graphs of their configurations
  (`BasicCrossingMinimizationTest`, `ForsterConstraintResolverTest`, `ModelOrderBarycenterHeuristicTest`,
  `PortListSorterTest`, `LongEdgeSplitterTest`, `InvertedPortProcessorTest`, `PortSideProcessorTest`,
  `NorthSouthPortPreprocessorTest`, `SortByInputModelProcessorTest`, `BasicConsiderModelOrderTest`);
- the four `CrossingMinimizationStrategy` arms and ten more `IntermediateProcessorStrategy` arms instantiate; every
  strategy enum and the metadata provider import cleanly in a fresh process (C5);
- the local 550-model sweep at the P3 stop matches when `ELK_MODELS_DIR` is present;
- landed vectors, goldens and refs are unchanged; no `src/index.ts` export; `staged-classes.json` gains only L1 stagings.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); the earlier decision sets they
   name also apply (7b's SC1–SC4, B1–B10, E1–E2a and 7a's L1–L7, S1–S4, X1–X7 in particular).
3. Read `.agent-notes/layered-cycles-layers.md` and `layered-framework.md`; state what affects the approach (the
   enum import cycle and its lazy-getter recipe, `Integer` box identity, the `StretchWidth`/`Tarjan` hangs, options on
   the imported target, the `-XX:hashCode=2` guard, the sub-list views).
4. Branch: if `feature/layered-crossing-min` does not exist, `git switch -c feature/layered-crossing-min` from `main`,
   then `git add plans/layered-crossing-min && git commit -m "docs(plans): add layered-crossing-min mission brief"`;
   otherwise `git switch feature/layered-crossing-min`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-crossing-min`, branched from `main` at or after `3205251` (the PR 24 merge).

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 14):** keep the per-task history on `feature/layered-crossing-min-backup`; regroup into **at most
  5 commits**, each body listing its task ids (C12), each typechecking and passing the suite alone in a scratch
  worktree with absolute `ELK_*` dirs (adapt the grouping where a commit needs another's files, as 7b did):
  1. `test(layered): record order, scenario and site vectors from the oracle` — T1, T3, T11, T10's recorder/script;
  2. `feat(layered): port the processors crossing minimization needs` — T2, T4a, T4b, T5;
  3. `feat(layered): port crossing minimization` — T6, T7, T8, T10's test;
  4. `test(layered): anchor unit tests on oracle order rows` — T12a–T12c;
  5. `docs(layered): record mission 7c, its plan, decisions and follow-ups` — brief, T9, T13, batch markers.

  The regrouped tree is byte-identical to the backup. Journal the regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-crossing-min
gh pr create --base main --head feature/layered-crossing-min   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Recorder pattern | `tools/vectors/LayeredPhaseVectors.java` + `layered-phase-vectors.sh` (7b; copy the core, cite the origin) |
| Replay patterns | `test/helpers/layered-phase-replay-*.ts` (7b), `layered-framework-replay.ts`, `layered-site-replay*.ts` (7a) |
| Models | `test/golden/inputs/**` (9 ptolemy + 12 `.elkt`), `$ELK_MODELS_DIR` (pinned `ac5af2ba…`: 550 ptolemy JSON, `tests/layered/**`, `tickets/layered/**`) |
| Oracle | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java,LayeredPhaseVectors.java,layered-phase-vectors.sh}`,
  any landed file under `test/golden/refs/`, `test/helpers/*-fixtures.ts`, the 7a helpers
  (`layered-framework-replay.ts`, `layered-site-replay*.ts`, `lgraph-site-*.ts`, `transform-site-*.ts`) or the 7b
  helpers (`layered-phase-replay-*.ts`); 7c helpers import them.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs or agent test runs (check `uptime`; rerun timeout-only failures at normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk             # all pass, incl. the entry-point fitness test (T2)
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent npm run coverage   # exit 0; 90/90/90/90
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent npm test           # ≤ baseline + 5 s (stop 11)
npx vitest run src/alg/layered/LayeredOrderVectors.test.ts                   # alone ≤ 20 s (stop 11)
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-order.json, A inputs/tests/layered/**, A inputs/tickets/layered/*, M inputs/manifest.json
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options            # generated files byte-identical
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
tools/vectors/layered-framework-vectors.sh <s>/x && tools/vectors/layered-site-vectors.sh <s>/y \
  && tools/vectors/layered-phase-vectors.sh <s>/z && cmp <s>/x/layered-framework.json test/golden/refs/java/layered-framework.json \
  && cmp <s>/y/layered-sites.json test/golden/refs/java/layered-sites.json \
  && cmp <s>/z/layered-phases.json test/golden/refs/java/layered-phases.json   # 7a/7b refs still reproduce
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T13 is marked done.
- Parallel agents never run `npm run coverage` and never commit; the orchestrator commits per task.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's).
   Off limits: everything under "Never edit" above, `src/core/**`, `src/graph/**`, `src/alg/common/**`, `src/java/**`,
   `src/alg/layered/{graph,p1cycles,p2layers}/**`; T2's melk config edit is the pre-approved exception (C5).
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one
   location is edited three times in a row for the same check.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a
   hand-derived numeric expectation (L4); a `models/*` or `scenarios/*` row needing re-recording after T1 lands.
4. **Locked decisions:** a change would contradict C1–C12, 7b's SC/B/E rows, 7a's L/S/X rows, earlier missions'
   decisions or AD-1…AD-16; a 7c class needs a later-mission member that L1 cannot stage.
5. **Recorder refusal:** a planned row's prefix names a processor outside the 7b + 7c sets and the refusal is not one
   of C2's categories; or the recorder meets a nested LGraph.
6. **Randomness:** a row's seed is 0, or a 7c class draws from `Random` anywhere but `BarycenterHeuristic`, the
   thoroughness loop of `LayerSweepCrossingMinimizer` and `ISweepPortDistributor.create`.
7. **Recursion:** a deep-path case overflows under `--jitless` after the B8 rewrite, or a twin comparison diverges.
8. **Unreachable branch** that no step scenario can reach and that is not provably dead from the Java (a provable
   one is U with its Java line, journaled, not a stop).
9. **Scenario count:** T9 finds more than about 25 numeric site scenarios.
10. **Coverage:** below 90/90/90/90 after T12, except shortfalls journaled as U.
11. **Suite time:** more than about 5 s added to `npm test` over the [baseline](decisions.md#baseline) at similar
    load, or `LayeredOrderVectors.test.ts` over 20 s alone.
12. **Byte-identity:** `regen-goldens.sh`, the three landed vector scripts or `melk:generate` change a landed file.
13. **Size:** `layered-order.json` exceeds 5 MB after the trimming rule (C3), or `LayeredOrderVectors.java` exceeds
    3,000 lines.
14. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.
15. **Temporal dead zone (C5):** the entry-point fitness test fails after wiring and the E1 recipe (lazy defaults,
    lazy static configurations, in-function reads) does not resolve it; an entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Write-through (C9):** the reversed port-side view does not write through to the proxy.

## Push-forward: decide and journal

- **Splits:** section modules behind a facade (P1), nested types in prefixed files (M15), helpers at Java method,
  section, switch-arm or loop boundaries (Java order and names kept); overload names per `alg-common.md` §6.5.
- **Rows:** which small graphs become `scenarios/*`, how many `models/*` option variants, the trimming rule when the
  5 MB cap nears (thoroughness and greedy-switch variants first); a new step op in the recorder and in the 7c ops
  helper when a scenario needs it, existing rows byte-identical.
- **AC6/B8:** which candidates are true recursions (C7), explicit-stack loop shapes, twin shape, deep-case size.
- **AD-10:** identity-hashed sites use insertion order, one journal row each; `Sets.newTreeSet` snapshot (C8).
- **L1:** staging a referenced later-mission member with only the referenced members (journal; `staged-classes.json`).
- **Sweep:** stride, per-case timeout, accepted-refusal additions within C2's categories; skip when `ELK_MODELS_DIR`
  is absent.
- **Coverage:** journaling a U branch with its Java line instead of recording a row; which J items already have cases.
- **Housekeeping:** agent prompts and resumption, test-file organisation, test-local helpers under `test/helpers/`,
  prose typos per the CLAUDE.md carve-out, 1–3 line pre-existing fixes in touched files, timeout-only reruns at
  lower load, wording of tests, journal rows, `.agent-notes/layered-crossing-min.md` and commit messages.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Order recorder, entry-point gate, replay foundation | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Before-P3 processors; counting and preserve-order | T4a, T4b, T5 | 1 | [x] |
| [3](batch-3/overview.md) | p3order lower half | T6 | 2 | [x] |
| [4](batch-4/overview.md) | p3order upper half, greedy switch, strategy arms | T7 | 3 | [x] |
| [5](batch-5/overview.md) | Wire the processor arms; replay every row; invariant tests | T8 | 4 | [x] |
| [6](batch-6/overview.md) | Replay-alone coverage map; breadth sweep | T9, T10 | 5 | [x] |
| [7](batch-7/overview.md) | Site rows for unreached branches | T11 | 6 (T9) | [x] |
| [8](batch-8/overview.md) | Anchored unit tests | T12a, T12b, T12c | 7 | [x] |
| [9](batch-9/overview.md) | Docs, roadmap, summary | T13 | 8 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md) ·
[unreached.md](unreached.md) (written by T9)

## Mission summary (2026-10-30)

**Tasks:** 16 planned tasks done (T1–T13 with T4a/b and T12a–c) in one session on 2026-10-30, one commit each plus
fix commits (`fix(T2)` the enum preparation, `fix(T3)` ×2 replay-helper gaps, `fix(T4b)` the C13 defaults, `fix(T7)`
the 7a sentinel, `fix(T11)` the per-class row inventories) and `docs(plans)` markers. T9 and T13 ran in the main
session; T1, T10 and T11 on java-architect; T2–T8 and T12a–c on typescript-pro (batches 2/3, 6 and 8 in parallel).
One stop: stop 1 at T4b (the stored `cmEnforcedGroupOrders` default needed `src/graph/util/ElkReflect.ts` and the melk
emitter, both off limits); the user approved the fix as C13. No other stop fired.

**Exit evidence:**

- `test/golden/refs/java/layered-order.json`: 808 rows (`models` 657, `scenarios` 89, `sites` 62), 3,761,948 bytes, JDK
  21.0.1, oracle `8aaa3c14`, JVM `-XX:hashCode=2`, byte-stable (cold `cmp` and cache hit); the 746 pre-T11 rows
  byte-identical after T11. `LayeredOrderVectors.test.ts` replays all 808 by name at the AD-4 bar in 4.35 s alone, with
  every node's port order compared exactly; step rows under ten nodes also match the full 7a dump.
- Ten JUnit invariant tests ported verbatim over the replayed rows of their Java configurations.
- Breadth sweep (B6): 6,728 oracle cases at the P3 stop over 550 ptolemy models (6,280 ok, 448 refused, 0 throws,
  0 timeouts); the port's canonical hash equals the oracle's for every ok case at stride 1 (89 s) and stride 2 (48 s).
- `unreached.md`: 388 untaken branches classified (T9), 62 site rows reach every reachable S arm, 88 anchored cases
  cite them (T12a–c); every class under 90 % branches is explained by U items or unreached arms with a named mechanism
  (§ T11 and T12 corrections).
- Gates at every batch: format, typecheck, complexity, architecture+melk 410, refs name-status (the allowed additions,
  the manifest, and T10's sweep test), melk byte-identity, the 7a/7b vector scripts byte-identical; coverage
  99.01 / 96.96 / 99.03 / 99.01 after batch 8; `npm test` 68.2 s (batch 2/3, load 10.5), 60.4 s (batch 4), 58.3 s
  (batch 5), 60.4 s (batch 6), 65.6 s (batch 7, load 5.7), 55.9 s (batch 8, load 5.7, the orphaned worker gone)
  against the 63.3 s baseline.

**Divergences fixed at origin:** a list-literal option default stored by the TS `getProperty` (C13: the melk emitter
freezes list defaults, `ElkReflect.isCloneable` rejects frozen objects; 25 `SortByInputModelProcessor` rows); a
creation-counter tie-break in the hyperedge comparators replaced by the oracle's constant identity hash (returns 0);
two replay-helper gaps (`java.util.HashMap` twins in `compareOrder`, detached baseline edges in `orderDump`); two
hand-traced nested-graph expectations reduced to invariants (L4).

**Follow-ups and flags for the user** (details in the journal and `plans/roadmap.md` § Revision 2026-10-30):

- The sibling brief **7c-tests** (C1): the four graph creators and the hand-built suites, to plan before 7d.
- 7h re-measures the nested-graph paths (89 branches, 36 functions); 7f the three label-dummy branches, the
  `preserve_order` models with labels and `PortListSorterTest.testMonotonicalCoordinates`.
- 20 arms no recorded graph reaches, kept as unreached with their mechanism and scans (`unreached.md` § T11
  corrections); none is a stop-8 case.
- The recorder is at 2,995 of its 3,000-line cap; post-P3 full dumps carry no port sides or anchors; the site-row
  replay block is duplicated across the anchored test files; plain `+` crossing sums in the greedy switch and sweep
  decider; the `devAssert` helper was never created.
- An orphaned elk-ts vitest worker (PID 41148) ran for 29 hours and inflated the timed gates until the user killed it
  during batch 8; the 63.3 s baseline was probably measured with it present.
