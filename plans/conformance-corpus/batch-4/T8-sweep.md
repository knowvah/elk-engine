<!-- SPDX-License-Identifier: EPL-2.0 -->

# T8 — Oracle corpus sweep

**Agent:** typescript-pro · **Commit:** `feat(corpus): sweep oracle verdicts per algorithm`

## Context
The oracle now reads `.elkt`, runs id-keyed case files with `algorithm`/`variant`, times out
cases, and generates graphs (T3, T5, T6). `test/corpus/census.json` lists 898 models with their
`rootAlgorithm` (T4). This task produces the denominator for every algorithm row: what the
oracle does on each case, and whether it is deterministic. No TS layout exists yet.

## Task
Plan all cases, run them twice in separate JVMs, assign one verdict per case, and write results
to the local sweep cache.

## Write-set
`tools/oracle/sweep.sh` (thin wrapper), `tools/corpus/sweep.ts`, `test/corpus/sweep.test.ts`.

## Read-set
- `../decisions.md` D1, D2, D4, D5, D6, D7, OR-1, OR-2
- `../batch-2/T4-census.md#interface-contract-output-consumed-by-t8-t9`
- `../batch-2/T5-oracle-retarget.md#interface-contract-extends-t3-consumed-by-t6-t7-t8`
- `../batch-3/T6-oracle-generate.md#interface-contract-consumed-by-t8`
- `test/corpus/variants.json` · `tools/oracle/run.sh` (case-file usage)

## Case plan (pure function `planCases(census, algorithms, variants, generated)`)
| Tier | Models | Algorithm | Variants |
|------|--------|-----------|----------|
| native | every census model with `parse: 'ok'` | its `rootAlgorithm` (no override) | all D6 |
| retarget | every census model with `parse: 'ok'` | every id from `--list-algorithms` except the model's `rootAlgorithm` | `default` only (OR-1) |
| generated | every `test/corpus/generated/*.json` | from the file name prefix (D2 override) | all D6 |

`caseId = "<tier>/<algorithmSuffix>/<variant>/<modelId>"`. Models with `parse: 'error'` are
listed in the summary, not planned.

## Interface contract (output, consumed by T9)
- `$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/results.jsonl`, one line per case:
  `{ caseId, tier, algorithm, variant, modelId, verdict, exception?, ms }`, sorted by `caseId`.
- `summary.json`: `{ elkCommit, modelsCommit, cases, wallMs, parseErrors: string[] }`.
- `verdict` per D4 from the pure function `verdictOf(runA, runB)`:
  either `oracle-error` → `oracle-error`; else either `timeout` → `timeout`; both `ok` with
  byte-equal output → `ok`; both `throws` with equal class and message → `throws`;
  anything else → `nondeterministic`.

## Acceptance criteria
- Given fixtures, then `verdictOf` returns each of the five verdicts for its rule above.
- Given a 2-model census fixture, 3 algorithms, and 2 variants, then `planCases` returns exactly
  the expected caseIds (native 4, retarget 4, generated per fixture) with no duplicates.
- Given the pinned clone and built oracle, when `tools/oracle/sweep.sh` runs the full plan, then
  `results.jsonl` has one line per planned case and the wall time is journaled (> 60 min = STOP 9).
- Given any `oracle-error` in the full sweep, then it is diagnosed and fixed in the harness, or
  journaled as STOP 7.

## Quality bar
README gates; `shellcheck tools/oracle/sweep.sh` clean. Runs JVM batches through `run.sh`;
does not reimplement classpath logic.

## Observability
Progress to stderr every 1,000 cases (`done/total`, elapsed); `summary.json` carries `wallMs`.

## Rollback
Reversible — revert the commit; delete the local sweep cache.

## Boundaries
No report generation (T9). Sweep outputs never enter the repo (AD-5, D9).
