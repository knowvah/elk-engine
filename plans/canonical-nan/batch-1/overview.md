<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: audit and unchanged-recorder baseline

One task, run by the orchestrator. Its audit table is the input of both batch 2 tasks.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T1](T1-audit-and-baseline.md) | Classify every layout bit-encoding site; rerun every layout recorder unchanged and diff its refs; record the sweep baseline | orchestrator | the journal, `$TMPDIR/canonical-nan/` | — | [x] |

Exit: the audit table and the baseline rows are in the journal and committed; batch 1 is `[x]` in the README.
