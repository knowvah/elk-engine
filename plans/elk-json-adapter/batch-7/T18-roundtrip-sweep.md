<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Round-trip vs `elk-parse` refs, local 550-model sweep

**Agent:** tooling-engineer · **Commit:** `test(T18): prove the json round trip against the oracle`

## Context
The mission's exit evidence (J7, J8).

## Task
1. `test/golden/json-roundtrip.test.ts`: for each `test/golden/refs/elk/<name>.json` (not
   `_meta.json`), `ElkGraphJson.forGraph(text).toElk()` then export with the oracle's flags
   (`CaseRunner.java:71-78`: omitLayout false, omitZeroDimension false, omitZeroPositions false,
   omitUnknownLayoutOptions true, prettyPrint true, shortLayoutOptionKeys default) and seed 1 (J4:
   `new JsonExporter(new Random(1))` path as T15 does) — compare with
   `test/golden/refs/elk-parse/<name>.json` byte for byte; check `_meta.json`'s input sha256s still
   match the inputs.
2. `tools/oracle/json-sweep.sh`: write oracle `parse` outputs for every `.json` under
   `$ELK_MODELS_DIR` into a gitignored dir (`test/corpus/.json-sweep/`), via `run.sh --cases`
   (EXPORT_SEED=1); skip if already fresh (commit + input hash).
3. `test/corpus/json-sweep.test.ts`: skip with a message when `ELK_MODELS_DIR` or the sweep dir is
   absent (the `test/corpus/corpus.ts` `ModelsDirResult` pattern); else for each model compare TS
   `parse` output to the oracle's with `test/golden/compare-json.ts` (1e-6) and report per-model
   diffs; the test fails on any diff. Total ≤ 120 s.
4. `.gitignore`: `test/corpus/.json-sweep/`.

## Write-set
`test/golden/json-roundtrip.test.ts`, `tools/oracle/json-sweep.sh`, `test/corpus/json-sweep.test.ts`,
`.gitignore`.

## Read-set
- `tools/oracle/{run.sh,regen-parse-refs.sh}`, `test/corpus/{corpus.ts,sweep.test.ts}` (skip pattern),
  `test/golden/compare-json.ts`, `src/graph/json/ElkGraphJson.ts`, `src/graph/json/JsonExporter.ts`
- `../decisions.md#j7--exit-evidence`, `#j8--comparison-strictness`

## Interface contract
None consumed later (T20 documents the commands).

## Acceptance criteria
- Given the 4 `elk-parse` refs, then TS output is byte-identical.
- Given `ELK_MODELS_DIR` and a fresh `json-sweep.sh` run, then all 550 models match within 1e-6
  (any diff → diagnosis; stop 8/14 if not attributable).
- Given no `ELK_MODELS_DIR`, then the sweep test is skipped with a message and CI stays green.

## Quality bar
README gates; `shellcheck` clean; `npm test` still ≤ 60 s (sweep skipped by default).

## Observability
The sweep prints a one-line summary (models, matched, diffs); no other output.

## Rollback
Reversible — revert the commit.

## Boundaries
No source edits; no edits to refs.

## Amendment (2026-10-13, J7 amendment in decisions.md)
Before TS import, delete every `resolvedAlgorithm` key (full id `org.eclipse.elk.resolvedAlgorithm`
or any suffix the exporter wrote) from every `layoutOptions` object of the golden, exactly as
`tools/oracle/regen-parse-refs.sh` does, and assert the stripped input's sha256 equals
`_meta.json`. Also assert that importing the unstripped golden throws the T3-recorded exception.
