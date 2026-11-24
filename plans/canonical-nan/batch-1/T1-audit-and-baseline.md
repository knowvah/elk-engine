<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: audit and unchanged-recorder baseline

**Agent:** orchestrator. **Budget:** 60 min (stop 11).

## Context

Planning found the sites below with `grep -n -E 'doubleTo(Raw)?LongBits|setFloat64|padStart\((16|HEX_DIGITS)'`. It is a
starting list, not the audit: T1 confirms each line, reads each encoder's callers, and adds any site the list misses
(decode-and-compare helpers that use `===` on doubles, other `hex` helpers in `test/helpers/*.test.ts`).

JVM (`tools/vectors/`), classes from planning:

| Site | Class at planning |
| ---- | ----------------- |
| `hex` in AlgCommonVectors:197, DiscoVectors:1841, LayeredFrameworkVectors:1191, LayeredLabelsVectors:510, LayeredOrderVectors:378, LayeredPhaseVectors:272, LayeredPipelineVectors:464, LayeredPlacementVectors:370, LayeredRoutingVectors:386, LayeredSiteVectors:378, MrTreeVectors:326, NodeMicroLayoutVectors:895, NodespacingSiteVectors:950, RadialVectors:217, RectPackingVectors:1780, SporeLayoutVectors:1997, TopdownPackingVectors:993, VertiFlexVectors:1521, LayeredLoopsVectors/LayeredLoopsVectorsEncoding:130, LayeredCompoundVectors:517 | `guarded` |
| `LayeredPipelineVectors.hx` :3416 (pipeline sweep, also the labels/loops/compound TS reuse) | `raw` |
| `LayeredPhaseVectors` inner `bitsOf` :2441 (C4 `double` in the phase sweep) | `by-construction` if every value comes from `parseDoubleArg`, else `raw` |
| C4 `double` encoders LayeredOrderVectors:2716, LayeredPlacementVectors:2702, LayeredRoutingSweep:228 | as `bitsOf` |
| `MrTreeUnitVectors.hex` :125 | `raw` (its 72 NaN in `mrtree-units.json` are `7ff8…` today) |
| `RectPackingVectors.positions` :718-724, `SporeLayoutVectors` :973-974 | `raw` (oracle-against-oracle comparisons) |
| `ForceVectors.hex` :1784, `SporeLayoutVectors.bits` :429, `LayeredCompoundVectors.rawHex` :3512, `LayeredLoopsVectorsSweep.rawHex` :232 | `canonical` |
| `JavaVectors.java`, `CoreJdkVectors.java` | out of scope (D1) |

TS:

| Site | Class at planning |
| ---- | ----------------- |
| `test/helpers/layered-phase-sweep.ts:85` (phase, order, placement, routing sweeps) | `raw` |
| `test/helpers/layered-pipeline-sweep.ts:56` (pipeline, labels; loops and compound wrap it) | `raw` |
| `test/helpers/layered-framework-replay.ts:163`, `mrtree-replay-rows.ts:181`, `mrtree-unit-vectors.ts:137`, `radial-replay-dump.ts:62`, `vertiflex-replay-rows.ts:45`, `force-replay-stops.ts:67` (`hexOfLong`: check its inputs) | `raw` |
| `test/helpers/spore-tree-fixtures.ts:104` | input builder or `raw`: check |
| `src/alg/common/overlaps/OverlapsVectors.test.ts:26`, `src/alg/common/spore/SporeVectors.test.ts:49` | `raw` |
| `test/helpers/layered-compound-replay-mutation.test.ts`, `layered-loops-replay-rows.test.ts` (local hex) | check |
| `test/helpers/force-replay-rows.ts:25-29`, `layered-loops-sweep.ts:27-51` | `canonical` |

## Task

1. Mission start steps 1-4 of the README, if not done. Note `uptime`.
2. **Audit.** Confirm or correct each row, add missed sites, and write the final table into the journal as one `audit`
   row per side: site `file:line`, class, consumer (ref file or sweep), action (`move`, `keep`, `allowlist: <reason>`).
   List the `docs/conformance.md` sentences that call a layout encoding raw without the NaN exception (for D6).
3. **Recorder baseline (D7 step 1).** For each layout recorder script (`tools/vectors/<name>-vectors.sh` for the recorders
   in the JVM table, including force), run it unchanged under `nice -n 10` into `$TMPDIR/canonical-nan/before/<name>/` and
   `diff` each output file against its ref in `test/golden/refs/java/`. Journal one `baseline` row per recorder: exit code,
   seconds, files, identical or not. A difference is stop 1.
4. **Sweep baseline.** Copy each `test/corpus/.<sweep>-sweep/results.jsonl` to `$TMPDIR/canonical-nan/sweeps-before/`
   and journal the line count and the status counts per sweep. If a sweep dir is missing, run its
   `tools/oracle/<sweep>-sweep.sh` first and journal it.
5. Commit the journal (`docs(plans): journal the canonical-nan audit`), mark batch 1 `[x]`.

## Write-set

`plans/canonical-nan/decision-journal.md`, the README batch table, `$TMPDIR/canonical-nan/` (never committed).

## Acceptance criteria

- Given the planning list, when T1 finishes, then every row has a confirmed class and action, and any added site names its
  `file:line`.
- Given every layout recorder, when run unchanged, then each output file is byte-identical to its ref, or stop 1 is filed.
- Given the eight local sweeps, when the baseline is recorded, then each has a saved `results.jsonl` and status counts.

**Observability:** N/A — no new observable operations. **Rollback:** Reversible (journal only).
