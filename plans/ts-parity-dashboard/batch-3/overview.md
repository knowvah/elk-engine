<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: triage of every finding

T5 diagnoses every reported case from `ts-run-1.json`. T6 applies the fixes T5's artifacts allow, then reruns the affected
algorithms. With many findings the orchestrator may fan T5 out into one agent per algorithm family (push-forward). In that case
each agent reports its annotations, and the orchestrator alone writes `tools/corpus/ts-findings.json` and files the issues.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T5](T5-triage.md) | A diagnosis artifact per finding; annotations; issues filed (TP5, TP6) | debugger (opus), one per family if needed | `tools/corpus/ts-findings.json` (orchestrator), scratch | T4 | [x] |
| [T6](T6-fixes.md) | Tooling and local `src/` fixes from T5 (stop 15); rerun the affected algorithms; the final TS summary | typescript-pro (sonnet) | per finding: `tools/corpus/*`, `test/helpers/*`, or one `src/` module plus its test | T5 | [x] |

If T5 finds 0 reported cases (or only annotated #79 cases), T6 just records the final summary: copy `ts-run-1.json` to
`$TMPDIR/ts-parity-dashboard/ts-final.json` and journal it.
