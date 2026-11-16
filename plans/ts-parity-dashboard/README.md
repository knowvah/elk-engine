<!-- SPDX-License-Identifier: EPL-2.0 -->

# TS sweep and per-algorithm parity dashboard: mission brief (roadmap row 9, issue #40)

## Objective

Run the TypeScript engine over every `(algorithm, model, variant)` case of a fresh full oracle sweep and compare each case at
AD-4. Report a status for every case per algorithm, and publish the per-algorithm results as the TS half of
`docs/parity-report.md`, which `docs:build` mirrors to the site. Also create the AD-4 list of non-strict `Math.*` call sites.
This is a tooling mission: it ports no ELK class.

Exit (issue #40 "done when", plus the maintainer's comments on it):

- the TS sweep reports a category for every case of every algorithm (`--out` holds one outcome per case), run sharded with a
  per-case limit (TP2, TP3);
- `docs/parity-report.md` is regenerated from the fresh oracle sweep and the TS summary, with the TS column, the TS table and
  the findings (TP1, TP4); `npm run docs:build` builds it into `docs-site/parity.md`;
- every reported case has a diagnosis artifact and an annotation (an issue or the tooling fix that closed it) (TP5, TP6);
- the 7 cases of #68 item A and the 6 of #71 item 2 are `ok` in the full sweep (TP8);
- the `Math.*` call-site list exists in `docs/conformance.md`, and the fitness test pins it (TP7);
- the queue gates pass; there is one squashed commit on the base (TP8); `plans/roadmap.md` gains
  `## Revision <end date> (ts-parity-dashboard)`.

**Parts this mission does not decide.** #72, #74, #75 and #79 (evidence comments only). A finding that needs a maintainer
decision becomes its own issue (TP6), and the rest of the mission goes on.

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full. The queue rules in your system prompt win over it.
2. Read [decisions.md](decisions.md), [stop-conditions.md](stop-conditions.md) and [decision-journal.md](decision-journal.md).
3. Read `.agent-notes/conformance-corpus.md`, `alg-packing.md`, `alg-force-disco.md` and `ts-parity-dashboard-planning.md`.
   Journal what affects the approach: `-XX:hashCode=2`, orphaned vitest workers, probes of a loop that never ends, the #79
   flicker, the 286-row stale cache.
4. Branch: `git branch --show-current` must print `chore/issue-queue`. If the brief is not committed yet, commit it with
   `git add plans/ts-parity-dashboard .agent-notes/ts-parity-dashboard-planning.md` and then
   `git -c commit.gpgsign=false commit -m "docs(plans): add ts-parity-dashboard mission brief"`. Record the squash base in the
   journal: the driver's base if the prompt names one, else that commit's parent (at planning `14f5b69`, the 8c squash commit).
5. Check the oracle stamp: `$ELK_ORACLE_DIR/oracle-build.json` must name `tools/oracle/ELK_COMMIT` and patches `0001` and
   `0002`. Then run `git -C $ELK_SOURCE_DIR log --oneline <pin>..HEAD -- plugins/`. At planning that showed only `8bd00922`;
   journal any other change.
6. Measure `npm test` (every sweep directory `/nonexistent`, as below) together with `uptime`, and journal the result as
   stop 9's baseline.
7. Find the first batch below marked `[ ]`, read its `overview.md`, and resume at its first incomplete task.

## Inputs (read only)

| What | Where |
| ---- | ----- |
| TS comparison | `tools/corpus/ts-layout-compare.ts`, `test/corpus/ts-layout-compare.test.ts` (both land with 8c) |
| Oracle sweep | `tools/oracle/sweep.sh` → `tools/corpus/sweep.ts` (sharding pattern at `:194-200`, `:286`, `:395-405`) |
| Report | `tools/corpus/parity-report.ts`, `test/corpus/parity-report.test.ts`, `docs-site/copy-reports.mjs` |
| Pipeline helpers | `test/helpers/graph-overlay.ts`, `test/helpers/graph-json-oracle.ts`, `test/golden/compare-json.ts` |
| Divergence context | `docs/conformance.md` §§ 2, Core layouts, Known divergences (8a, 8b, 8c); `src/java/lang/JavaMath.ts` |

Never edit `tools/oracle/run.sh`, `tools/oracle/sweep.sh`, `tools/corpus/sweep.ts`, `test/corpus/{manifest,variants,census}.json`,
any file under `test/golden/refs/`, or a landed test's expected value. The exceptions are T6's `src/` fixes, under TP6 and
stop 15.

## Quality gates

Agents run these in the foreground: their own tests, `npm run typecheck`, `npx prettier --check <files>`, `npm run complexity`,
and `npx vitest run test/architecture`. After every batch the orchestrator runs the following **alone**. First check `uptime`
and `ps` for orphaned vitest workers or tsx children; rerun a failure caused only by a timeout once the load is normal.

```bash
npm run format:check && npm run typecheck && npm run complexity   # clean; never trust plain lizard's exit code
npx vitest run test/architecture test/corpus
SWEEPS="PHASE_SWEEP_DIR=/nonexistent ORDER_SWEEP_DIR=/nonexistent PLACEMENT_SWEEP_DIR=/nonexistent ROUTING_SWEEP_DIR=/nonexistent PIPELINE_SWEEP_DIR=/nonexistent LABELS_SWEEP_DIR=/nonexistent LOOPS_SWEEP_DIR=/nonexistent COMPOUND_SWEEP_DIR=/nonexistent"
env $SWEEPS npm run coverage                                      # 90/90/90/90 (the full suite)
env $SWEEPS npm test                                              # ≤ baseline + 20 s (stop 9)
git diff --exit-code <base> -- test/golden/refs/ test/corpus/manifest.json test/corpus/variants.json test/corpus/census.json
```

At mission end, also run the following and journal each result (queue gates 1–6):

```bash
npm run docs:build                                                # docs-site/parity.md shows the TS column
npx tsx tools/corpus/parity-report.ts --ts-summary <T6 summary>  # exit 0: the committed report is current
for s in default algorithms layered trees force-disco packing; do tools/oracle/regen-goldens.sh --set $s; done && git diff --exit-code test/golden/refs/
```

For JVM sweeps, check `uptime` first (above 12, wait), then run
`nohup nice -n 10 bash -c '<cmd>; echo "exit $?"' >"$TMPDIR/<name>.log" 2>&1 &` and poll in the foreground for at most
9 minutes at a time. The TS sweep runs the same way. Parallel agents never run `npm run coverage` and never commit. The
orchestrator commits each task with `git -c commit.gpgsign=false commit -F <file>`.

## Stop conditions and push-forward

[stop-conditions.md](stop-conditions.md) lists them in the queue form, with the push-forward list. The most likely to fire:
3 (AD-13), 5 (findings beyond the bound), 6 (nondeterminism), 14 (a divergence).

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
| ----- | ---- | ----- | ---------- | ------ |
| [1](batch-1/overview.md) | Sharded comparison, report TS sections, `Math.*` list | T1, T2, T3 | — | [x] |
| [2](batch-2/overview.md) | Full oracle sweep, TS sweep, residual re-runs | T4 | 1 | [x] |
| [3](batch-3/overview.md) | Triage of every finding | T5, T6 | 2 | [x] |
| [4](batch-4/overview.md) | Report regeneration, docs, roadmap, notes, squash | T7, T8 | 3 | [x] |

## Documents

[decisions.md](decisions.md) · [stop-conditions.md](stop-conditions.md) · [decision-journal.md](decision-journal.md) ·
[agent-rules.md](agent-rules.md) · [diagrams/data-flow.md](diagrams/data-flow.md) ·
[diagrams/component-map.md](diagrams/component-map.md)

Recommended executor model: `fable` (long horizon). Agents use [agent-rules.md](agent-rules.md) plus their task file: sonnet
for T1–T3 and T7, opus for the T5 and T6 triage.

## Mission summary

**Tasks.** 8 of 8 planned tasks completed (T1-T8) in 4 batches; the gates after batch 1, after batches 2 and 3, and at the end
are journaled (`gate` rows). Design and runbook: [`docs/architecture/parity-dashboard.md`](../../docs/architecture/parity-dashboard.md);
counts and findings: `docs/conformance.md` § TS corpus sweep; the dashboard: `docs/parity-report.md`; the roadmap revision
`## Revision 2026-11-13 (ts-parity-dashboard)` in `plans/roadmap.md`. Execution notes: `.agent-notes/ts-parity-dashboard.md`.
Agents: `typescript-pro` (sonnet) for T1, T2 and T3; `documentation-engineer` (sonnet) for T7's prose; T4, T5, T6 and T8 by the
orchestrator.

**Exit items and the journal rows that prove them.** Kinds are the journal's.

| Exit item (Objective) | Result | Journal row (task, kind) |
| --------------------- | ------ | ------------------------ |
| the TS sweep reports a category for every case of every algorithm, sharded with a per-case limit (TP2, TP3) | 18,930 cases, 14 algorithms, 8 shards, 120 s limit, 44.7 s; one outcome per case in `--out`; 0 `ts-aborted` | T1 `note`; T4 `sweep` (TS run 1); T6 `sweep` |
| `docs/parity-report.md` regenerated from the fresh oracle sweep and the TS summary; `docs:build` mirrors it (TP1, TP4) | oracle sweep 18,930 cases, 0 `oracle-error`; report written, staleness check exit 0; `docs-site/parity.md` has both TS sections | T4 `sweep` (oracle); T7 `fix`; T8 `gate` |
| every reported case has a diagnosis artifact and an annotation (TP5, TP6) | 3 mechanisms: one landed-port defect fixed (`ModelOrderCycleBreaker` unboxing), the accepted last-ulp case (#68), spore jitter (#79); 2 findings in the final run, both annotated; 0 unannotated | T5 `fix`, `divergence` (two rows), `note` (two rows); T6 `fix`, `sweep` |
| the 7 cases of #68 item A and the 6 of #71 item 2 are `ok` (TP8) | all 13 `ok` | T4 `gate` |
| the `Math.*` call-site list exists and the fitness test pins it (TP7) | 36 sites in 14 files; `math-call-sites.fitness.test.ts` and `.json` | T3 `note`; batch-1 `gate` |
| the queue gates pass; one squashed commit on the base; the roadmap gains the revision (TP8) | end gates 1-6 green; revision appended; one commit on `14f5b691`, history under the tag `ts-parity-dashboard/pre-squash` | T8 `gate`, `regen`, `note` |

**Decisions made.** TP1 and TP3-TP8 as planned. TP2 deviates in one point (T1 `ruling`, issue #82): `CATEGORIES` stays the
in-process six and the sweep counts `ts-aborted` through `SWEEP_CATEGORIES`, because a landed test pins the six-key `counts`
(AD-13). Other deviations, all journaled: `ts-layout-pipeline.ts` and a test-only worker deps module beside the planned files
(T1 `note`); `docs/parity-report.md` in `.prettierignore` (T7 `fix`); `documentation-engineer` for T7 (T7 `note`); T5 not fanned
out. Landed-code change (stop 15): `ModelOrderCycleBreaker.ts` reads two graph properties through `unboxInteger` (T5 `fix`,
T6 `fix`); no landed expected value, ref, vector or tolerance changed.

**Flagged for review.** The #82 split; the landed `ModelOrderCycleBreaker.ts` change and its oracle-derived test; the
`.prettierignore` entry and the now unpadded committed report; the annotations for the four #79 cases, which are `excluded` in
this sweep; one end-gate failure caused by this mission's own docs (a code fence in `docs/conformance.md` against the translation
lint; fixed at the first attempt, all gates rerun: T8 `fix`); one oracle repeat started at load 46 on the wrong input twin,
discarded and redone (T5 `divergence`); the evidence cells of the `Math.*` table mean "a test reaches the call". Stop 5 did not
fire (1 landed-port mechanism, 0 unannotated cases).

**Issues filed.** `needs-ruling`: #82 (six categories pinned by a landed test, TP2 asked for seven), #84 (upstream: nested
graphs under `INCLUDE_CHILDREN` lack `MAX_MODEL_ORDER_NODES`; draft upstream issue in the journal, nothing filed upstream).
`follow-up`: #83 (the same missing unboxing throw in `GreedyModelOrderCycleBreaker` and `SCCModelOrderCycleBreaker`, with
oracle evidence). Comments: #40, #68, #71, #74, #79. Not decided here: #72, #74, #75, #79.
