<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Hash sweep at the P3 stop over `$ELK_MODELS_DIR`

**Agent:** java-architect (sonnet) · **Commit:** `test(T10): add the layered order sweep`

## Context

Mission 7c (README), B6 as refined by 7b's T10 (journal rows "canonical form" and "done"): one canonical-dump SHA-256
per case, canonical form = `edges`/`changed` sorted by path, `int`/`double` as raw IEEE-754 hex, enum `c` by last
segment, empty `set` with `c` null, sorted keys, no whitespace; `ok` lines carry `prefix` and `options`; `throws` lines
carry the planned `prefix`; zero-height `STRETCH_WIDTH` levels pre-flagged `timeout`; 20 s per case; stride-2
sampling with `ORDER_SWEEP_STRIDE=1` override. Patterns: `tools/vectors/LayeredPhaseVectors.java` (`PhaseSweep`),
`tools/oracle/phase-sweep.sh`, `test/corpus/phase-sweep.test.ts`, `test/helpers/layered-phase-sweep.ts`.

## Task

1. `LayeredOrderVectors.java --sweep <modelsDir> <outDir>` / `--dump <case> <modelsDir> <outDir>`: every ptolemy model,
   every level, the P3 stop per `CrossingMinimizationStrategy` (default greedy switch and thoroughness), canonical
   form extended with `ports` (`{ nodePath: [portPath] }`, keys sorted); the no-flag output stays byte-identical.
2. `tools/oracle/order-sweep.sh [--force]` (stamp = oracle build + recorder source + models commit + input hash;
   `ORDER_SWEEP_DIR` override; writes `test/corpus/.order-sweep/results.jsonl`).
3. `test/corpus/order-sweep.test.ts` + `test/helpers/layered-order-sweep.ts`: replay each `ok` case through the real
   factories from its `prefix`/`options`, hash, compare; count `refused`/`timeout`; `throws` must throw the same class;
   skip with a message when the models dir or sweep dir is absent. Under about 5 minutes at stride 2 (time a 10-model
   subset first, then the full run; report both).
4. `.gitignore`: `test/corpus/.order-sweep/`.
5. A mismatch is a port defect: `--dump`, diagnose the first departure, report; never change the port, a helper or the
   canonicalisation to match.

## Write-set

`tools/vectors/LayeredOrderVectors.java` (sweep/dump modes only), `tools/oracle/order-sweep.sh`,
`test/corpus/order-sweep.test.ts`, `test/helpers/layered-order-sweep.ts`, `.gitignore`.

## Read-set

The four 7b sweep files above (read only), `tools/vectors/layered-order-vectors.sh`, `test/helpers/layered-order-replay-*.ts`,
`src/alg/layered/LayeredOrderVectors.test.ts`, `decisions.md` C3, `plans/layered-cycles-layers/decision-journal.md`
(T10 rows), `.agent-notes/layered-cycles-layers.md`.

## Acceptance criteria

- Given `ELK_MODELS_DIR`, when the sweep runs twice, then the second is skipped as fresh and `results.jsonl` unchanged.
- Given `results.jsonl`, when the TS test runs at stride 2, then every `ok` case's hash matches, under about 5 minutes.
- Given no models dir, when the test runs, then it skips with a message and `npm test` time is unchanged.
- Given `layered-order-vectors.sh`, when rerun, then `layered-order.json` is byte-identical.

## Observability / Rollback

N/A. Reversible.
