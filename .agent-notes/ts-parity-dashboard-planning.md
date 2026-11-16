<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations: ts-parity-dashboard (roadmap row 9, 2026-11-13)

## Observation: the default oracle sweep cache is a filtered partial

- **Context**: Reading `$ELK_ORACLE_DIR/sweep/8aaa…-ac5a…/` to plan the TS sweep.
- **Finding**: `results.jsonl` (2026-11-05) holds 10,881 rows: 286 for each non-layered algorithm and 7,163 for layered. A
  filtered `sweep.sh` run without `--out` overwrote the full 18,023-case sweep that `docs/parity-report.md` was generated from.
  `parity-report.ts` reads only this default directory.
- **Impact**: Run filtered oracle sweeps with `--out <scratch>`; regenerate the report only from a full sweep.
- **Confidence**: High

## Observation: the TS comparison is fast; the bound matters, not the speed

- **Context**: Planning probe of `ts-layout-compare.ts` over the whole stale cache.
- **Finding**: 10,881 cases in 2 min 3 s sequentially (layered: 7,163 cases, 91 s of layout); 880 layered `tickets/` cases in
  1.5 s.
- **Impact**: Shard to bound hangs (#73) and cubic spore inputs, not to save time. A full TS sweep takes minutes.
- **Confidence**: High

## Observation: landed tests pin the old defaults

- **Context**: Reading `test/corpus/ts-layout-compare.test.ts` and `parity-report.test.ts` before changing the tools.
- **Finding**: Three landed tests pin today's behaviour:
  - `parseArgs([])` is compared with `toEqual` against a four-key object;
  - `runComparison` and `execute` are called synchronously;
  - `renderReport` with four arguments must print `n/a (no TS port yet)`.
- **Impact**: New flags must be optional keys, the sharded path must be a new async entry, and the TS sections appear only
  with a fifth argument (AD-13).
- **Confidence**: High
