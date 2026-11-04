<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Hash sweep at the P4 and P5 stops over `$ELK_MODELS_DIR`

**Agent:** java-architect (sonnet) · **Commit:** `test(T12): add the layered routing sweep`

## Context

Mission 7e (README), R11, B6 as refined by 7b–7d's T10. One canonical-dump SHA-256 per case; the canonical form is
7d's (`tools/vectors/LayeredPlacementVectors.java:2481-2923`, `PlacementSweep`: `edges`/`changed` sorted by path,
`int`/`double` as raw IEEE-754 hex, enum `c` by last segment, sorted keys, `geometry` keys sorted recursively, no
whitespace) extended with R3's `graph`, `edges` and `splines`. The hash is exact: a last-ulp difference is a mismatch
to diagnose, never to tolerate. Patterns: `tools/oracle/placement-sweep.sh`, `test/corpus/placement-sweep.test.ts`,
`test/helpers/layered-placement-sweep.ts` (read only).

## Task

1. `LayeredRoutingVectors.java --sweep <modelsDir> <outDir>` / `--dump <case id> <modelsDir> <outDir>`: every
   `realworld/ptolemy/**.json` under `<modelsDir>`, every edge-bearing level (the recorder's `levels()` rule), the
   stops `P4/BRANDES_KOEPF` (default options; hyperedge levels now accepted), `P5/ORTHOGONAL`, `P5/POLYLINE` and
   `FINAL_SPLINE_BENDPOINTS_CALCULATOR/SPLINES` (default options of the stop, `SEPARATE_CONNECTED_COMPONENTS=false`),
   ids `<model>/<root|target>/<stop>/<ROUTING>`. Line format as 7d's (`ok` with `prefix` and `options`, `refused`
   with the first refused member, `throws` with the planned prefix and the class, `timeout`), 20 s per case,
   `CASE_STACK_BYTES` as 7d. The no-flag recording path stays byte-identical (re-record and `cmp` both refs).
2. `tools/oracle/routing-sweep.sh [--force]`: 7d's script shape, stamp = oracle build + recorder source + models
   commit + input hash, `ROUTING_SWEEP_DIR` override, writes `test/corpus/.routing-sweep/results.jsonl`, same
   classpath and JVM flags as `layered-routing-vectors.sh`; `shellcheck -x` clean.
3. `test/corpus/routing-sweep.test.ts` + `test/helpers/layered-routing-sweep.ts` (`routingHash(expected)`,
   `routingSweepRow(line, modelsDir)`): replay each `ok` case through the real factories from its `prefix`/`options`
   (T10's factories shape), hash, compare; count `refused`/`timeout`; `throws` must throw the same class; skip with
   a message when the models dir or the sweep dir is absent; stride 2 by default, `ROUTING_SWEEP_STRIDE=1` override.
   Time a 10-model subset first, then the full run; report both (under about 5 minutes at stride 2).
4. `.gitignore`: `test/corpus/.routing-sweep/`.
5. A mismatch is a port defect: `--dump` the case, diagnose the first departure (diagnosis artifact: mechanism,
   origin `file:line`, causal chain, ruled out), report; never change the port, a helper or the canonicalisation to
   match. Report the refusal tally per category (every category must be in R1's list, else stop 5).

## Write-set

`tools/vectors/LayeredRoutingVectors.java` (sweep/dump modes only), `tools/oracle/routing-sweep.sh`,
`test/corpus/routing-sweep.test.ts`, `test/helpers/layered-routing-sweep.ts`, `.gitignore`.

## Read-set

`tools/vectors/LayeredPlacementVectors.java:2481-2972` (sweep and dump modes, read only), `tools/oracle/placement-sweep.sh`,
`test/corpus/placement-sweep.test.ts`, `test/helpers/layered-placement-sweep.ts` (all read only),
`tools/vectors/layered-routing-vectors.sh`, `test/helpers/layered-routing-replay-*.ts` (T3),
`src/alg/layered/LayeredRoutingVectors.test.ts` (T10, the factories), `decisions.md` R1, R3, R11,
`plans/layered-node-placement/decision-journal.md` (T10 rows), `.agent-notes/layered-node-placement.md` (the sweep
observation).

## Architecture decisions

R3 (geometry in the canonical form, exact hash), R11 (four stops, stride 2), R1 (refusal categories).

## Interface contract (consumed by T15)

`results.jsonl` line format as 7d's with the 7e ids; `test/corpus/routing-sweep.test.ts` reports ok/refused/throws/
timeout counts and the replay time in its output.

## Acceptance criteria

- Given the sweep over the 550 models, when replayed at stride 2, then 0 mismatches, 0 throws, 0 timeouts, and every
  refusal names an R1 category (report the counts; the P4 count must exceed 7d's 1,970 ok cases since hyperedge
  levels are accepted now).
- Given a re-record after the recorder edit, when compared, then both refs byte-identical.
- Given `shellcheck -x`, typecheck, prettier and complexity, when run, then clean.

## Observability / Rollback

The sweep prints per-status counts and the elapsed time. Reversible.
