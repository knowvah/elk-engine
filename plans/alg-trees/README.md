<!-- SPDX-License-Identifier: EPL-2.0 -->

# Tree algorithms: mrtree, radial, vertiflex — Mission Brief (mission 8a, issue #37)

## Objective

Port the three tree-style layout bundles `alg.mrtree` (5,790 Java lines + `Tree.melk`), `alg.radial` (2,752 + `Radial.melk`) and
`alg.vertiflex` (1,693 + `VertiFlex.melk`) to `src/alg/{mrtree,radial,vertiflex}/`, generate their option classes with the melk
tool, register their providers, and prove them against the oracle: per-algorithm JVM recorders (whole layouts and per-step stops),
the two JUnit suites, a `trees` golden set (one golden per option value), and a TS-vs-oracle tree sweep.

Exit (issue #37 "done when"):

- `MrTreeGraphSizeTest` (6 runs) and `CenterOnRootTest` (2 runs) are ported and green with the Java's assertions; the oracle runs
  equal [java-baseline.md](java-baseline.md) at mission start and end; vertiflex has no test bundle (goldens and rows only);
- every row of `test/golden/refs/java/{mrtree,radial,vertiflex}.json` replays at the AD-4 bar through the TS port (TR1);
- each algorithm has a golden per option set in `test/golden/refs/elk-trees/` equal to the TS layout within 1e-6 (TR2); the landed
  `refs/elk`, `refs/elk-algorithms`, `refs/elk-layered` regenerate byte-identically;
- the tree sweep (TR6) reports 0 mismatches and 0 one-sided throws, or files each remaining case as `needs-ruling` with its mechanism;
- no cross-algorithm import the Java lacks (`test/architecture/bundle-deps.json`); `staged-classes.json` is `[]`; fitness tests pass;
- the queue gates pass; one squashed commit on the base (TR10); `plans/roadmap.md` gains `## Revision <end date> (alg-trees)`.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full; the queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/alg-trees-planning.md`, `alg-common-nodespacing.md`, `layered-framework.md`, `layered-compound.md` and
   `recorder-identity-hash.md`. Journal what affects the approach: the NS1 input embedding, `-XX:hashCode=2`, the TDZ recipe
   (`NON_LEAF_DEFAULT_TYPES`, per-module import smoke), bare `Infinity` in exported JSON, replay-alone coverage as the only proof a
   replay ran the code, and the staging fitness test.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. Record the base sha (`git rev-parse HEAD`) in the journal. If
   the brief is uncommitted, commit it: `git add plans/alg-trees .agent-notes/alg-trees-planning.md` and
   `git -c commit.gpgsign=false commit -m "docs(plans): add alg-trees mission brief"`; the base for TR10 is that commit.
5. Check the oracle stamp (`$ELK_ORACLE_DIR/oracle-build.json` names `tools/oracle/ELK_COMMIT` and patches `0001`, `0002`) and
   `git -C $ELK_SOURCE_DIR log --oneline <pin>..HEAD -- plugins/org.eclipse.elk.{alg.mrtree,alg.radial,alg.vertiflex,core,graph,graph.json,alg.common} test/org.eclipse.elk.alg.{mrtree,radial}.test`
   (at planning: only `8bd00922`, the `GraphFeature` prose fix the TS already has; journal any other change).
6. Run [java-baseline.md](java-baseline.md) and journal it; any difference is stop 16.
7. Measure `npm test` (every sweep dir `/nonexistent`, below) with `uptime` and journal it as stop 9's baseline.
8. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Inputs (read-only)

| What | Where |
| ---- | ----- |
| Java spec `M`, `R`, `V`, tests `MT`, `RT` | as in [decisions.md](decisions.md) |
| Recorder patterns | `tools/vectors/NodeMicroLayoutVectors.java` (ELK JSON input rows), `LayeredCompoundVectors.java` + `layered-compound-vectors.sh` (stops, throw rows, classpath, `-XX:hashCode=2`) |
| Replay patterns | `src/alg/common/NodeMicroLayoutVectors.test.ts`, `test/helpers/layered-compound-replay-*.ts` |
| Goldens | `tools/oracle/regen-goldens.sh`, `test/golden/layered-hierarchy-goldens.test.ts`, `test/golden/compare-json.ts` |
| Codegen | `tools/melk/{config,generate}.ts`, `tools/melk/sources/{Tree,Radial,VertiFlex}.melk`, `test/melk/polyomino-options.test.ts` |
| Shims | `src/java/util/{JavaHashMap,JavaHashSet,LinkedList,Collections}.ts`, `src/guava/{DoubleMath,Iterables,Lists,LinkedHashMultimap}.ts` |
| Sweep | `tools/oracle/sweep.sh`, `tools/corpus/ts-layout-compare.ts`; generated inputs `test/corpus/generated/{mrtree,radial,vertiflex}-tree-small.json` |

- **AD-9:** never read OpenJDK or Guava source.
- **Never edit** `tools/vectors/{vector-cache.sh,JavaVectors.java}`, any landed recorder or sweep script, `tools/oracle/run.sh`,
  `tools/oracle/java-tests.sh`, `test/corpus/{manifest,variants}.json`, any landed file under `test/golden/refs/`, or the landed
  replay helpers. Exceptions: T4's additive `regen-goldens.sh` set, T5's `MARKER` widening (TR4), T18's three registrations in
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
#   only: A refs/java/{mrtree,radial,vertiflex}.json, A refs/elk-trees/**, A golden/trees.json, A golden/trees-inputs/**
```

At mission end, also run (queue gates 1–6 plus the oracle evidence; journal each result):

```bash
npm run docs:build
npm run melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex && git diff --exit-code src/   # byte-identical
for v in mrtree radial vertiflex; do bash tools/vectors/$v-vectors.sh <scratch>/$v; done             # cmp-identical to refs/java
for s in default algorithms layered trees; do tools/oracle/regen-goldens.sh --set $s; done && git diff --exit-code test/golden/refs/
MODELS_REPO=$ELK_MODELS_DIR bash "$TMPDIR/alg-trees/java-tests.sh" <java-baseline.md's suites>      # equal to the baseline
```

JVM recorders and sweeps: check `uptime` first (above 12, wait), then run
`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &` with foreground polls of at most 9 minutes.
Parallel agents never run `npm run coverage` and never commit; the orchestrator commits each task
(`git -c commit.gpgsign=false commit -F <file>`).

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md) lists 18 in the queue form (a partial block → `needs-ruling`, finish the rest) and the
push-forward list. Most likely: 3 AD-13, 13 boxed `==`, 14 divergence (radial `Math.atan2` flips, I30 order), 15 landed-code defect.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Recorders, golden set, option codegen | T1, T2, T3, T4, T5 | — | [x] |
| [2](batch-2/overview.md) | mrtree model; radial leaf classes; vertiflex relative placement | T6, T7, T8 | 1 | [x] |
| [3](batch-3/overview.md) | mrtree import + treeify; radial compaction + overlaps; vertiflex wiring | T9, T10, T11 | 2 | [x] |
| [4](batch-4/overview.md) | mrtree ordering + placement; radial wiring; mrtree processors | T12, T13, T14 | 3 | [x] |
| [5](batch-5/overview.md) | mrtree routing; fan + compaction processors | T15, T16 | 4 | [x] |
| [6](batch-6/overview.md) | mrtree wiring, replay, JUnit | T17 | 5 | [x] |
| [7](batch-7/overview.md) | Goldens test + tree sweep; recursion probe + coverage closure | T18, T19 | 6 | [x] |
| [8](batch-8/overview.md) | Docs, roadmap revision, notes, squash | T20 | 7 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[java-baseline.md](java-baseline.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md) · `unreached.md` (written by T19)

## Mission summary

Written by T20 (documentation); the numbers are from `decision-journal.md` (92 rows: 35 `note`, 11 `fix`, 8 `ad10`, 8 `U`,
7 `gate`, 7 `ruling`, 5 `divergence`, 5 `plan`, 3 `start`, 2 `sweep`, 1 `regen`). Where a later row corrects an earlier one,
the later row is used: the T1 correction row (no `StackOverflowError` row in `mrtree.json`; the 12 throws are 9 + 2 + 1), the
withdrawn T16 `ruling` on `FanProcessor.java:105`, the correction of the T10 row inside the T13 `U` row, and the final T18
`sweep` row. Base `ab05a29bf42b0c246d18f891c64f740d21b2b9d4`; the final commit is one squashed commit
`feat(trees): port mrtree, radial and vertiflex (8a)` with `Refs: #37`, the per-task history under the tag
`alg-trees/pre-squash`. Design: [docs/architecture/alg-trees.md](../../docs/architecture/alg-trees.md); counts:
[docs/conformance.md](../../docs/conformance.md#alg-trees); roadmap: `plans/roadmap.md` § Revision 2026-11-11 (alg-trees).

### Exit criteria, item by item

| Exit item (this brief, Objective) | Evidence |
| --------------------------------- | -------- |
| `MrTreeGraphSizeTest` (6) and `CenterOnRootTest` (2) ported and green; oracle runs equal the baseline at start and end | T17 row (6/6, oracle 6/0), T13 row (2/2, oracle 2/0); start `note` row (6/0, 2/0) and the `end` `regen` row (6/0, 2/0); `src/alg/mrtree/MrTreeGraphSizeTest.test.ts`, `src/alg/radial/CenterOnRootTest.test.ts`; vertiflex has no test bundle |
| every row of `refs/java/{mrtree,radial,vertiflex}.json` replays at the AD-4 bar | T17 row (`MrTreeVectors.test.ts`: 188 rows, and with the T16 `fix` row both mrtree refs, 401 rows, 0 mismatches), T13 row (`RadialVectors.test.ts`: 309 rows, 0 mismatches outside the two classified rows), T11 row (`VertiFlexVectors.test.ts`: 471 rows, 0 mismatches). Counts: `mrtree.json` 188 (full 122, stops 54, throws 12), `mrtree-extra.json` 213 (140 / 68 / 5), `radial.json` 309 (148 / 150 / 11), `vertiflex.json` 471 (247 / 216 / 8), `mrtree-units.json` 2,656 (`edgeRouter` 422, `cyrusBeck` 46, `orderBalance` 18, `average` 2,170). The two classified radial rows are `stops/i30/rand-chain-big` and `full/i30/rand-chain-big` (T10 `divergence`, T13 `divergence` and `ruling`, issue #64) |
| a golden per option set in `refs/elk-trees/` equal to the TS layout within 1e-6; the landed sets regenerate byte-identically | T4 row (37 refs: mrtree 14, radial 17, vertiflex 6), T18 `note` row (`tree-goldens.test.ts`) and T4 `fix` row (3 retargeted refs, 40 in all); `end` `regen` row (`default`, `algorithms`, `layered`, `trees`: `git diff --exit-code test/golden/refs/` clean) |
| the tree sweep reports 0 mismatches and 0 one-sided throws, or files each remaining case as `needs-ruling` | final T18 `sweep` row: layered registered, mrtree ok 814 / mismatch 3 / both-throw 89, radial ok 538 / 3 / 365, vertiflex ok 350 / 2 / 553 / excluded 1; 0 `ts-only-throw`, 0 `oracle-only-throw`; the 8 residual cases (7 rectpacking or force option keys, 1 last-ulp `Math.sin` string) are diagnosed (T18 `divergence` row) and filed in issue #68; the tool as committed reports the larger options-only counts of the same row. Met by filing, not by 0 mismatches |
| no cross-algorithm import the Java lacks; `staged-classes.json` is `[]`; fitness tests pass | `test/architecture/bundle-deps.json` fitness tests in every batch gate (`vitest test/architecture`); T17 `fix` row (`staged-classes.json` is `[]`, byte-identical to the base); batch 5-7 `gate` row (`test/architecture test/melk` 469 passed + 1 skipped) |
| the queue gates pass; one squashed commit; `plans/roadmap.md` gains a revision | the "Mission-end gates" table below; the roadmap revision of T20; the squash is the orchestrator's (TR10) |

### Tasks

T1-T20 were planned and all ran (batches 1-8). The follow-up fixes inside the run, each journaled:

- T3 `fix`: vertiflex recorder extension (283 to 471 rows; node-level `considerNodeModelOrder`).
- T4 `fix`: three `*-generated-retarget` golden entries (the generated entries had been recorded with layered).
- T8 `fix`: `NodeComparator` and `RelativeXPlacerSorting` null unboxing, `src/java/lang/Unbox.ts`.
- T15 `fix` (two rows): the committed unit-vector recorder and `mrtree-units.json`; `DoubleStream.average` vector-proven.
- T16 `fix` (two rows) and `divergence`: the `FanProcessor` identity tokens, the replay helpers (`StackOverflowError` mapping,
  `DIRECTION` restore).
- T17 `fix`: structural assertions replaced hand-derived coordinates before the commit.
- T18 `fix`: the sweep tool's `classify` mapping; T1 `fix` (second row): `mrtree-extra.json` (213 rows).
- Batch 2 `fix`: an explicit 60 s timeout on a whole-ref loop.
- T20 `fix` (orchestrator): the prose carve-out for two task names ("AbsolutPlacer", "General 'Rotator"), corrected at the
  port sites and listed under "upstream typos" in `docs/conformance.md`.

### Decisions

TR1-TR10 (`decisions.md`) all held, with one deviation: TR5 (T5 `ruling`: staged provider classes, not `PENDING_TYPES`,
because of the tripwire `test/melk/model-algorithms.test.ts:121-123`). Run-time rulings (7 `ruling` rows): the TR5 deviation;
the stop-13 proofs for `TreeUtil.java:115-116, 163-164` (T6, confirmed by oracle rows in T19) and `ComponentsProcessor.java:249`
(T9); the `FanProcessor.java:105` proof, withdrawn and replaced by the identity model (T16 `divergence` and `fix`); issue #64
(T13); issues #65, #66, #67, #68 (T18). Eight `ad10` rows record every hashed container. Flagged for the maintainer: the TR5
deviation; the assertion pins changed inside the mission (staging tripwires, vertiflex count pins before commit, the
`EdgeRouter.test.ts` direction pin); the `MARKER` widening.

### Divergences

- radial `i30/rand-chain-big` (two rows, issue #64): the order of a treeified identity-hash bin; classified.
- last-ulp `Math.sin` (one sweep case): HotSpot ...4178 against V8 ...4177; known-divergences list.
- fixed at origin: the `FanProcessor` identity defect, the vertiflex null unboxing, the golden mislabel.
- the port's recursion depth is lower than the oracle's beyond the probe depth (issue #67).

### Open issues

`needs-ruling`: #64 (treeified bin), #65 (upstream defects the ports copy), #68 (the 8 residual sweep cases, the three
mislabelled goldens). `follow-up`: #66 (recorder scenarios for unobserved mutants and unrecorded arms), #67 (recursion depth).

### Mission-end gates

| Gate | Command | Result |
| ---- | ------- | ------ |
| 1 | `npm run format:check` | batch 5-7 `gate` row: 0. Final run: exit 0 |
| 2 | `npm run typecheck` | batch 5-7 `gate` row: 0. Final run: exit 0 |
| 3 | `npm run complexity` | batch 5-7 `gate` row: 0. Final run: exit 0, no violation line in the output |
| 4 | `npm run coverage` (sweep dirs `/nonexistent`) | batch 5-7 `gate` row: exit 0, 1,052 files passed, 10 skipped, 47,556 tests passed, 93 skipped, 98.87 / 96.91 / 98.82 / 98.87. Final run: exit 0, the same counts and percentages |
| 5 | `npm run docs:build` | Final run: exit 0 |
| 6 | refs and regenerations: `git diff --exit-code test/golden/refs/` after `regen-goldens.sh --set default\|algorithms\|layered\|trees`; `melk:generate` | `end` `regen` row: clean (4, 9, 24, 40 refs; `src/` clean after `melk:generate Core Labels Polyomino Layered Tree Radial VertiFlex`). Final run: all four sets regenerated, `git diff --exit-code test/golden/refs/` clean; `melk:generate` leaves `src/` clean |
| oracle | cold re-records of `mrtree`, `mrtree-extra`, `radial`, `vertiflex`, `mrtree-units` | `end` `regen` row: `cmp`-identical |
| oracle | Java baseline (scratch `java-tests.sh`) | `end` `regen` row: `MrTreeGraphSizeTest` 6 / 0, `CenterOnRootTest` 2 / 0, equal to the start |
| tests | `npm test` | batch 5-7 `gate` row: 78.10 s (baseline 101.7 s; stop 9 clear). Final run: 93.36 s at load 57, 1,052 files passed, 10 skipped, 47,556 tests passed, 93 skipped |
| refs diff | `git diff --name-status <base> -- test/golden/refs/ test/corpus/ test/golden/inputs/ test/golden/*.json` | batch 5-7 `gate` row: only `A refs/java/{mrtree,mrtree-extra,mrtree-units,radial,vertiflex}.json`, `A refs/elk-trees/**` (41), `A trees.json`, `A trees-inputs/**` (37); under `test/corpus/` only `ts-layout-compare.test.ts`. Final run: the same list |
