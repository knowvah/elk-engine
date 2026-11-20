<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: full suite with assertions on; close-out

Two orchestrator tasks, in order.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T7](T7-suite-and-triage.md) | Full suite on and off; triage every firing assertion (D7) | orchestrator | the site's file for a port-defect fix (D7); `plans/dev-assert/inventory.md` | T3-T6 | [x] |
| [T8](T8-close-out.md) | Docs, issues, roadmap, agent notes, gates 1-7, squash | orchestrator | `docs/translation-rules.md` (counts), `plans/roadmap.md`, `plans/dev-assert/*`, `.agent-notes/dev-assert.md`, `tools/codeql/accepted.json` (only if a finding is accepted) | T7 | [x] |
