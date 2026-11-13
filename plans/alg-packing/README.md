<!-- SPDX-License-Identifier: EPL-2.0 -->

# Rectpacking, spore and topdownpacking — Mission Brief (mission 8c, issue #39)

## Objective

Port `alg.rectpacking` (4,688 Java lines incl. `RectPacking.melk`), `alg.spore` (1,326 + `SPOrE.melk`; the algorithms
`sporeOverlap` and `sporeCompaction`) and `alg.topdownpacking` (1,113 + `Topdownpacking.melk`, incl. the 523-line `GridElkNode`) to
`src/alg/{rectpacking,spore,topdownpacking}/`, generate their option classes with the melk tool, register their providers, and prove
them against the oracle: three JVM recorders (whole layouts, per-step stops, the `NaiveMinST` tie order, the comparator sort), the
eight JUnit suites, a `packing` golden set (one golden per option value, NaiveMinST tie-order goldens included), and a TS-vs-oracle sweep.

Exit (issue #39 "done when"):

- the eight suites of [java-baseline.md](java-baseline.md) (30 runs) are ported and green with the Java's assertions; the oracle runs
  equal the baseline at mission start and end (PK10);
- every row of `test/golden/refs/java/{rectpacking,spore-layout,topdownpacking}.json` replays at the AD-4 bar through the TS port, the
  `jitter` rows by their invariants (PK1, PK4);
- each algorithm has a golden per option set in `test/golden/refs/elk-packing/` equal to the TS layout within 1e-6, including the
  `--minst-ties-*` goldens (PK2); the landed `refs/elk`, `elk-algorithms`, `elk-layered`, `elk-trees`, `elk-force-disco` regenerate
  byte-identically;
- the sweep (PK9) reports 0 mismatches and 0 one-sided throws among deterministic cases, or files each remaining case as
  `needs-ruling` with its mechanism;
- `GridElkNode` per PK3, recorded in `decisions.md` (the issue's required decision);
- no cross-algorithm import the Java lacks; `staged-classes.json` is `[]`; fitness tests pass;
- the queue gates pass; one squashed commit on the base (PK12); `plans/roadmap.md` gains `## Revision <end date> (alg-packing)`.

**Parts this mission does not decide.** Issues #58, #68, #71 (`needs-ruling`): evidence comments only (PK9, PK11). A PK7 `sort` row
the V8 sort does not reproduce becomes its own `needs-ruling` issue; the rest of the mission continues.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full; the queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/alg-packing-planning.md`, `alg-force-disco.md`, `alg-force-disco-planning.md`, `alg-trees.md`, `alg-common.md`,
   `java-foundations.md` and `recorder-identity-hash.md`. Journal what affects the approach: NS1, `-XX:hashCode=2`, the TDZ recipe,
   replay-alone coverage, the staging fitness test, the `retarget` lesson, `getAllProperties()` in dump helpers, the treeify caveat.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is uncommitted, commit it:
   `git add plans/alg-packing .agent-notes/alg-packing-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add alg-packing mission brief"`. Record the base sha for PK12 in the journal:
   the driver's squash base if the prompt names one, else that commit's parent (at planning `a30af66`, the 8b squash commit).
5. Check the oracle stamp (`$ELK_ORACLE_DIR/oracle-build.json` names `tools/oracle/ELK_COMMIT` and patches `0001`, `0002`) and
   `git -C $ELK_SOURCE_DIR log --oneline <pin>..HEAD -- plugins/org.eclipse.elk.{alg.rectpacking,alg.spore,alg.topdownpacking,core,graph,graph.json,alg.common} test/org.eclipse.elk.alg.{rectpacking,spore,topdown}.test`
   (at planning: only `8bd00922`, the `GraphFeature` prose fix the TS already has; journal any other change).
6. Run [java-baseline.md](java-baseline.md) and journal it; any difference is stop 16.
7. Measure `npm test` (every sweep dir `/nonexistent`, below) with `uptime` and journal it as stop 9's baseline.
8. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec `R`, `S`, `P`, tests `RT`, `ST`, `PT` | as in [decisions.md](decisions.md) |
| Recorder patterns | `tools/vectors/DiscoVectors.java` + `disco-vectors.sh`, `tools/vectors/AlgCommonVectors.java` (triangulation/NaiveMinST rows) |
| Replay patterns | `src/alg/disco/DiscoVectors.test.ts`, `test/helpers/disco-replay-{rows,dump,run,stops,elk}.ts`, `src/alg/common/TriangulationVectors.test.ts` |
| Goldens | `tools/oracle/regen-goldens.sh` (`force-disco` branch), `test/golden/force-disco-goldens.test.ts`, `test/golden/compare-json.ts` |
| Codegen | `tools/melk/{config,generate}.ts`, `tools/melk/sources/{RectPacking,SPOrE,Topdownpacking}.melk` |
| Landed callees | `src/alg/common/{NaiveMinST,BowyerWatsonTriangulation,TEdge,TTriangle,Tree,ICostFunction,NodeMicroLayout}.ts`, `src/alg/common/{spore,utils}/*`, `src/core/util/BoxLayoutProvider.ts`, `src/core/RecursiveGraphLayoutEngineTopdown.ts` |
| Shims | `src/java/util/{JavaHashMap,JavaHashSet,HashStrategy,Collections,LinkedList}.ts`, `src/emf/common/util/ECollections.ts` |
| Sweep | `tools/oracle/sweep.sh`, `tools/corpus/ts-layout-compare.ts`; `test/corpus/generated/{sporeOverlap,sporeCompaction}-graph-small.json`, `topdownpacking-hierarchy-small.json` |

- **AD-9:** never read OpenJDK or Guava source; PK7 decides the sort by vectors only.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, any landed recorder or sweep script, `tools/oracle/run.sh`,
  `tools/oracle/java-tests.sh`, `test/corpus/{manifest,variants}.json`, any landed file under `test/golden/refs/`, or the landed
  replay helpers. Exceptions: T4's additive `regen-goldens.sh` set, T5's `MARKER` widening (PK8), T8's registry change (PK3), T13's
  registrations in `ts-layout-compare.ts` and the `SUFFIX_DIFFERENCES` removal (PK9), a T14 AC6 conversion of `DepthFirstCompaction` (PK6).

## Quality gates

Agents run, in the foreground, their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity` and
`npx vitest run test/architecture`. After every batch the orchestrator runs these **alone** (check `uptime`; check `ps` for orphaned
vitest workers; rerun timeout-only failures at normal load):

```bash
npm run format:check && npm run typecheck && npm run complexity   # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/melk
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90 (the full suite)
env $SWEEPS npm test                                              # ≤ baseline + 20 s (stop 9)
git diff --name-status <base> -- test/golden/refs/ test/corpus/ test/golden/inputs/ test/golden/*.json
#   only: A refs/java/{rectpacking,spore-layout,topdownpacking}.json, A refs/elk-packing/**, A golden/packing.json,
#   A golden/packing-inputs/**; under test/corpus/ only ts-layout-compare.test.ts
```

At mission end, also run (queue gates 1–6 plus the oracle evidence; journal each result):

```bash
npm run docs:build
npm run melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex Force Stress Disco RectPacking SPOrE Topdownpacking && git diff --exit-code src/
for r in rectpacking spore-layout topdownpacking; do bash tools/vectors/$r-vectors.sh <scratch>/$r; done   # cmp-identical to refs/java
for s in default algorithms layered trees force-disco packing; do tools/oracle/regen-goldens.sh --set $s; done && git diff --exit-code test/golden/refs/
MODELS_REPO=$ELK_MODELS_DIR bash "$TMPDIR/alg-packing/java-tests.sh" <java-baseline.md's suites>              # equal to the baseline
```

JVM recorders and sweeps: check `uptime` first (above 12, wait), then run
`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &` with foreground polls of at most 9 minutes.
Parallel agents never run `npm run coverage` and never commit; the orchestrator commits each task
(`git -c commit.gpgsign=false commit -F <file>`).

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md) lists them in the queue form with the push-forward list. Most likely: 3 AD-13, 5
nondeterminism (spore jitter), 13 identity semantics, 14 divergence, 15 landed-code defect (`NaiveMinST` on the scanline path),
18 sort proof.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorders, golden set, option codegen and staging | T1, T2, T3, T4, T5 | — | [x] |
| [2](batch-2/overview.md) | Rectpacking util; spore model and phases; topdownpacking whole | T6, T7, T8 | 1 | [x] |
| [3](batch-3/overview.md) | Rectpacking p1 + p3, p2; spore providers and suites | T9, T10, T11 | 2 | [x] |
| [4](batch-4/overview.md) | Rectpacking intermediate, provider, suites, comparator | T12 | 3 | [x] |
| [5](batch-5/overview.md) | Goldens test, sweep, hand-offs; recursion and coverage | T13, T14 | 4 | [x] |
| [6](batch-6/overview.md) | Docs, roadmap revision, notes, squash | T15 | 5 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[java-baseline.md](java-baseline.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md) · `unreached.md` (written by T14)

Recommended executor model: `fable` (long-horizon); agents per task file (sonnet for ports, opus where a task file says so).

## Mission summary

**Tasks.** 15 of 15 planned tasks completed (T1-T15) in 6 batches; the batch gates after batches 1-5 are journaled
(`batch N gate` rows). Evidence and design: [`docs/architecture/alg-packing.md`](../../docs/architecture/alg-packing.md); counts
and quirks: `docs/conformance.md` § Rectpacking, spore and topdownpacking; the roadmap revision `## Revision 2026-11-13
(alg-packing)` in `plans/roadmap.md`. Execution notes: `.agent-notes/alg-packing.md`. Agents ran from
[agent-rules.md](agent-rules.md) plus their task file.

**Exit items and the journal rows that prove them.** Kinds are the journal's.

| Exit item (Objective) | Result | Journal row (task, kind) |
| --------------------- | ------ | ------------------------ |
| the eight suites (30 runs) ported and green; oracle runs equal [java-baseline.md](java-baseline.md) at start and end | `TopdownPackingTest` 4, `TopdownLayoutTest` 5, `PortPlacementCalculationTest` 2, `UtilsTest` 3, `ScanlineOverlapRemovalTest` 1, `PaddingTest` 4, `CompactionTest` 10, `Issue583Test` 1; oracle 30 / 0 at start and end | start `gate`; T8 `note`; T11 `note`; T12 `note`; end `gate` |
| every row of `refs/java/{rectpacking,spore-layout,topdownpacking}.json` replays at the AD-4 bar, `jitter` rows by invariants | rectpacking 558 full, 151 stops, 7 throws, raw-bit identical; spore 113 full (one behind `SPORE_CHAIN_FULL=1`), 60 stops, 95 minst, 4 throws, 4 jitter, 63 objects; topdownpacking 296 full, 288 stops, 296 predicted, 18 throws | T12 `note`; T11 `note`; T7 `note`; T8 `note`; T14 `regen`; T13 `note` (objects) |
| a golden per option set in `refs/elk-packing/` within 1e-6, the `--minst-ties-*` goldens included; the landed sets regenerate byte-identically | 44 refs, 49 tests; `default`, `algorithms`, `layered`, `trees`, `force-disco`, `packing` regenerate with `git diff --exit-code` clean | T4 `regen`; T4 `note`; T13 `note`; end `gate` |
| the sweep reports 0 mismatches and 0 one-sided throws among deterministic cases, or each remaining case is `needs-ruling` | rectpacking 830 ok, 89 both-throw; topdownpacking 906 ok; sporeCompaction 99 ok; sporeOverlap 94-97 ok; four oracle-nondeterministic cases in issue #79 | T13 `sweep` (two rows); T13 `ruling`; T13 `fix` |
| `GridElkNode` per PK3 | delegating class, list-per-name guard registry, no landed guard result changed | T8 `note` (two rows) |
| no cross-algorithm import the Java lacks; `staged-classes.json` is `[]`; fitness tests pass | `[]` since T12; `PENDING_TYPES` `[]`; `test/architecture` and `test/melk` green in every gate | T5 `note`; T12 `note`; batch 4 `gate` |
| the queue gates pass; one squashed commit on the base; the roadmap gains the revision | batch 1-5 gates and the end gate green; revision appended; one commit on `a30af661`, history under tag `alg-packing/pre-squash` | batch 1-5 `gate`; end `gate`; end `note` |
| every `src/` branch reached or proven dead (stop 7) | bundle branches 98.12 %, 100 %, 96.42 %; 18 `U` rows in [unreached.md](unreached.md); one arm open (issue #81) | T14 `note`; T14 `regen`; the `U` rows of T6, T8, T9, T10, T12 |
| recursion probe (PK6) | `compactTree` and `growAt` converted with reference proofs; both 2,000-node chains complete in the oracle and in TS; under `--jitless` the overlap chain runs in the default suite and the compaction chain passed in a detached run (2,394 s); beyond 2,000: issue #76 | T11 `divergence`; T14 `fix`; T14 `note`; end `note` |
| PK7 sort proof | 427 of 640 JVM rows reproduce; 213 classified, issue #75 | T1 `note`; T12 `ruling` |

**Decisions made.** PK1-PK12 as planned, no row changed. Deviations (all journaled): T14 split into a recursion half beside T12
and a coverage half beside T13 (batch 4 `plan`); additive recorder extensions after the ports existed, with count pins following
(T14 `regen`, T13 `note`); helper files beside the planned ones (T6, T9, T10, T11, T12 `note`); the TDZ entries in
`tools/melk/config.ts` (T8, T9, T10 `fix`/`note`); the #71 item 1 neutralisation landing in the compare tool (T13 `note`).
Landed-code changes (stop 15, PK3, PK6): `JavaObjects.equals` (T13 `fix`, with a JVM vector), `DepthFirstCompaction.compactTree`
(T14 `fix`), the guard registry (T8 `note`).

**Flagged for review.** The audit points of [decisions.md](decisions.md); the `JavaObjects.equals` change; the classified list
in `RectRow.test.ts` (T14 `ruling`, issue #78: this mission's own test, falsified by oracle rows the mission added later); the
count pins updated after the additive recordings (T14 `regen`); `U` rows 4 and 9 of `unreached.md` (a reading of the Java
supported by a search); the orphaned vitest worker of batch 3 (batch 4 `note`); two timeout-only gate failures at machine load
near 100, rerun green (T14 `fix`, batch 4 `gate`).

**Issues filed.** `needs-ruling`: #75 (213 sort rows, PK7), #78 (four rows against a test premise, AD-13), #79 (four
nondeterministic sweep cases), #80 (upstream defects with drafts). `follow-up`: #73 (the upstream `absorbBlocks` hang; filed as
`needs-ruling`, relabelled during the run), #76 (recursion depth beyond 2,000), #81 (one arm neither reached nor proven dead).
Comments: #68 (the 7 residuals are `ok`), #40 (what row 9 inherits), #39 (status).
