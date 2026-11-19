<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: sweeps, ported suites, #79 classification

One orchestrator task, after T4-T6 land (the TS sweep compares the ported code). The `elkj` sweep starts only after T2's
recorder exits (D8).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T7](T7-sweeps-and-suites.md) | Runbook §§ 9-10: twelve sweeps, TS sweep, parity report, JUnit counts (plus the five new or changed upstream classes), `PIPELINE_SUITES_FULL`; triage; #79 retirement (D5.4) | orchestrator | `docs/parity-report.md`, `tools/corpus/ts-findings.json`, `tools/corpus/parity-report.ts` (spore entries), `test/corpus/parity-report.test.ts` (D5.4 strings only); spore fixes under stop 7 inside T5's write-set | T2, T4, T5, T6 | [x] |
