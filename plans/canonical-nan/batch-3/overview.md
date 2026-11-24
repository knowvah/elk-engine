<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3: regeneration, sweeps, fitness test, docs; close-out and squash

Sequential, both by the orchestrator.

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| [T4](T4-regen-sweeps-docs.md) | Rerun changed recorders and sweeps (D7); fitness test (D5); conformance entry (D6) | orchestrator | `test/architecture/canonical-nan.fitness.test.ts`, `docs/conformance.md`, NaN-only ref changes, the journal | T2, T3 | [x] |
| [T5](T5-close-out.md) | Queue gates 1-7, roadmap, agent notes, summary, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/canonical-nan.md`, the README, the journal | T4 | [x] |
