<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: sharded comparison, report TS sections, `Math.*` list

The three tasks have no dependencies on each other and their write-sets are disjoint, so they run in parallel. T2 codes
against T1's [interface contract](T1-sharded-compare.md#interface-contract) and its test fixtures; it does not need T1's code.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T1](T1-sharded-compare.md) | Split `ts-layout-compare.ts`; forked shards with a per-case limit; `ts-aborted`; all-algorithm default; `cases` in `--out` | typescript-pro (sonnet) | `tools/corpus/ts-layout-*.ts`, `test/corpus/ts-layout-*.test.ts` (new) | — | [x] |
| [T2](T2-report-ts-sections.md) | `parity-report.ts --ts-summary`: TS column, TS table, findings, header line; `ts-findings.json` | typescript-pro (sonnet) | `tools/corpus/parity-report*.ts`, `tools/corpus/ts-findings.json`, `test/corpus/parity-report*.test.ts` | — | [x] |
| [T3](T3-math-call-sites.md) | Fitness test and JSON of the transcendental `Math.*` sites; `docs/conformance.md` section | typescript-pro (sonnet) | `test/architecture/math-call-sites.{fitness.test.ts,json}`, `docs/conformance.md` (new section only) | — | [x] |

Batch gate: [README § Quality gates](../README.md#quality-gates). Commit one commit per task (T1, T2, T3).
