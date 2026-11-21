<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2: docs; close-out and squash

Runs after every batch-1 task is done (or partial under a stop condition).

| ID | Description | Agent | Writes | Depends On | Done |
| -- | ----------- | ----- | ------ | ---------- | ---- |
| T5 | Docs: row counts and the four closures | documentation-engineer (sonnet) or orchestrator | `docs/conformance.md`, `docs/architecture/alg-layered-placement.md`, `alg-layered-routing.md`, `alg-layered-pipeline.md` | T1-T4 | [x] |
| T6 | Gates, roadmap revision, notes, squash | orchestrator | `plans/roadmap.md`, `.agent-notes/layered-evidence-gaps.md`, README, journal | T5 | [x] |
