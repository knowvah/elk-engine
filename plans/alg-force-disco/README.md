<!-- SPDX-License-Identifier: EPL-2.0 -->

# Force, stress and disco — Mission Brief (mission 8b, issue #38)

## Objective

Port `alg.force` (including `stress`; 2,236 Java lines + `Force.melk`, `Stress.melk`) and `alg.disco` (2,409 + `Disco.melk`) to
`src/alg/{force,disco}/`, generate their option classes with the melk tool, register their providers, and prove them against the
oracle: JVM recorders (whole layouts and per-step stops), the two JUnit suites, a `force-disco` golden set (one golden per option
value), and a TS-vs-oracle sweep.

Exit (issue #38 "done when"):

- `ForceImportTest` (3 runs) and `TwoBitGridTest` (3 runs) are ported and green with the Java's assertions; the oracle runs equal
  [java-baseline.md](java-baseline.md) at mission start and end;
- every row of `test/golden/refs/java/{force,stress,disco}.json` replays at the AD-4 bar through the TS port (FD1);
- each algorithm has a golden per option set in `test/golden/refs/elk-force-disco/` equal to the TS layout within 1e-6 (FD2); the
  landed `refs/elk`, `refs/elk-algorithms`, `refs/elk-layered`, `refs/elk-trees` regenerate byte-identically;
- the sweep (FD6) reports 0 mismatches and 0 one-sided throws, or files each remaining case as `needs-ruling` with its mechanism;
- no cross-algorithm import the Java lacks (`test/architecture/bundle-deps.json`); `staged-classes.json` is `[]`; fitness tests pass;
- the queue gates pass; one squashed commit on the base (FD10); `plans/roadmap.md` gains `## Revision <end date> (alg-force-disco)`.

**Parts this mission does not decide.** Issue #58 (`needs-ruling`, no ruling at planning): `STRESS_PENDING` stays as it is, and T12
reports the evidence on the issue (FD9). Cross-bundle suites stay with 8x (FD9).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full; the queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/alg-force-disco-planning.md`, `alg-trees.md`, `alg-trees-planning.md`, `alg-common.md`, `layered-framework.md`
   and `recorder-identity-hash.md`. Journal what affects the approach: the NS1 input embedding, `-XX:hashCode=2`, the TDZ recipe,
   replay-alone coverage as the only proof a replay ran the code, the staging fitness test, and the `retarget` lesson (FD2).
4. Branch: `git branch --show-current` must print `chore/issue-queue`. Record the base sha (`git rev-parse HEAD`) in the journal. If
   the brief is uncommitted, commit it: `git add plans/alg-force-disco .agent-notes/alg-force-disco-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add alg-force-disco mission brief"`; the base for FD10 is that commit.
5. Check the oracle stamp (`$ELK_ORACLE_DIR/oracle-build.json` names `tools/oracle/ELK_COMMIT` and patches `0001`, `0002`) and
   `git -C $ELK_SOURCE_DIR log --oneline <pin>..HEAD -- plugins/org.eclipse.elk.{alg.force,alg.disco,core,graph,graph.json,alg.common} test/org.eclipse.elk.alg.{force,disco}.test`
   (at planning: only `8bd00922`, the `GraphFeature` prose fix the TS already has; journal any other change).
6. Run [java-baseline.md](java-baseline.md) and journal it; any difference is stop 16.
7. Measure `npm test` (every sweep dir `/nonexistent`, below) with `uptime` and journal it as stop 9's baseline.
8. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec `F`, `D`, tests `FT`, `DT` | as in [decisions.md](decisions.md) |
| Recorder patterns | `tools/vectors/VertiFlexVectors.java` + `vertiflex-vectors.sh` (ELK JSON rows, stops, throw rows, classpath, `-XX:hashCode=2`) |
| Replay patterns | `src/alg/vertiflex/VertiFlexVectors.test.ts`, `test/helpers/vertiflex-replay-{rows,dump,run}.ts` |
| Goldens | `tools/oracle/regen-goldens.sh`, `test/golden/tree-goldens.test.ts`, `test/golden/compare-json.ts` |
| Codegen | `tools/melk/{config,generate}.ts`, `tools/melk/sources/{Force,Stress,Disco}.melk`, `test/melk/polyomino-options.test.ts` |
| Shims | `src/java/util/{Random,PriorityQueue,LinkedList,Collections}.ts`, `src/java/lang/JavaMath.ts`, `src/guava/LinkedListMultimap.ts` |
| Sweep | `tools/oracle/sweep.sh`, `tools/corpus/ts-layout-compare.ts`; generated inputs `test/corpus/generated/{force-graph,disco-components}-small.json` |

- **AD-9:** never read OpenJDK or Guava source. FD3 uses the netlib fdlibm `log` algorithm, as `src/java/util/Random.ts` already does.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, any landed recorder or sweep script, `tools/oracle/run.sh`,
  `tools/oracle/java-tests.sh`, `test/corpus/{manifest,variants}.json`, any landed file under `test/golden/refs/`, or the landed
  replay helpers. Exceptions: T3's additive `regen-goldens.sh` set, T4's `MARKER` widening (FD5), T11's registrations in
  `ts-layout-compare.ts`.

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
#   only: A refs/java/{force,stress,disco}.json, A refs/elk-force-disco/**, A golden/force-disco.json, A golden/force-disco-inputs/**; under test/corpus/ only ts-layout-compare.test.ts
```

At mission end, also run (queue gates 1–6 plus the oracle evidence; journal each result):

```bash
npm run docs:build
npm run melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex Force Stress Disco && git diff --exit-code src/   # byte-identical
bash tools/vectors/force-vectors.sh <scratch>/force; bash tools/vectors/disco-vectors.sh <scratch>/disco                   # cmp-identical to refs/java
for s in default algorithms layered trees force-disco; do tools/oracle/regen-goldens.sh --set $s; done && git diff --exit-code test/golden/refs/
MODELS_REPO=$ELK_MODELS_DIR bash "$TMPDIR/alg-force-disco/java-tests.sh" <java-baseline.md's suites>                       # equal to the baseline
```

JVM recorders and sweeps: check `uptime` first (above 12, wait), then run
`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &` with foreground polls of at most 9 minutes.
Parallel agents never run `npm run coverage` and never commit; the orchestrator commits each task
(`git -c commit.gpgsign=false commit -F <file>`).

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md) lists them in the queue form (a partial block → `needs-ruling`, finish the rest) with the
push-forward list. Most likely: 3 AD-13, 6 recursion, 13 boxed `==`, 14 divergence (a disco rasterization flip from a last-ulp
`Math.sin`), 15 landed-code defect.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorders, golden set, option codegen | T1, T2, T3, T4 | — | [x] |
| [2](batch-2/overview.md) | Log shim; force model and importer; disco model and polyomino | T5, T6, T7 | 1 | [x] |
| [3](batch-3/overview.md) | Force models and provider; disco transform, compactor, provider | T8, T9 | 2 | [x] |
| [4](batch-4/overview.md) | Stress and unstaging | T10 | 3 | [x] |
| [5](batch-5/overview.md) | Goldens test and sweep; recursion, coverage, #58 evidence | T11, T12 | 4 | [x] |
| [6](batch-6/overview.md) | Docs, roadmap revision, notes, squash | T13 | 5 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[java-baseline.md](java-baseline.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md) · `unreached.md` (written by T12)

## Mission summary

**Tasks.** 13 of 13 planned tasks completed (T1-T13) in 6 batches; the batch gates after batches 1-5 are journaled
(`batch N gate` rows). Evidence and design: [`docs/architecture/alg-force-disco.md`](../../docs/architecture/alg-force-disco.md);
counts and quirks: `docs/conformance.md` § Force, stress and disco; the roadmap revision `## Revision 2026-11-11
(alg-force-disco)` in `plans/roadmap.md`. Execution notes: `.agent-notes/alg-force-disco.md`.

**Exit items and the journal rows that prove them.** Kinds are the journal's.

| Exit item (Objective) | Result | Journal row (task, kind) |
| --------------------- | ------ | ------------------------ |
| `ForceImportTest` (3) and `TwoBitGridTest` (3) ported and green; oracle runs equal [java-baseline.md](java-baseline.md) at start and end | ported, 3 of 3 each; start 3 / 0 and 3 / 0; end 3 / 0 and 3 / 0 | start `gate` (baseline); T6 `plan`; T7 `plan`; end `regen` |
| every row of `refs/java/{force,stress,disco}.json` replays at the AD-4 bar | force 594 full, 194 stops, 2 throws (259,243 hex doubles raw-bit identical); stress 320, 108, 3 (135,229 identical); disco 92, 88, 5 (75,002 identical, 32 within 1e-6, max 8.5e-14) | T8 `gate`; T10 `gate`; T9 `gate`; T1 `regen`; T2 `regen`; the 32 fields: T9 `divergence` |
| a golden per option set in `refs/elk-force-disco/` within 1e-6; the landed `refs/elk`, `elk-algorithms`, `elk-layered`, `elk-trees` regenerate byte-identically | 45 refs (force 15, stress 10, disco 20); 51 tests; default 4, algorithms 9, layered 24, trees 40 regenerate with `git diff --exit-code` clean | T3 `regen`; T11 `plan`; T11 `ruling` (the classified option text); mission-end regeneration: end `regen` |
| the sweep reports 0 mismatches and 0 one-sided throws, or each remaining case is `needs-ruling` with its mechanism | 0 one-sided throws; mismatches force 2, stress 2, disco 819 (all options-only), each with a mechanism, in issue #71 | T11 `sweep` (two rows); T11 `ruling`; T11 `note` (the `layered` registration) |
| no cross-algorithm import the Java lacks; `staged-classes.json` is `[]`; fitness tests pass | `staged-classes.json` is `[]`, `PENDING_TYPES` is `[]`; `vitest run test/architecture test/melk` 480 passed, 1 skipped at the batch 5 gate | T10 `plan`; batch 4 `gate`; batch 5 `gate` |
| the queue gates pass; one squashed commit on the base; the roadmap gains the revision | per-batch gates green; revision appended by T13; one commit on `554490d4`, the per-task history under tag `alg-force-disco/pre-squash` | batch 1-5 `gate` rows; end `gate`; end `note` |
| every `src/` branch reached or proven dead (stop 7) | 298 of 302 branches reached; the 4 others and 12 more arms are the 16 `U` rows of [unreached.md](unreached.md) | T12 `note`; T12 `U` |
| `Math.log` bit-exact (FD3) | 20,014 of 20,014 `log` rows raw-bit equal; native V8 differs on 101 | T5 `plan`; T8 `gate` (Eades `iterations=1000`) |
| recursion probe (FD7) | 2,000-node paths complete in oracle, TS and `--jitless`; beyond: issue #70 | T12 `note` |
| issue #58 evidence | all three held-back cases pass from temporary copies; two further blockers | T12 `note` |

**Decisions made.** FD1-FD10 as planned, no row changed. Deviations (all journaled): the helper files added beside the planned
write-set (T6, T8, T9, T10 `plan`); the `layered` registration in `tools/corpus/ts-layout-compare.ts` (T11 `note`); the
`MARKER` widening (T4 `plan`, FD5, pre-approved); the new shim `NegativeArraySizeException` with its added row in the
exception-hierarchy fitness test (T9 `fix`); the `SUFFIX_DIFFERENCES` row with a tripwire (T11 `ruling`). Landed-code defects
fixed at the origin (stop 15): `TwoBitGrid.newWords` (T9 `fix`) and `JsonExporter.valueText` (T11 `fix`). The brief's premise that
disco throws in `firstEdgeSection` was wrong (T2 `note`).

**Flagged for review.** The audit points of [decisions.md](decisions.md) (the `MARKER` widening, the new `JavaMath.log` shim); the
`AbstractForceModel` import cycle resolved under the locked precedent, not stop 12 (T8 `ruling`); the `layered` registration
(T11 `note`); the x86_64 limit of FD3 (T5 `plan`); `unreached.md` row 16, an argument from the Java rather than a vector (T12
`U`); the two recorders are over 500 lines, accepted under FD1's cap (batch 1 `note`).

**Issues filed.** #69 (`needs-ruling`): the `avoidSamePosition` hang and DisCo's no-op polyomino options (batch 1 `ruling`). #70
(`follow-up`): the component dfs overflows V8's stack beyond FD7's 2,000 (T12 `note`). #71 (`needs-ruling`): `debug.discoGraph`
identity text and the rectpacking-dependent option keys (T11 `ruling`). A comment on #58 with the evidence (T12 `note`); the
issue stays open.

**Known follow-ups.** 8c (rectpacking): remove the `SUFFIX_DIFFERENCES` row and close the 6 sweep residuals. 8x:
`NodeMicroLayoutTest` (rectpacking), `PlainJavaInitializationTest` and `ElkReflectTest` (after 8c). Row 9: the remaining
registrations in `ts-layout-compare.ts` (layered, the trees, force, stress and disco now register). #58: `layered-label-metrics.json`
needs four label texts and the two models need vendoring. #68: its force keys are registered now. #70: the dfs conversion.

**Mission-end gates** (run by the orchestrator, alone, on the final tree; journal rows end `regen` and end `gate`):

- `npm run format:check`: exit 0, clean
- `npm run typecheck`: exit 0, clean
- `npm run complexity`: no violation line (the 2 landed AST-only notes)
- `npm run coverage` (90/90/90/90): exit 0; 1,084 files passed, 10 skipped; 47,913 tests passed, 93 skipped; 98.9 / 96.95 / 98.86 / 98.91 (statements / branches / functions / lines)
- `npm test` time (baseline 99.73 s, stop 9 allows +20 s): 79.14 s at load 74
- `npm run docs:build`: exit 0
- `npm run melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex Force Stress Disco` byte-identity (`git diff --exit-code src/`): clean
- vector re-records (`force-vectors.sh`, `disco-vectors.sh`) `cmp`-identical to `refs/java`: yes, cold (`ELK_VECTORS_CACHE=off`), all three refs
- golden regeneration (`default algorithms layered trees force-disco`, `git diff --exit-code test/golden/refs/`): every set exit 0, diff clean
- Java baseline (`ForceImportTest` 3 / 0, `TwoBitGridTest` 3 / 0): runs=3 failures=0 and runs=3 failures=0, equal to the start (stop 16 clear)
- the squash commit (tag `alg-force-disco/pre-squash`, `feat(force): port force, stress and disco (8b)`, `Refs: #38`): done as the last step; one commit on `554490d4`
