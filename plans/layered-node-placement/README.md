<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered node placement — Mission Brief (mission 7d)

## Objective

Port phase 4 of `org.eclipse.elk.alg.layered`: `p4nodes` (4 placers, 2,479 Java lines), `p4nodes.bk` (7 classes,
2,313) and the five intermediate processors a P4 stop needs — `InnermostNodeMarginCalculator`,
`LabelAndNodeSizeProcessor` (the baseline runs both before P4), `InLayerConstraintProcessor` (every P3 phase declares
it), `HierarchicalPortDummySizeProcessor` (external ports), `NodePlacementRepeater` (flexibility, after P4) — 607
lines moved from 7f (N1). About 5,400 Java lines. `ElkLayered` and `GraphConfigurator` stay staged for 7f.

Exit:

- every row of the new `test/golden/refs/java/layered-placement.json` replays at the AD-4 bar: `models/*` (the real
  pipeline through P4 per `NodePlacementStrategy`, the BK variant matrix, the flexibility variants, each of the five
  processors), `scenarios/*` (step-built graphs per class), `sites/*` (every branch the replays leave untaken);
  `geometry` (node position, size, margin; layer sizes; port and label positions where the stop moves them) within
  1e-6, orders exact (N3);
- the `BasicNodePlacementTest` invariant passes over the replayed rows of its 14 configurations; the Java suite runs
  on the oracle at mission start and end with `runs=8008 failures=0` (N9);
- the five `NodePlacementStrategy` arms and five more `IntermediateProcessorStrategy` arms instantiate; every strategy
  enum and the metadata provider import cleanly in a fresh process (N4);
- the local 550-model sweep at the P4 stop matches when `ELK_MODELS_DIR` is present (N10);
- landed vectors, goldens and refs are unchanged; no `src/index.ts` export; `staged-classes.json` gains only the
  `DebugUtil` row (N8).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); the earlier decision sets they
   name also apply (7c's C1–C13, 7b's SC/B/E rows, 7a's L/S/X rows in particular).
3. Read `.agent-notes/layered-crossing-min.md`, `layered-crossing-min-tests.md` and `layered-cycles-layers.md`; state
   what affects the approach (the enum import cycle and the E1 recipe, `Integer` box identity, `-XX:hashCode=2` and
   identity-hash arithmetic, `initElkReflect` for hand-built graphs, the full dump's missing port sides, timed gates
   under foreign load, per-row v8 coverage, private scratchpad subdirectories).
4. Branch: if `feature/layered-node-placement` does not exist, `git switch -c feature/layered-node-placement` from
   `main`, then `git add plans/layered-node-placement && git commit -m "docs(plans): add layered-node-placement mission brief"`;
   otherwise `git switch feature/layered-node-placement`.
5. Run the Java baseline once (N9) and journal the counts:
   `MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p4nodes.BasicNodePlacementTest`
   (`ELK_MODELS_DIR` defaults to `../../eclipse-elk/elk-models`; about 50 s). Any count but `runs=8008 failures=0` is
   stop 18.
6. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-node-placement`, branched from `main` at or after `4730792` (the PR 26 merge).

- **Commits:** one **unsigned** commit per task (`--no-gpg-sign`), subject `<type>(TN): <desc>` (Conventional
  Commits, ≤72 chars, lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 14):** keep the per-task history on `feature/layered-node-placement-backup`; regroup into **at most
  5 commits**, each body listing its task ids (N12), each typechecking and passing the suite alone in a scratch
  worktree with absolute `ELK_*` dirs (adapt the grouping where a commit needs another's files):
  1. `test(layered): record placement, scenario and site vectors from the oracle` — T1, T11, T10's recorder and script;
  2. `feat(layered): port the processors node placement needs` — T2, T4;
  3. `feat(layered): port node placement` — T3, T5, T6, T7, T8, T10's test and helper;
  4. `test(layered): anchor unit tests on oracle placement rows` — T12a, T12b;
  5. `docs(layered): record mission 7d, its plan, decisions and follow-ups` — brief, T9, T13, batch markers.

  The regrouped tree is byte-identical to the backup. Journal the regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-node-placement
gh pr create --base main --head feature/layered-node-placement   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Recorder pattern | `tools/vectors/LayeredOrderVectors.java` lines 1–1,926 + `layered-order-vectors.sh` (7c; copy the core, cite the origin) |
| Replay patterns | `test/helpers/layered-order-replay-*.ts` (7c), `layered-phase-replay-*.ts` (7b), `layered-framework-replay.ts` (7a) |
| Models | `test/golden/inputs/**` (9 ptolemy + 24 `.elkt`), `$ELK_MODELS_DIR` (pinned `ac5af2ba…`: 550 ptolemy, `tests/layered/node_placement/**` 22 `.elkt`) |
| Oracle | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH; `MODELS_REPO` for the JUnit suite |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java,LayeredPhaseVectors.java,layered-phase-vectors.sh,
  LayeredOrderVectors.java,layered-order-vectors.sh}`, `tools/oracle/{order-sweep.sh,phase-sweep.sh,java-tests.sh}`,
  any landed file under `test/golden/refs/`, `test/helpers/*-fixtures.ts`, the 7a helpers (`layered-framework-replay.ts`,
  `layered-site-replay*.ts`, `lgraph-site-*.ts`, `transform-site-*.ts`), the 7b helpers (`layered-phase-replay-*.ts`),
  the 7c helpers (`layered-order-replay-*.ts`, `layered-order-sweep.ts`) or the 7c-tests creators
  (`test/helpers/{TestGraphCreator,InLayerEdgeTestGraphCreator,NorthSouthEdgeTestGraphCreator}.ts`); 7d helpers import them.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs or agent test runs (check `uptime`; `ps` for orphaned vitest workers; rerun timeout-only failures at
normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk             # all pass, incl. the entry-point fitness test (T2)
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent npm run coverage   # 90/90/90/90
PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent npm test           # ≤ baseline + 5 s (stop 11)
npx vitest run src/alg/layered/LayeredPlacementVectors.test.ts               # alone ≤ 20 s (stop 11)
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-placement.json, A inputs/tests/layered/node_placement/**, M inputs/manifest.json
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options            # generated files byte-identical
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
tools/vectors/layered-framework-vectors.sh <s>/w && tools/vectors/layered-site-vectors.sh <s>/x \
  && tools/vectors/layered-phase-vectors.sh <s>/y && tools/vectors/layered-order-vectors.sh <s>/z \
  && cmp <s>/w/layered-framework.json test/golden/refs/java/layered-framework.json \
  && cmp <s>/x/layered-sites.json test/golden/refs/java/layered-sites.json \
  && cmp <s>/y/layered-phases.json test/golden/refs/java/layered-phases.json \
  && cmp <s>/z/layered-order.json test/golden/refs/java/layered-order.json   # 7a/7b/7c refs still reproduce
MODELS_REPO=$ELK_MODELS_DIR bash tools/oracle/java-tests.sh org.eclipse.elk.alg.layered.p4nodes.BasicNodePlacementTest  # runs=8008 failures=0 (start, end)
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T13 is marked done.
- Parallel agents never run `npm run coverage` and never commit; the orchestrator commits per task.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's).
   Off limits: everything under "Never edit" above, `src/core/**`, `src/graph/**`, `src/alg/common/**`, `src/java/**`,
   `src/alg/layered/{graph,p1cycles,p2layers,p3order}/**` and the 7b/7c processors; T2's melk config edit is the
   pre-approved exception (N4).
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one
   location is edited three times in a row for the same check.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a
   hand-derived numeric expectation (L4); a `models/*` or `scenarios/*` row needing re-recording after T1 lands.
4. **Locked decisions:** a change would contradict N1–N12, 7c's C-rows, 7b's SC/B/E rows, 7a's L/S/X rows, earlier
   missions' decisions or AD-1…AD-16; a 7d class needs a later-mission member that L1 cannot stage.
5. **Recorder refusal:** a planned row's prefix names a processor outside the 7b + 7c + 7d sets and the refusal is
   not one of N1's categories; or the recorder meets a nested LGraph.
6. **Randomness:** a row's seed is 0, or a 7d class draws from `Random` anywhere (none is expected).
7. **Recursion:** a deep-path case overflows under `--jitless` after the N6 rewrite, or a twin comparison diverges.
8. **Unreachable branch** that no step scenario can reach and that is not provably dead from the Java (a provable
   one is U with its Java line, journaled, not a stop).
9. **Scenario count:** T9 finds more than about 25 numeric site scenarios.
10. **Coverage:** below 90/90/90/90 after T12, except shortfalls journaled as U.
11. **Suite time:** more than about 5 s added to `npm test` over the [baseline](decisions.md#baseline) at similar
    load, or `LayeredPlacementVectors.test.ts` over 20 s alone.
12. **Byte-identity:** `regen-goldens.sh`, the four landed vector scripts or `melk:generate` change a landed file.
13. **Size:** `layered-placement.json` exceeds 5 MB after the trimming rule (N3), or `LayeredPlacementVectors.java`
    exceeds 3,000 lines.
14. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.
15. **Temporal dead zone (N4):** the entry-point fitness test fails after wiring and the E1 recipe (lazy defaults,
    lazy static configurations, in-function reads) does not resolve it; an entry-order import is never the fix.
16. **Box provenance (C6):** a Java `==`/`!=` on boxed values whose operands cannot be proven fresh or shared.
17. **Geometry divergence:** a coordinate differs from the oracle by more than 1e-6 with the mechanism traced outside
    the 7d write-sets, or a last-ulp difference the sweep's exact hash rejects (the known-divergence list is the
    user's call).
18. **Java baseline drift:** the start or end run of `BasicNodePlacementTest` is not `runs=8008 failures=0`.

## Push-forward: decide and journal

- **Splits:** section modules behind a facade (P1), nested types in prefixed files (M15), helpers at Java method,
  section, switch-arm or loop boundaries (Java order and names kept); overload names per `alg-common.md` §6.5.
- **Rows:** which small graphs become `scenarios/*`, the variant-set membership, the trimming order when the cap nears
  (N3: the BK matrix to the variant set first), a new step op in the recorder and in the T3 ops helper when a
  scenario needs it (existing rows byte-identical), which stops carry port and label geometry beyond N3's three kinds.
- **N6/B8:** which candidates are true recursions, explicit-stack loop shapes, twin shape, deep-case size.
- **AD-10:** identity-hashed sites use insertion order, one journal row each.
- **L1:** staging a referenced later-mission member with only the referenced members (journal; `staged-classes.json`).
- **Sweep:** stride, per-case timeout, accepted-refusal additions within N1's categories; skip when `ELK_MODELS_DIR`
  is absent.
- **Coverage:** journaling a U branch with its Java line instead of recording a row; which J items already have cases.
- **Housekeeping:** agent prompts and resumption, a private scratchpad subdirectory per parallel agent, test-file
  organisation, test-local helpers under `test/helpers/`, prose typos per the CLAUDE.md carve-out, 1–3 line
  pre-existing fixes in touched files, timeout-only reruns at lower load, wording of tests, journal rows,
  `.agent-notes/layered-node-placement.md` and commit messages.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Placement recorder, entry-point gate, replay foundation | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | The five processors; the four placers and Brandes-Köpf | T4, T5, T6, T7 | 1 | [x] |
| [3](batch-3/overview.md) | Wire the arms; replay every row; the invariant test | T8 | 2 | [x] |
| [4](batch-4/overview.md) | Replay-alone coverage map; breadth sweep | T9, T10 | 3 | [x] |
| [5](batch-5/overview.md) | Site rows for unreached branches | T11 | 4 (T9) | [x] |
| [6](batch-6/overview.md) | Anchored unit tests | T12a, T12b | 5 | [x] |
| [7](batch-7/overview.md) | Docs, roadmap, summary | T13 | 6 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md) ·
[unreached.md](unreached.md) (written by T9)

## Mission summary (2026-11-02)

**Tasks.** 15 of 15 done (T1–T13 with T12a/T12b), seven batches, one session; commits unsigned per task plus two
`fix(T11)` inventory commits and seven `docs(plans)` markers, regrouped at stop 14 (below).

**Exit evidence.**

- `test/golden/refs/java/layered-placement.json`: 604 rows (`models` 494, `scenarios` 84, `sites` 26), 5,242,236
  bytes, byte-stable, every row replayed at the AD-4 bar by `LayeredPlacementVectors.test.ts` (609 cases, 4.4 s alone at
  settled load; geometry within 1e-6, orders exact; full dumps under ten nodes).
- `BasicNodePlacementTest.testProperCoordinates` verbatim over the P4 rows of its 15 runs (236 cases); the Java suite
  on the oracle `runs=8008 failures=0` at mission start (96 s at load 12) and end.
- The five `NodePlacementStrategy` arms and five `IntermediateProcessorStrategy` arms instantiate (tally
  7b 10 / 7c 10 / 7d 5 / 7f 25 / 7g 9); the entry-point fitness test stays green after wiring.
- Sweep (N10): 8,410 cases, 1,970 ok (all match, stride 1 and 2), 6,440 refused in N1 categories, 0 throws, 0 timeouts.
- Landed vectors, goldens and refs unchanged; no `src/index.ts` export; `staged-classes.json` gained the `DebugUtil`
  row only.

**Decisions taken during the run (journal).** Variant set trimmed to `ptolemy-producer` + three `.elkt` with the BK
matrix on two of them, and six planned site-row variants not recorded (5 MiB cap; push-forward "variant-set
membership"); L4 enforced on three agents' hand-built tests (removed, routed through T9 → T11 → T12); the T4 un-skip
assigned to T8's write-set; `BasicNodePlacementTest` has 15 runs, not 14; chain-forced site rows for the N/S label arms
and `westOutput`; `BKNodePlacerFeasibility.ts:70` J → U; stop 11 decided by an interleaved A/B under foreign load.

**Divergences fixed at origin.** None reached the oracle rows. A draft's `.origin(lEdge)` chains on two auxiliary
edges (the Java discards the argument too) were removed before commit.

**Gates (final).** Format, typecheck, complexity, architecture + melk, coverage 99.02 / 96.99 / 99.05 / 99.02, every
commit ⊆ its write-set, refs diff = the new ref, the 22 inputs, the manifest and the sweep test, melk byte-identical,
the 7a/7b/7c vector scripts reproduce their refs; `npm test` stop 11 clear by A/B (−2 s mean delta, ±10 s noise under
a foreign load of 22–61; settled-load branch reading 56.3 s vs the 64.2 s baseline).

**Flags for the user.**

1. **The 5 MiB ref cap is 644 bytes away.** Any later row touching `layered-placement.json` (7e re-records, a two-dummy
   `HIERARCHICAL_PORT_DUMMY_SIZE_PROCESSOR` row) needs a decision: raise the cap (N3 amendment), split the ref per
   group, or compact the `changed` encoding.
2. **Variant set and unrecorded rows** (journal T1 and T11 push-forward rows): the 22 `.elkt` are vendored but only
   three carry variant families; six planned site variants are unrecorded (their arms are reached by kept rows).
3. **`IntermediateProcessorStrategy.ts` is at 499 lines**: 7e must split the enum's `create` switch first.
4. **Agent briefs for ported classes should state L4 explicitly** (three agents wrote Java-derived behavioural tests).

**Follow-ups** are in `plans/roadmap.md` § Revision 2026-11-02 and `.agent-notes/layered-node-placement.md`.
