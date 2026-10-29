<!-- SPDX-License-Identifier: EPL-2.0 -->

# Layered cycles and layers — Mission Brief (mission 7b)

## Objective

Port the first two layered phases of `org.eclipse.elk.alg.layered`: `p1cycles` (11 cycle breakers, 1,681 Java
lines), `p2layers` (9 layerers, 2,501), the `IntermediateProcessorStrategy` enum (S3) and the ten intermediate
processors that run between the start of the pipeline and phase 3: the five the phases declare
(`EdgeAndLayerConstraintEdgeReverser`, `LayerConstraintPreprocessor`, `LayerConstraintPostprocessor`,
`ReversedEdgeRestorer`, `InteractiveExternalPortPositioner`) and the five `GraphConfigurator` adds by option
(`NodePromotion`, `HighDegreeNodeLayeringProcessor`, `PartitionPreprocessor`, `PartitionMidprocessor`,
`PartitionPostprocessor`); 7,138 Java lines in all. `ElkLayered` and `GraphConfigurator` stay staged for 7f (L2).

Exit:

- every row of the new `test/golden/refs/java/layered-phases.json` replays at the AD-4 bar: `models/*` (the real
  pipeline through P1 or P2 on the vendored models, B1), `scenarios/*` (step-built graphs per class), `sites/*`
  (every branch the replays leave untaken, B7);
- the eight portable JUnit invariant tests pass over the replayed graphs (`BasicCycleBreakerTest`,
  `BasicLayerAssignmentTest`, `BasicModelOrderTest`, `EdgeAndLayerConstraintEdgeReverserTest`,
  `LayerConstraintProcessorTest`, `ReversedEdgeRestorerTest`, `NodePromotionTest`, `PartitionPostProcessorTest`);
- the 18 throwing arms of `CycleBreakingStrategy`/`LayeringStrategy` and the 10 arms of the enum instantiate;
- the local 550-model sweep (B6) matches when `ELK_MODELS_DIR` is present;
- landed vectors and goldens are unchanged; no `src/index.ts` export; `staged-classes.json` gains only L1 stagings.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md) and [decision-journal.md](decision-journal.md); the earlier decision sets they
   name also apply (L1–L7, S1–S4, X1–X7 of 7a in particular).
3. Read `.agent-notes/layered-framework.md`, `alg-common.md` (AC6, `internalId`) and `ad13-rederivation.md`; state
   what affects the approach (vacuous replays X4, sub-list views X7, Gson bare `Infinity`, decision-id collisions).
4. Branch: if `feature/layered-cycles-layers` does not exist, `git switch -c feature/layered-cycles-layers` from
   `main`, then `git add plans/layered-cycles-layers && git commit -m "docs(plans): add layered-cycles-layers mission brief"`;
   otherwise `git switch feature/layered-cycles-layers`.
5. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Branch and landing

Work on `feature/layered-cycles-layers`, branched from `main` at or after `6d7fa4f` (the PR 23 merge).

- **Commits:** one **unsigned** commit per task, subject `<type>(TN): <desc>` (Conventional Commits, ≤72 chars,
  lowercase, no attribution), plus `docs(plans): mark batch N done` per batch.
- **Journal:** cites task ids, never SHAs.
- **Landing (stop 14):** keep the per-task history on `feature/layered-cycles-layers-backup`; regroup into **at
  most 5 commits**, each body listing its task ids (B10):
  1. `test(layered): record phase, scenario and site vectors from the oracle` — T1, T3, T10, T11;
  2. `feat(layered): port the cycle breakers and the constraint processors` — T2, T4, T6;
  3. `feat(layered): port the layerers and the layering processors` — T5, T7, T8;
  4. `test(layered): anchor unit tests on oracle phase rows` — T12a–T12c;
  5. `docs(layered): record mission 7b, its plan, decisions and follow-ups` — brief, T9, T13, batch markers.

  The regrouped tree is byte-identical to the backup; each commit typechecks and passes the suite alone in a scratch
  worktree with absolute `ELK_*` dirs. Journal the regroup on both branches. Then hand the user:

```bash
git rebase --reschedule-failed-exec --exec 'git commit --amend --no-edit -n -S' main
git push -u origin feature/layered-cycles-layers
gh pr create --base main --head feature/layered-cycles-layers   # body: summary + size justification
# merge on GitHub with "Create a merge commit"
```

The executor never signs, pushes, opens a PR or merges.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec, `J` | `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.alg.layered/src/org/eclipse/elk/alg/layered/` |
| Java tests, `JT` | `$ELK_SOURCE_DIR/test/org.eclipse.elk.alg.layered.test/src/org/eclipse/elk/alg/layered/` |
| Recorder patterns | `tools/vectors/{LayeredSiteVectors,LayeredFrameworkVectors}.java` and their `.sh` |
| Replay patterns | `test/helpers/{layered-framework-replay,layered-site-replay*}.ts` |
| Models | `test/golden/inputs/realworld/ptolemy/**` (9), `$ELK_MODELS_DIR` (pinned `ac5af2ba…`, 550 ptolemy JSON, `tests/layered/**`, `tickets/layered/**`) |
| Oracle | `$ELK_ORACLE_DIR` (built); JDK 21 on PATH |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, any landed file under `test/golden/refs/`,
  `test/helpers/*-fixtures.ts`, or the 7a replay helpers (`layered-framework-replay.ts`, `layered-site-replay*.ts`,
  `lgraph-site-*.ts`, `transform-site-*.ts`); 7b helpers import them.

## Quality gates

Agents run their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone**, never concurrently with
JVM jobs (check `uptime`; rerun timeout-only failures at normal load):

```bash
npm run format:check                                   # exit 0
npm run typecheck                                      # exit 0
npm run complexity                                     # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk             # all pass
npm run coverage                                       # exit 0; 90/90/90/90; npm test ≤ baseline + 5 s (stop 11)
git diff --name-status main -- test/golden/refs/ test/corpus/ test/golden/inputs/
#   only: A refs/java/layered-phases.json, A inputs/tests/layered/**, A inputs/tickets/layered/*, M inputs/manifest.json
npm run melk:generate Core Labels Polyomino Layered && git diff --exit-code src/core/options src/core/labels \
  src/alg/common/compaction/options src/alg/layered/options            # generated files byte-identical
tools/oracle/regen-goldens.sh && tools/oracle/regen-goldens.sh --set algorithms \
  && git diff --exit-code test/golden/refs/            # at mission end
tools/vectors/layered-framework-vectors.sh /tmp/x && tools/vectors/layered-site-vectors.sh /tmp/y \
  && diff /tmp/x/layered-framework.json test/golden/refs/java/layered-framework.json \
  && diff /tmp/y/layered-sites.json test/golden/refs/java/layered-sites.json   # 7a refs still reproduce
git show --name-only --format= HEAD                    # ⊆ the task's write-set
```

- `npm run docs:build` green before T13 is marked done.
- Parallel agents never run `npm run coverage` and never commit; the orchestrator commits per task.

## Stop conditions: halt, journal, wait for the user

1. **Write-set:** a file outside the task's write-set needs changing (colocated `.test.ts` files count as the task's).
   Off limits: everything under "Never edit" above, `src/core/**`, `src/graph/**`, `src/alg/common/**`, `tools/melk/**`.
2. **Repeated failure:** the same gate check fails twice in a row (timeout-only at high load excepted), or one
   location is edited three times in a row for the same check.
3. **AD-13:** a byte diff in a landed ref, vector or golden; a test that can only pass by changing its assertion; a
   hand-derived numeric expectation (L4); a `models/*` or `scenarios/*` row needing re-recording after T1 lands.
4. **Locked decisions:** a change would contradict B1–B10, L1–L7, S1–S4, X1–X7, earlier missions' decisions or
   AD-1…AD-16; a 7b class needs a later-mission class that L1 cannot stage by porting only the referenced members.
5. **Recorder refusal:** a planned scenario's prefix names a processor outside the 7b set and dropping the option
   combination leaves a 7b class with no row (B4).
6. **Randomness:** a row's seed is 0, or a 7b class draws from `Random` anywhere but `GreedyCycleBreaker.chooseNode`.
7. **Recursion:** a deep-path case overflows under `--jitless` after the B8 rewrite, or a twin comparison diverges.
8. **Unreachable branch** that no step scenario can reach and that is not provably dead from the Java (a provable
   one is U with its Java line, journaled, not a stop).
9. **Scenario count:** T9 finds more than about 25 numeric site scenarios (re-plan T11/T12 as 7a's X5/X6 did).
10. **Coverage:** below 90/90/90/90 after T12, except shortfalls journaled as U.
11. **Suite time:** more than about 5 s added to `npm test` over the [baseline](decisions.md#baseline) at similar load.
12. **Byte-identity:** `regen-goldens.sh`, the 7a vector scripts or `melk:generate` change a landed file.
13. **Size:** `layered-phases.json` exceeds 5 MB, or `LayeredPhaseVectors.java` exceeds 3,000 lines.
14. **Mission end:** regroup into at most 5 commits as above, then stop and hand over the landing commands.

## Push-forward: decide and journal

- **Splits:** section modules behind a facade (P1), nested types in prefixed files (M15), private helpers at Java
  method, section, switch-arm or loop boundaries (Java order and names kept); overload names per
  `docs/architecture/alg-common.md` §6.5.
- **Rows:** which small graphs become `scenarios/*`, how many `models/*` option variants, within 5 MB (B2); a new
  step op in the recorder and `layered-phase-replay-ops.ts` when a scenario needs it, existing rows byte-identical.
- **AC6/B8:** explicit-stack loop shapes (frame layout, helper names) once the twin test proves order.
- **L1:** staging a referenced later-mission class with only the referenced members (journal; `staged-classes.json`).
- **Sweep:** hash canonicalisation, stamp freshness, strategy subset; skip T10 when `ELK_MODELS_DIR` is absent.
- **Coverage:** journaling a U branch with its Java line instead of recording a row.
- **AD-10:** identity-hashed sites use insertion order, one journal row each.
- **Housekeeping:** test-local helpers under `test/helpers/`; prose typos per the CLAUDE.md carve-out; 1–3 line
  pre-existing fixes in touched files; timeout-only reruns at lower load; wording of tests, journal rows,
  `.agent-notes/layered-cycles-layers.md` and commit messages.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Phase recorder, enum skeleton, replay foundation | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Processors, cycle breakers, layerers | T4, T5, T6, T7 | 1 | [x] |
| [3](batch-3/overview.md) | Wire the enum; replay every row; invariant tests | T8 | 2 | [x] |
| [4](batch-4/overview.md) | Replay-alone coverage map; breadth sweep | T9, T10 | 3 | [x] |
| [5](batch-5/overview.md) | Site rows for unreached branches | T11 | 4 (T9) | [x] |
| [6](batch-6/overview.md) | Anchored unit tests | T12a, T12b, T12c | 5 | [x] |
| [7](batch-7/overview.md) | Docs, roadmap, summary | T13 | 6 | [x] |

## Documents

[decisions.md](decisions.md) · [decision-journal.md](decision-journal.md) ·
[diagrams/data-flow.md](diagrams/data-flow.md) · [diagrams/component-map.md](diagrams/component-map.md) ·
[unreached.md](unreached.md) (written by T9)

## Mission summary (2026-10-29)

**Tasks:** 14 planned tasks done (T1–T13 with T12a–c) over two sessions (2026-10-28 batches 1–2 up to stop 1;
2026-10-29 after the user's decisions, batches 2–7), one commit each plus fix commits (`fix(T1)` ×2, `fix(T3)` ×4,
`fix(T5)` ×2, `fix(T6)` the E1 cycle, `fix(T8)` ×3, `fix(T10)` the `Tarjan` box test) and `docs(plans)` markers. T9 and
T13 ran in the main session; T1, T10 and T11 on java-architect (Sonnet); T2–T8 and T12a–c on typescript-pro (Sonnet;
batches 2 and 6 in parallel). User decisions during the run: E1 (strategy-enum import cycle: melk lazy defaults,
inlined importer comparisons, tests enter through the enum) and E2 (boxed `Integer` value equality), the latter amended
on T8/T10 evidence as E2a (`Integer.valueOf` box identity at four sites) and flagged for confirmation. Stops: 1 (the
cycle, user-resolved); a second instance of the same cycle on the processor enum, resolved under E1 (thirteen lazy
phase configurations) and flagged; two T8 agent stops (replay helper options on the root; `NodePromotion` never
terminating under E2) and one T10 agent stop (`Tarjan.java:86`), all fixed at origin with their diagnosis artifacts.

**Exit evidence:**

- `test/golden/refs/java/layered-phases.json`: 651 rows (`models` 534, `scenarios` 80, `sites` 37), 1,958,962 bytes,
  JDK 21.0.1, oracle `8aaa3c14`, JVM `-XX:hashCode=2`, byte-stable across recordings; the 614 pre-T11 rows byte-identical
  after T11. `LayeredPhaseVectors.test.ts` replays all 651 by name at the AD-4 bar; the 81 step dumps match the full 7a dump.
- Eight JUnit invariant tests ported verbatim over the replayed graphs of their Java configurations.
- Breadth sweep (B6): 32,652 oracle cases over 550 ptolemy models (30,074 ok, 1,983 refused, 595 timeout, 0 throws);
  the port's canonical hash equals the oracle's for every ok case at stride 1 (8 m 04 s) and stride 2 (4 m 05 s).
- `unreached.md`: 216 untaken branches classified; 37 site rows reach every reachable S branch; 40 anchored cases
  (p1cycles 7, p2layers 16, intermediate 17) cite them; every class under 90 % branches is explained by U items.
- Gates at every batch: format, typecheck, complexity, architecture+melk, refs name-status (only the allowed additions
  and the manifest), melk byte-identity, 7a vector scripts byte-identical, coverage 99.18 / 97.11 / 98.99 / 99.19 after
  batch 6; `npm test` 66.1 s (batch 2, load 12.6), 68.5 s (batch 4, load 15), 67.4 s (batch 5), 79 s (batch 6, load
  25–34 from foreign processes; re-timed at the mission-end gates) against the 65.1 s baseline at load 11.

**Divergences fixed at origin:** row options applied to the root instead of the imported level (T3 helper);
value-equality ports of four boxed-`Integer` comparisons (E2a; `NodePromotion`, `CoffmanGrahamLayerer`,
`SCCNodeTypeCycleBreaker`, 7a's `Tarjan`); the 7a `Tarjan.test.ts` recursive twin re-anchored (D4); `NodePromotion.process`
calling the section function instead of the ported public method.

**Follow-ups and flags for the user** (details in the journal and `plans/roadmap.md` § Revision 2026-10-29):

- Confirm E2a (replaces E2) and the two write-set widenings made under E1 (melk config, `ElkGraphImporterModelOrder`,
  thirteen phase configurations, 7a `Tarjan`).
- Upstream candidates: `Tarjan.java:86` (SCC breakers stall past DFS index 127), `StretchWidthLayerer` hangs on
  zero-height nodes and self-loops, `testEdgesPointTowardsNextLayers` violated by the Java's own left-to-right
  model-order promotion with external port dummies and by BF/DF model-order layerings.
- Recorder flag `-XX:hashCode=2` (BFS rows ≤ 10 sources); the AC5-style `LAYERED_PHASE_INPUTS` pin in
  `test/golden/algorithm-refs.test.ts`; brief corrections (59 enum members, not 63; B8's `hide`/`degree` are not
  recursive — `isTreeRoot`/`moveTree` are); rows over ten nodes carry no positions (the two positioner site cases
  assert structure only); a `javac` multi-file launcher for the 2,730-line recorder; an orphaned vitest worker
  (PID 21782, 2026-10-28) the session could not kill.

