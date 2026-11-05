<!-- SPDX-License-Identifier: EPL-2.0 -->

# T14 — Hash sweep and cross-check

**Agent:** java-architect (sonnet) · **Commit:** `test(T14): add the layered pipeline sweep`
Scratch: a private subdirectory `<scratchpad>/T14/`.

## Context

Mission 7f, F6, the R11/B6 pattern: `tools/vectors/LayeredRoutingSweep.java`, `tools/oracle/routing-sweep.sh`, `test/corpus/routing-sweep.test.ts`, `test/helpers/layered-routing-sweep.ts` (read only). The caps revision allows sweep modes in the recorder. Hashes are exact: a last-ulp difference is a mismatch to diagnose, never to tolerate.

## Task

1. `LayeredPipelineVectors.java --sweep <modelsDir> <outDir>` / `--dump <case id> <modelsDir> <outDir>`: `level/<model>/<root|target>/<ROUTING>` for every edge-bearing level of every `realworld/ptolemy/**.json`, default options, `doLayout` semantics through `ElkLayered` on the imported level; and `model/<model>/<DIRECTION>` for every self-loop-free whole model through the recursive engine. Canonical form: 7e's sorted-key raw-IEEE-hex dump of positions, sizes, bend points, junction points, label geometry and graph size. Line format as 7e (`ok`, `refused` with the first refused member, `throws` with class, `timeout`), 20 s per case. The no-flag recording path stays byte-identical (re-record, `cmp`).
2. `tools/oracle/pipeline-sweep.sh [--force]`: 7e's shape, stamp = oracle build + recorder source + models commit + input hash, `PIPELINE_SWEEP_DIR` override, writes `test/corpus/.pipeline-sweep/results.jsonl`, same classpath and JVM flags as `layered-pipeline-vectors.sh`; `shellcheck -x` clean.
3. `test/corpus/pipeline-sweep.test.ts` + `test/helpers/layered-pipeline-sweep.ts`: replay each `ok` case through the real driver, hash, compare; count `refused`/`timeout`; `throws` must throw the same class; skip with a message when the models or sweep dir is absent; stride 2 default, `PIPELINE_SWEEP_STRIDE=1`. Time a 10-model subset first, then full; about 5 minutes at stride 2.
4. `.gitignore`: `test/corpus/.pipeline-sweep/`.
5. A mismatch is a port defect: `--dump` the case, produce the diagnosis artifact; never change the port, a helper or the canonical form to match. Report the refusal tally per category (F1 only, else stop 5).
6. **Cross-check (F6):** `tools/oracle/sweep.sh --filter layered` then `npx tsx tools/corpus/ts-layout-compare.ts --algorithms layered --out <scratch>/T14/compare.json`. Journal the `ok`, `mismatch`, `*-throw` and `nondeterministic` tallies. A `mismatch` that the flagged sweep does not reproduce is stop 17 (hash order). Not a gate, and nothing from it is committed.

## Write-set

`tools/vectors/LayeredPipelineVectors.java` (sweep and dump modes only), `tools/oracle/pipeline-sweep.sh`, `test/corpus/pipeline-sweep.test.ts`, `test/helpers/layered-pipeline-sweep.ts`, `.gitignore`.

## Read-set

`tools/vectors/LayeredRoutingSweep.java`, `tools/oracle/routing-sweep.sh`, `test/corpus/routing-sweep.test.ts`, `test/helpers/layered-routing-sweep.ts`, `tools/vectors/layered-pipeline-vectors.sh`, `test/helpers/layered-pipeline-replay-*.ts`, `tools/corpus/ts-layout-compare.ts:1-60,250-260`, `decisions.md` F1, F6.

## Interface contract

Line format documented in the recorder header; `PIPELINE_SWEEP_STRIDE`, `PIPELINE_SWEEP_DIR`.

## Acceptance criteria

- Given the full sweep at stride 1, when replayed, then every `ok` case hash-matches.
- Given a refusal, when tallied, then its category is in F1.
- Given the recorder's no-flag path, when re-recorded, then the ref is byte-identical.
- Given the cross-check, when run, then its tally is journaled and any unreproduced mismatch is a stop.

## Observability / Rollback

Sweep tallies and timings in the journal. Reversible.
