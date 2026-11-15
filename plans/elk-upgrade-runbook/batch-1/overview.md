<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1: runbook draft and inventory fitness test

Writes the runbook before the rehearsal, so the rehearsal tests the document rather than writing it after the fact.
Commands the rehearsal proves wrong are corrected in T5 and journaled.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T1 | [Runbook draft and UP5 fitness test](T1-runbook.md) | orchestrator (runbook text may go to `documentation-engineer`, sonnet) | `docs/architecture/elk-upgrade.md`, `test/docs/elk-upgrade-runbook.test.ts`, `tools/oracle/README.md` | — | [x] |
