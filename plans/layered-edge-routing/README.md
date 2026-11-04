<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered edge routing — Mission Brief (mission 7e)

## Objective

Port phase 5 of `org.eclipse.elk.alg.layered`: `p5edges` (`EdgeRouterFactory`, `OrthogonalEdgeRouter`,
`PolylineEdgeRouter`), `p5edges.orthogonal` with `direction` (10 files), `p5edges.splines` (6 files, `SplineSegment`
unstaged) — 6,798 Java lines — plus the six intermediate processors a routed result needs (R1, 1,566 lines moved from
7f): `HyperedgeDummyMerger`, `HierarchicalPortPositionProcessor`, `LayerSizeAndGraphHeightCalculator` (before P5),
`LongEdgeJoiner`, `NorthSouthPortPostprocessor`, `FinalSplineBendpointsCalculator` (the spline tail). About 8,400
Java lines. `ElkLayered` and `GraphConfigurator` stay staged for 7f.

Exit:

- every row of the new `test/golden/refs/java/layered-routing.json` (models) and `layered-routing-steps.json`
  (scenarios, sites, calls) replays at the AD-4 bar: node geometry, layer sizes, graph size and offset, edge bend and
  junction points within 1e-6, spline segment summaries and orders exact (R3);
- the three ported JUnit invariants pass over their rows (`BasicEdgeRouterTest`, `Issue726Test`,
  `LayerSizeAndGraphHeigthCalculatorTest`); the Java suites run on the oracle at mission start and end with
  `runs=550 / 550 / 1 failures=0` (R10);
- `EdgeRouterFactory`'s three arms and six more `IntermediateProcessorStrategy` arms instantiate; the enum's
  `create` chain lives in a section file (R5); every strategy enum, the factory and the provider import cleanly in a
  fresh process (R4);
- the local sweep at the P4 and P5 stops over the 550 ptolemy models matches when `ELK_MODELS_DIR` is present (R11);
- landed vectors, goldens and refs are unchanged (`layered-placement.json` included); no `src/index.ts` export;
  `staged-classes.json` loses only the `SplineSegment` row.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); the earlier decision sets they
   name also apply (7d's N1–N12, 7c's C1–C13, 7b's SC/B/E rows, 7a's L/S/X rows in particular).
3. Read `.agent-notes/layered-node-placement.md`, `layered-crossing-min.md` and `layered-cycles-layers.md`; state
   what affects the approach (the enum import cycle and the E1 recipe, `-XX:hashCode=2` and identity-hash order,
   `initElkReflect` for hand-built graphs, timed gates under foreign load, per-row v8 coverage, private scratchpad
   subdirectories, the label-path scheme, `ImmutableSet.has` vs `EnumSet.contains`).
4. Branch: if `feature/layered-edge-routing` does not exist, `git switch -c feature/layered-edge-routing` from
   `main`, then `git add plans/layered-edge-routing && git commit -m "docs(plans): add layered-edge-routing mission brief"`;
   otherwise `git switch feature/layered-edge-routing`.
5. Run the Java baseline once (R10) and journal the counts:
   `MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p5edges.BasicEdgeRouterTest org.eclipse.elk.alg.layered.intermediate.LayerSizeAndGraphHeigthCalculatorTest org.eclipse.elk.alg.layered.issues.Issue726Test`
   (about 40 s). Any count but `runs=550 failures=0`, `runs=550 failures=0`, `runs=1 failures=0` is stop 18.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-edge-routing`, branched from `main` at or after `ec74a3c` (the PR 27 merge).

- **Commits:** one **unsigned** commit per task (`--no-gpg-sign`), subject `<type>(TN): <desc>` (Conventional
  Commits, ≤72 chars, lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 14):** keep the per-task history on `feature/layered-edge-routing-backup`; regroup into **at most
  5 commits**, each body listing its task ids (R13), each typechecking and passing the suite alone in a scratch
  worktree with absolute `ELK_*` dirs exported (adapt the grouping where a commit needs another's files):
  1. `test(layered): record routing, scenario, site and call vectors from the oracle` — T1, T13, T12's recorder and script;
  2. `feat(layered): split the processor factory and port the routing processors` — T2, T5's processors;
  3. `feat(layered): port edge routing` — T3, T4, T5's router, T6, T7, T8, T9, T10, T12's test and helper;
  4. `test(layered): anchor unit tests on oracle routing rows` — T14a, T14b;
  5. `docs(layered): record mission 7e, its plan, decisions and follow-ups` — brief, T11, T15, batch markers.

  The regrouped tree is byte-identical to the backup. Journal the regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-edge-routing
gh pr create --base main --head feature/layered-edge-routing   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Recorder pattern | `tools/vectors/LayeredPlacementVectors.java` lines 1–1,822 and 1,926–2,075 + `layered-placement-vectors.sh` (7d; copy the core, cite the origin) |
| Replay patterns | `test/helpers/layered-placement-replay-*.ts` (7d), `layered-order-replay-*.ts` (7c), `layered-phase-replay-*.ts` (7b), `layered-framework-replay.ts` (7a) |
| Models | `test/golden/inputs/**` (9 ptolemy + 46 `.elkt` + 4 tickets), `$ELK_MODELS_DIR` (pinned `ac5af2ba…`: 550 ptolemy; `tests/layered/{splines,hyperedge_merging,hierarchical_ports}/**`, `tickets/layered/{726,341,371}_*.elkt`) |
| Oracle | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH; `MODELS_REPO` for the JUnit suites |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java,LayeredPhaseVectors.java,layered-phase-vectors.sh,
  LayeredOrderVectors.java,layered-order-vectors.sh,LayeredPlacementVectors.java,layered-placement-vectors.sh}`,
  `tools/oracle/{order-sweep.sh,phase-sweep.sh,placement-sweep.sh,java-tests.sh}`, any landed file under
  `test/golden/refs/`, `test/helpers/*-fixtures.ts`, the 7a helpers (`layered-framework-replay.ts`,
  `layered-site-replay*.ts`, `lgraph-site-*.ts`, `transform-site-*.ts`), the 7b helpers (`layered-phase-replay-*.ts`),
  the 7c helpers (`layered-order-replay-*.ts`, `layered-order-sweep.ts`), the 7d helpers
  (`layered-placement-replay-*.ts`, `layered-placement-sweep.ts`) or the 7c-tests creators under `test/helpers/`;
  7e helpers import them.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs or agent test runs (check `uptime`; `ps` for orphaned vitest workers; rerun timeout-only failures at
normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk             # all pass, incl. the entry-point fitness test (T10 adds EdgeRouterFactory)
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent npm run coverage   # 90/90/90/90
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent npm test           # ≤ baseline + 5 s (stop 11)
npx vitest run src/alg/layered/LayeredRoutingVectors.test.ts                 # alone ≤ 25 s (stop 11)
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-routing.json, A refs/java/layered-routing-steps.json, A inputs/tests/layered/{splines,hyperedge_merging,hierarchical_ports}/**,
#   A inputs/tickets/layered/{726,341,371}_*.elkt, M inputs/manifest.json, A corpus/routing-sweep.test.ts
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options            # generated files byte-identical
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
tools/vectors/layered-placement-vectors.sh <s>/p && cmp <s>/p/layered-placement.json test/golden/refs/java/layered-placement.json
#   (the 7a/7b/7c scripts likewise, as the 7d README lists them)   # landed refs still reproduce
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p5edges.BasicEdgeRouterTest \
  org.eclipse.elk.alg.layered.intermediate.LayerSizeAndGraphHeigthCalculatorTest org.eclipse.elk.alg.layered.issues.Issue726Test   # 550/550/1, 0 failures (start, end)
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T15 is marked done.
- Parallel agents never run `npm run coverage` and never commit; the orchestrator commits per task.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's).
   Off limits: everything under "Never edit" above, `src/core/**`, `src/graph/**`, `src/alg/common/**`, `src/java/**`,
   `src/alg/layered/{graph,p1cycles,p2layers,p3order,p4nodes}/**` and the 7b/7c/7d processors.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one
   location is edited three times in a row for the same check.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion;
   a hand-derived numeric expectation (L4); a `models/*` or `scenarios/*` row needing re-recording after T1 lands.
4. **Locked decisions:** a change would contradict R1–R14, 7d's N-rows, 7c's C-rows, 7b's SC/B/E rows, 7a's L/S/X
   rows, earlier missions' decisions or AD-1…AD-16; a 7e class needs a later-mission member that L1 cannot stage.
5. **Recorder refusal:** a planned row's prefix names a processor outside the 7b + 7c + 7d + 7e sets and the refusal
   is not one of R1's categories; or the recorder meets a nested LGraph.
6. **Randomness:** a row's seed is 0, or a 7e class draws from anything but `InternalProperties.RANDOM` (R7).
7. **Recursion:** a deep-path case overflows under `--jitless` after the R8 rewrite, or a twin comparison diverges.
8. **Unreachable branch** that no step or call scenario can reach and that is not provably dead from the Java (a
   provable one is U with its Java line, journaled, not a stop).
9. **Scenario count:** T11 finds more than about 30 numeric site scenarios.
10. **Coverage:** below 90/90/90/90 after T14, except shortfalls journaled as U.
11. **Suite time:** more than about 5 s added to `npm test` over the [baseline](decisions.md#baseline) at similar
    load, or `LayeredRoutingVectors.test.ts` over 25 s alone.
12. **Byte-identity:** `regen-goldens.sh`, the five landed vector scripts or `melk:generate` change a landed file.
13. **Size:** a ref file exceeds 5 MiB after the R2 trimming order, or `LayeredRoutingVectors.java` exceeds 3,000 lines.
14. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.
15. **Temporal dead zone (R4):** the entry-point fitness test fails after wiring and the E1 recipe (lazy defaults,
    lazy static configurations, in-function reads) does not resolve it; an entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Geometry divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside
    the 7e write-sets, a last-ulp difference the sweep's exact hash rejects, or a divergence traced to the iteration
    order of a value-hashed set (R9); the known-divergence list and the hash-order remedy are the user's call.
18. **Java baseline drift:** the start or end run of the three suites is not `550 / 550 / 1` with `failures=0`.
19. **Call rows (R12):** a `calls` row needs an argument or result the C4 encoder and the T3 summary cannot carry.

## Push-forward: decide and journal

- **Splits:** section modules behind a facade (P1), nested types in prefixed files (M15), helpers at Java method,
  section, switch-arm or loop boundaries (Java order and names kept); overload names per `alg-common.md` §6.5.
- **Rows:** which small graphs become `scenarios/*`, the variant-set membership, the R2 trimming order when a cap
  nears, which after-P5 stops a level records, a new step or call op in the recorder and in the T3 ops helper when a
  scenario needs it (existing rows byte-identical), which stops carry port geometry beyond N3's rule.
- **R8/B8:** which candidates are true recursions, explicit-stack loop shapes, twin shape, deep-case size.
- **AD-10:** identity-hashed sites use insertion order, one journal row each; the `KVector`-keyed membership sets use
  `KVector.equals` semantics.
- **L1:** staging a referenced later-mission member with only the referenced members (journal; `staged-classes.json`);
  the mission-internal `PolylineEdgeRouter.ts` predicate stub (T2 → T5).
- **Sweep:** stride, per-case timeout, accepted-refusal additions within R1's categories; skip when `ELK_MODELS_DIR`
  is absent.
- **Coverage:** journaling a U branch with its Java line instead of recording a row; which J items already have cases.
- **Housekeeping:** the `DecimalFormat("#0.0")` one-decimal formatter (R6), agent prompts and resumption, a private
  scratchpad subdirectory per parallel agent, test-file organisation, test-local helpers under `test/helpers/`, prose
  typos per the CLAUDE.md carve-out, 1–3 line pre-existing fixes in touched files, timeout-only reruns at lower load,
  wording of tests, journal rows, `.agent-notes/layered-edge-routing.md` and commit messages.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Routing recorder, enum split and stubs, replay foundation | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Orthogonal; polyline and the processors; spline data; NURBS | T4, T5, T6, T7 | 1 | [x] |
| [3](batch-3/overview.md) | The spline router | T8 | 2 | [x] |
| [4](batch-4/overview.md) | Final spline bend points | T9 | 3 | [x] |
| [5](batch-5/overview.md) | Wire the arms; replay every row; the three JUnit ports | T10 | 4 | [x] |
| [6](batch-6/overview.md) | Replay-alone coverage map; breadth sweep | T11, T12 | 5 | [x] |
| [7](batch-7/overview.md) | Site and call rows for unreached branches | T13 | 6 (T11) | [x] |
| [8](batch-8/overview.md) | Anchored unit tests | T14a, T14b | 7 | [x] |
| [9](batch-9/overview.md) | Docs, roadmap, summary | T15 | 8 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md) ·
[unreached.md](unreached.md) (written by T11)

## Mission summary (2026-11-03)

**Tasks.** 16 of 16 done (T1–T15 with T14a/T14b), nine batches, one session; commits unsigned per task plus four
`fix` commits (three T3 helper reconciliations with the real rows, one T13 inventory update) and eight `docs(plans)`
markers, regrouped at stop 14 (below).

**Exit evidence.**

- `test/golden/refs/java/layered-routing.json` (666 `models`, 5,190,239 bytes) and `layered-routing-steps.json`
  (94 `scenarios`, 25 `sites`, 158 `calls`, 1,734,502 bytes), byte-stable, every row replayed at the AD-4 bar by
  `LayeredRoutingVectors.test.ts` (949 cases, about 5 s alone; geometry within 1e-6, orders exact; full dumps under ten
  nodes); the three JUnit invariants verbatim over their rows (97 / 1 / 97); the Java suites on the oracle
  `runs=550 / 550 / 1 failures=0` at mission start and end.
- `EdgeRouterFactory`'s three arms and the six 7e processor arms instantiate (tally 7b 10 / 7c 10 / 7d 5 / 7e 6 /
  7f 19 / 7g 9, 31 ported); the enum's `create` chain lives in a section; the entry-point fitness test stays green after
  wiring with no E1 edit.
- Sweep (R11): 6,728 cases over all 550 ptolemy models at the P4 and three P5 stops, 6,280 ok (all match at stride 1
  and 2), 448 `SELF_LOOP_PREPROCESSOR` refusals, 0 throws, 0 timeouts.
- Landed vectors, goldens and refs unchanged (the 7a–7d scripts reproduce their refs byte for byte, `regen-goldens.sh`
  byte-identical); no `src/index.ts` export; `staged-classes.json` lost only the `SplineSegment` row.
- 62 anchored unit cases cite a site or call row; per-class branch coverage 100 % for 20 of 46 files, every shortfall
  U-explained; whole-suite coverage 98.86 / 96.88 / 99.01 / 98.86.

**Decisions taken during the run (journal).** R2 trimming to a four-model variant set and the trim set for ptolemy
POLYLINE/SPLINES and joiner rows; six oracle-throwing hierarchical-port levels skipped via `ORACLE_THROWS`; six call
argument kinds beyond the brief; three landed-helper gaps twinned in the 7e helpers (removed-element encoding,
`EdgeRouting` registry, the `splines.route.start` ignore); `isStraight`/`isNormalNode` as module functions of
`SplineSegment.ts`; the sweep in a sibling launcher (`LayeredRoutingSweep.java`); self loops and the compaction option
promoted to S scenarios under the 7c/7d step-row precedent; `anchorY` unboxing check (AD-16); recorder comments
compacted to stay under 3,000 lines.

**Divergences fixed at origin.** None reached the oracle rows: `anchorY`'s silent null; a hand-derived `isStraight`
expectation (replaced by a twin, L4). No numeric divergence between the port and the oracle in 943 rows and 6,280
sweep cases.

**Gates (final).** Format, typecheck, complexity, architecture + melk, coverage 98.86 / 96.88 / 99.01 / 98.86, every
commit ⊆ its write-set, refs diff = the two refs, the 32 inputs, the manifest and the sweep test, melk byte-identical,
the 7a–7d vector scripts and the goldens reproduce, `npm test` 58.3 s against the 62.5 s baseline, the routing replay
5.0 s against 25 s, `docs:build` green.

**Flags for the user.**

1. **R9 is unobservable in 7e, not proven.** Every multi-edge spline segment on the rows has exactly two edges and the
   bend-point calculator's per-edge bodies are independent (a reversal test pins it); `SplineEdgeRouter.getSplinePath`
   reads the first edge of a hyperedge only under a compaction strategy other than `NONE` → 7g rechecks (stop 17 never
   arose).
2. **Six `hierarchical_ports` levels throw in the oracle** under POLYLINE/SPLINES (`AdjacencyList` NPE: only the
   orthogonal router adds `HIERARCHICAL_PORT_CONSTRAINT_PROCESSOR`); skipped via `ORACLE_THROWS`, no rows; candidate
   upstream report.
3. **Caps.** The recorder is at 2,998 of 3,000 lines (sweep modes in a sibling launcher); `layered-routing.json` is
   52,641 bytes under 5 MiB; `layered-placement.json` still 644 bytes under (7d flag). The next recording or recorder
   change needs a decision.
   _Resolved 2026-11-03 (user decision after stop 14):_ the ref cap is 16 MiB and the recorder cap 5,000 lines for
   every layered recorder; the five recorders' `MAX_BYTES` constants were raised in a sixth commit on this branch
   (journal row `caps`, roadmap revision 2026-11-03 "caps raised").
4. **Write-set extensions journaled rather than stopped:** `LayeredRoutingSweep.java` (T12), the T13 inventory fixes in
   T14's test files, the orchestrator's `anchorY` edit in T6's file.
5. **Ticket 341 has no rows** (`elk.direction: UP` puts `GraphTransformer` first); its unnecessary-bendpoint arms are
   covered by the variant family on other models.
6. **Follow-ups** are in the roadmap revision (the three Medium splitter arms, `devAssert`, the duplicated
   factories/callers blocks, 7g's self-loop and compaction hand-offs).
