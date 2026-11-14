<!-- SPDX-License-Identifier: EPL-2.0 -->

# Decisions: ts-parity-dashboard, roadmap row 9 (issue #40; auto-confirmed at planning, 2026-11-13)

This mission was planned unattended (`/plan-mission --unattended`). Every row below is the planner's recommendation. The
rejected options and the evidence are under [Auto-confirmed (unattended)](#auto-confirmed-unattended), for the maintainer to
audit. The rows amend AD-1…AD-16 and the earlier missions' rows; they never rewrite them. Cite a row with its mission, for
example `ts-parity-dashboard TP2`.

| ID | Decision |
|----|----------|
| TP1 | **Oracle input.** Run one fresh full oracle sweep: every algorithm and every tier, current oracle `8aaa3c14` plus patches 0001 and 0002, `JAVA_TOOL_OPTIONS="-XX:+UnlockExperimentalVMOptions -XX:hashCode=2"`. It runs through `tools/oracle/sweep.sh` into its default directory `$ELK_ORACLE_DIR/sweep/<elk>-<models>/` and replaces the stale 10,881-row partial there. |
| TP2 | **TS sweep runner.** `ts-layout-compare.ts` runs the cases in `--shards N` forked child processes (`node:child_process` `fork`, inheriting `process.execArgv` so tsx loads), round-robin as `sweep.ts` shards. Each case has a time limit (`--timeout-ms`, default 120,000). If a case runs past it or its child dies, the child is killed and the case gets the new category `ts-aborted`, with `timeout` or `exit <code>` as the detail. The shard then goes on with a fresh child. With no `--algorithms`, the default is every algorithm in `results.jsonl`. |
| TP3 | **What a TS sweep writes.** `--out <file>` writes the summary (contract in [batch-1/T1](batch-1/T1-sharded-compare.md#interface-contract)) plus a `cases` array with one outcome per case, so every case has a status. Nothing from a sweep is committed (AD-5). The committed record is the generated `docs/parity-report.md`. |
| TP4 | **Dashboard = the parity report.** `parity-report.ts` gains a required `--ts-summary <file>`. It fills the `TS conformant` column with `ok + both-throw` out of the compared cases, adds a `TS sweep` table per algorithm (every category, wall times) and adds a `TS findings` section that lists every reported case with its annotation. The existing `copy-reports.mjs` mirrors the report into `docs-site/parity.md` during `docs:build`. There is no new site component. |
| TP5 | **Annotations, display only.** `tools/corpus/ts-findings.json` (`[{ caseId, issue, note }]`) labels known findings with their issue (for example the four #79 cases). It changes no category, no count and no exit code. The four #79 cases stay as they come out of each run, because #79 is the maintainer's to decide. |
| TP6 | **Triage of findings.** Every `mismatch`, one-sided throw and `ts-aborted` case gets a diagnosis artifact. Defect in the tooling (overlay, export, classification): fix it here. Landed `src/` defect: fix it at the origin with oracle evidence when the fix is local (one module, no landed expected value changes, as 8c's `JavaObjects.equals`); otherwise file a `follow-up` issue with the artifact. An upstream defect or a platform `Math.*` difference: file `needs-ruling` (a new known-divergence entry needs the maintainer's approval; the 0.01 px rule is #74's). Annotate each case. |
| TP7 | **Non-strict `Math.*` call sites.** A new `docs/conformance.md` section lists every transcendental `Math.*` call in `src/` (36 calls in 14 files at planning) with its Java site and its evidence, and links the observed last-ulp divergences to their approved entries. A fitness test pins the set of call sites against `test/architecture/math-call-sites.json`, so a new site cannot land unlisted. There is no `StrictMath.ts`: `JavaMath.log` already is the `StrictMath.log`-exact shim, and it has two callers (`Random.nextGaussian`, `EadesModel` per 8b FD3). |
| TP8 | **Scope edges and commit.** Issues #72 (canonical NaN), #74 (the 0.01 px amendment), #75 and #79 are not decided here; they get evidence comments only. The 13 residual cases of #68 item A and #71 item 2 are re-run in the full sweep and must be `ok`. The mission ends as one squashed commit on the base sha, with the history under the tag `ts-parity-dashboard/pre-squash` and the footer `Refs: #40`. |

## TP1: oracle input

`$ELK_ORACLE_DIR/sweep/8aaa…-ac5a…/` holds 10,881 rows from 2026-11-05: 286 per non-layered algorithm and 7,163 layered. That is a
filtered run that overwrote the full one, so it no longer matches its own `docs/parity-report.md` (18,023 cases, patch 0001
only). `parity-report.ts` reads only that default directory. A full run takes about 2 minutes. The 8b and 8c sweeps (FD6,
PK9) used `-XX:hashCode=2`, and so do the recorders. Run detached under `nice -n 10` after an `uptime` check (queue rules). The
oracle columns of the report change with the new patch set and the new generated inputs. That is expected: journal the old and
new counts.

## TP2: runner

`ts-layout-compare.ts` is 503 lines, over the 500-line hook limit, so any edit has to split it first. Suggested modules:
`ts-layout-classify.ts` (the pure parse, classify, neutralise and compare functions), `ts-layout-shards.ts` (the parent-side
pool), `ts-layout-worker.ts` (the child entry). `ts-layout-compare.ts` stays the CLI and re-exports every symbol it exports
today, so `test/corpus/ts-layout-compare.test.ts` passes unchanged (AD-13). The child protocol is one JSON line per case on
IPC (`process.send`). The parent measures the time limit per case; on `timeout` it calls `child.kill('SIGKILL')`. The
category order in `CATEGORIES` gains `ts-aborted` before `excluded`, and `REPORTED` gains it too.

## TP4: report cells

- `TS conformant`: `<ok + both-throw> / <planned − excluded> (<pct>%)`, with one decimal for the percentage. When the TS
  summary has no row for an algorithm: `— (not in TS sweep)`.
- The `TS sweep` table has these columns: algorithm, planned, ok, mismatch, both-throw, ts-only-throw, oracle-only-throw,
  ts-aborted, excluded, options-only mismatches, TS ms, oracle ms.
- The `TS findings` section has one line per reported case: `` `caseId` ``, the category, the first difference (at most
  200 characters), and the annotation (`#N: note`) or `unannotated`. Order: algorithm, then case id.
- The header gains `TS sweep: <node version>, <shards> shards, <wall> min, timeout <s> s`.

## TP7: call-site list

The fitness test scans `src/**/*.ts` (excluding `*.test.ts`) for `Math.(sin|cos|tan|asin|acos|atan|atan2|exp|log|log10|log1p|expm1|pow|sinh|cosh|tanh|hypot|cbrt)(`
and compares the multiset of `{ file, fn }` with the JSON. Line numbers are documented in the conformance table, not pinned,
so unrelated edits do not break the test. Evidence per site: the oracle rows, goldens or sweep cases that reach it, and any
measured last-ulp difference (for example the 8b `getOrthogonalPoints` experiment). Measuring each site's delta against the
0.01 px bar is #74's work, not this mission's.

## Auto-confirmed (unattended)

| Row | Chosen | Rejected (why) | Evidence |
|-----|--------|----------------|----------|
| TP1 | Fresh full sweep into the default directory | Reuse the 8b/8c per-algorithm sweeps (they were scratch under `$TMPDIR` and are gone; they cover 7 of 14 algorithms); add `--sweep-dir` to `parity-report.ts` and sweep to `--out` (a second cache next to a stale default one) | `results.jsonl` counts at planning (286 per algorithm); `parity-report.ts` `buildReport`; journals FD6, PK9 |
| TP2 | Forked shards with a per-case kill | In-process sequential (one hang, #73, or a cubic `DepthFirstCompaction` input stalls 18k cases with no bound; the 8c hand-off names this gap); `worker_threads` (`terminate` works, but whether tsx loads in a worker is unverified, and `sweep.ts` already uses processes) | 8c roadmap hand-off "per-case bound … open"; `.agent-notes/alg-packing.md` (orphaned vitest worker, cubic chain); `tools/corpus/sweep.ts:286` |
| TP3 | Per-case outcomes only in the local `--out` | Commit the per-case outcomes (about 18k rows of churn against AD-5) | AD-5; the committed report is already the record of the oracle sweep |
| TP4 | Extend the generated report | A Vue dashboard component with JSON data (YAGNI, untranslated page, more surface to test) | `copy-reports.mjs` mirrors already; `parity.md` is in `TRANSLATABLE_EXCLUDES` |
| TP5 | Display-only annotations | Annotations that reclassify (that would decide #79 options 2 and 3) | #79 is `needs-ruling` |
| TP6 | Fix local defects, file the rest | Halt on the first port defect (the mission's deliverable is the measurement); fix everything in the mission (unbounded) | 8c fixed `JavaObjects.equals` the same way (stop 15) |
| TP7 | Documented list plus a fitness test; no `StrictMath.ts` | Move `log` into a new `StrictMath.ts` (churns a landed shim with two importers and no behaviour change; the roadmap condition predates FD3); port fdlibm `sin`/`cos`/`atan2` (HotSpot's `Math` is not `StrictMath`: 8b measured that V8 already equals `StrictMath` while HotSpot differs on 9 of 160 `cos` inputs, so a port would not match the oracle any better) | `src/java/lang/JavaMath.ts:97-106`; `docs/conformance.md` § Known divergences (mission 8b); roadmap § 1 scope note |
| TP8 | Evidence comments only on #72, #74, #75, #79 | Folding #74 or #72 into this mission (each is its own `queue:ready` issue) | The issue list at planning |
