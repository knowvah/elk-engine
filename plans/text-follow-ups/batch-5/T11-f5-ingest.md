<!-- SPDX-License-Identifier: EPL-2.0 -->

# T11: F5 ingest (orchestrator)

**Goal:** the `.elkj` sweep evidence covers ~40 larger graphs instead of 6, with every divergence diagnosed.

## Write-set

- `docs/conformance.md` §8 sweep table and paragraph
- `docs/architecture/elk-json-text.md` (sweep evidence, selection, oracle wall time per kind from `wall.tsv`)
- `plans/graph-json-text/follow-ups.md` (F5 Status; new rows per D4)

No code: `test/corpus/elkj-sweep.test.ts` and `tools/oracle/elkj-sweep.sh` are used as they are. A needed change to
either is stop 1.

## Read-set

- `plans/graph-json-text/batch-9/T17-sweep.md` (indicators, procedure) and 4c's T17 journal rows (the old numbers)
- The sweep's `summary.json`, `selection.tsv`, `results.jsonl`, `wall.tsv` under
  `$ELK_ORACLE_DIR/sweep/elkj-<elkCommit>-<modelsCommit>/`
- `decisions.md#d2-f5-sweep`, `#d4-divergences`

## Steps

1. Confirm the run finished: `summary.json` present, the log ends without error, `selection.tsv` has the 345 small
   graphs plus 40 sampled.
2. `npx vitest run test/corpus/elkj-sweep.test.ts`; collect each indicator line (`elkj sweep: <indicator>=<n>/<total>`)
   and the TS time.
3. Each failure or `nondeterministic`/`oracle-error`/`timeout` case: a diagnosis artifact in the journal. In-mission
   fix per D4 → write the T11b spec into the journal and run it; else a new follow-up row. No diagnosis: stop 10.
4. Docs and the F5 status.

## Acceptance criteria

- Given the sweep, then the journal records the selection (small/sample counts, size bands), every indicator
  `n/total`, the nondeterministic count, the oracle wall time and the TS time.
- Given any divergence, then it has a diagnosis artifact and either a T11b fix or a new follow-up row.
- Given the docs, then §8 states the new indicators beside the old 6-graph ones, and `npm run docs:build` passes.

## Observability / rollback

The indicators are this mission's observability (Phase 4): a drop in any indicator against 4c's numbers on the same
graphs is an AD-13 stop (stop 4/10). Reversible: docs only.

## Commit

`docs(T11): record the fuller elkj sweep`; body cites F5 and the indicator lines.
