<!-- SPDX-License-Identifier: EPL-2.0 -->

# T10 — Hash sweep at the P4 stop over `$ELK_MODELS_DIR`

**Agent:** java-architect (sonnet) · **Commit:** `test(T10): add the layered placement sweep`

## Context

Mission 7d (README), N10, B6 as refined by 7b's and 7c's T10. One canonical-dump SHA-256 per case; the canonical form
is 7c's (`edges`/`changed` sorted by path, `int`/`double` as raw IEEE-754 hex, enum `c` by last segment, empty `set`
with `c` null, `ports` keys sorted, sorted keys, no whitespace; `tools/vectors/LayeredOrderVectors.java:2495-2517`)
extended with `geometry` (keys sorted recursively; its hex doubles are already canonical). The hash is exact (N3):
a last-ulp difference is a mismatch to diagnose, never to tolerate. Patterns: `tools/vectors/LayeredOrderVectors.java`
(`OrderSweep`, `:2518-`), `tools/oracle/order-sweep.sh`, `test/corpus/order-sweep.test.ts`,
`test/helpers/layered-order-sweep.ts`.

## Task

1. `LayeredPlacementVectors.java --sweep <modelsDir> <outDir>` / `--dump <case id> <modelsDir> <outDir>`: every
   `realworld/ptolemy/**.json` under `<modelsDir>`, every edge-bearing level (the recorder's `levels()` rule), the
   P4 stop per `NodePlacementStrategy` (`SIMPLE`, `INTERACTIVE`, `LINEAR_SEGMENTS`, `BRANDES_KOEPF`,
   `NETWORK_SIMPLEX`; default options of the stop, `SEPARATE_CONNECTED_COMPONENTS=false`), ids
   `<model>/<root|target>/P4/<STRATEGY>`; INTERACTIVE cases run on the on-disk positions (the 7b convention: the
   seeded configurator belongs to the committed rows). Line format as 7c's (`ok` with `prefix` and `options`,
   `refused` with the first refused member, `throws` with the planned prefix and the class, `timeout`), 20 s per
   case, `CASE_STACK_BYTES` as 7c. The no-flag recording path stays byte-identical (re-record and `cmp`).
2. `tools/oracle/placement-sweep.sh [--force]`: 7c's script shape (`tools/oracle/order-sweep.sh`), stamp = oracle
   build + recorder source + models commit + input hash, `PLACEMENT_SWEEP_DIR` override, writes
   `test/corpus/.placement-sweep/results.jsonl`, same classpath and JVM flags as `layered-placement-vectors.sh`;
   `shellcheck -x` clean.
3. `test/corpus/placement-sweep.test.ts` + `test/helpers/layered-placement-sweep.ts` (`placementHash(expected)`,
   `placementSweepRow(line, modelsDir)`): replay each `ok` case through the real factories from its
   `prefix`/`options`, hash, compare; count `refused`/`timeout`; `throws` must throw the same class; skip with a
   message when the models dir or the sweep dir is absent; stride 2 by default, `PLACEMENT_SWEEP_STRIDE=1`
   override. Time a 10-model subset first, then the full run; report both (under about 5 minutes at stride 2).
4. `.gitignore`: `test/corpus/.placement-sweep/`.
5. A mismatch is a port defect: `--dump` the case, diagnose the first departure (diagnosis artifact: mechanism,
   origin `file:line`, causal chain, ruled out), report; never change the port, a helper or the canonicalisation to
   match.

## Write-set

`tools/vectors/LayeredPlacementVectors.java` (sweep/dump modes only), `tools/oracle/placement-sweep.sh`,
`test/corpus/placement-sweep.test.ts`, `test/helpers/layered-placement-sweep.ts`, `.gitignore`.

## Read-set

`tools/vectors/LayeredOrderVectors.java:2495-2995` (sweep and dump modes), `tools/oracle/order-sweep.sh`,
`test/corpus/order-sweep.test.ts`, `test/helpers/layered-order-sweep.ts` (all read only),
`tools/vectors/layered-placement-vectors.sh`, `test/helpers/layered-placement-replay-*.ts` (T3),
`src/alg/layered/LayeredPlacementVectors.test.ts` (T8, the factories), `decisions.md` N3, N10,
`plans/layered-crossing-min/decision-journal.md` (T10 rows), `.agent-notes/layered-crossing-min.md` ("the order
sweep is far cheaper than the 7b sweeps").

## Architecture decisions relevant

N3 (geometry in the canonical form, exact hash), N10 (five strategies, on-disk positions, stride 2), N1 (refusal
categories: a `refused` line names a member of a later mission; a member outside every category is stop 5).

## Interface contract (consumed by T13)

`results.jsonl` line counts per status, the stride-2 and stride-1 timings, the refused members by count.

## Acceptance criteria

- Given `ELK_MODELS_DIR`, when the sweep runs twice, then the second is skipped as fresh and `results.jsonl` is
  unchanged.
- Given `results.jsonl`, when the TS test runs at stride 2, then every `ok` case's hash matches, under about
  5 minutes; `throws` cases throw the same class.
- Given no models dir, when the test runs, then it skips with a message and `npm test` time is unchanged.
- Given `layered-placement-vectors.sh`, when rerun after the recorder edit, then `layered-placement.json` is
  byte-identical (the cache line reads "recorded", the file does not change).

## Observability / Rollback

The sweep prints per-status counts and timings on stderr. Reversible.
