<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Hash sweep over `$ELK_MODELS_DIR`

**Agent:** java-architect (sonnet; resume T1's agent) · **Commit:** `test(T10): add the layered phase sweep`

## Context

Mission 7b (README), B6. The Java tests run every strategy over all 550 ptolemy models; the committed rows cover 9.
The sweep gives the same breadth locally without committing output (AD-5): the recorder hashes a canonical phase dump
per case, the TS test replays and hashes its own. Pattern: `tools/oracle/json-sweep.sh` + `test/corpus/json-sweep.test.ts`
(stamp, skip when absent, `results.jsonl`).

## Task

1. `LayeredPhaseVectors.java --sweep <modelsDir> <outDir>`: for every `realworld/ptolemy/**/*.json`, every hierarchy
   level, every `CycleBreakingStrategy` (P1) and `LayeringStrategy` (P2, default breaker), the B1 pipeline row, then
   `sha256(canonical(expected))` where `canonical` is JSON with sorted keys and no whitespace; one line
   `{ "id": "<model>/<target>/<phase>/<strategy>", "sha256": "…" }` per case, `status: "refused"` with the processor
   name when B4 refuses, `"throws"` with class and message when the oracle throws. `--dump <case> <outDir>` writes the
   full row for one case. Existing groups stay byte-identical (gate).
2. `tools/oracle/phase-sweep.sh [--force]`: the `json-sweep.sh` structure; stamp = oracle build + recorder source +
   models commit + input hash; writes `test/corpus/.phase-sweep/results.jsonl`.
3. `test/corpus/phase-sweep.test.ts`: skips with a message when the dir or `ELK_MODELS_DIR` is absent; otherwise
   replays each `ok` case through T3 with the real factories, hashes with the same canonicalisation (a shared helper in
   `test/helpers/layered-phase-replay-dump.ts` is T3's; add `canonicalHash` in a new `test/helpers/layered-phase-sweep.ts`),
   asserts equality; `refused` and `throws` cases are counted, and `throws` cases must throw the same class in TS.
4. `.gitignore`: `test/corpus/.phase-sweep/`.
5. Budget: the TS test must finish under about 5 minutes on the 550 models; trim the strategy set per model by
   seed-rotated sampling if needed (journal the rule) rather than exceed it. `npm test` without the dir is unaffected
   (stop 11 is measured without it).

## Write-set

`tools/vectors/LayeredPhaseVectors.java` (sweep and dump modes only), `tools/oracle/phase-sweep.sh`,
`test/corpus/phase-sweep.test.ts`, `test/helpers/layered-phase-sweep.ts`, `.gitignore`.

## Read-set

`tools/oracle/json-sweep.sh`, `test/corpus/{json-sweep.test.ts,corpus.ts}`, `test/helpers/layered-phase-replay-*.ts`,
`decisions.md` B6.

## Acceptance criteria

- Given `ELK_MODELS_DIR`, when the sweep runs twice, then the second run is skipped as fresh and `results.jsonl` is unchanged.
- Given `results.jsonl`, when the TS test runs, then every `ok` case's hash matches and every `throws` case throws
  the same class.
- Given no models dir, when the test runs, then it skips with a message and `npm test` time is unchanged.
- Given `layered-phase-vectors.sh`, when rerun, then `layered-phases.json` is byte-identical.

## Observability / Rollback

N/A. Reversible.
