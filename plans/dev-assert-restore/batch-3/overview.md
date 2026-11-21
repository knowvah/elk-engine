<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: suite in both modes, sweeps; close-out

Sequential, orchestrator. T6 may add `withEndLabelRule` wraps to sweep helpers; T7 lands the mission.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T6](T6-suite-and-sweeps.md) | Full suite with assertions on and off; ten sweeps at stride 1, assertions on | orchestrator | `test/helpers/*-sweep.ts` (only for a #32 case), site files (only for a stop-4 revert) | T3, T4, T5 | [x] |
| [T7](T7-close-out.md) | Docs, inventory section, gates 1-7, roadmap, notes, squash, issue comments | orchestrator | `docs/translation-rules.md`, `docs/conformance.md`, `docs/architecture/alg-layered.md`, `plans/dev-assert/inventory.md` (append), `plans/dev-assert-restore/*`, `plans/roadmap.md` (append), `.agent-notes/dev-assert-restore.md` | T6 | [x] |
