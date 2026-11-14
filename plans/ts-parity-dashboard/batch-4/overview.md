<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4: report regeneration, docs, roadmap, notes, squash

T7 regenerates the report and writes the docs. T8 closes the mission and squashes. They run in that order.

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| [T7](T7-report-and-docs.md) | Regenerate `docs/parity-report.md`; `docs/conformance.md` TS-sweep section; `docs/architecture/parity-dashboard.md` runbook and overview row | technical-writer (sonnet) plus the orchestrator for the generator run | `docs/parity-report.md`, `docs/conformance.md`, `docs/architecture/{parity-dashboard,overview}.md` | T2, T3, T6 | [x] |
| [T8](T8-close-out.md) | Mission-end gates, roadmap revision, agent notes, README summary, issue comments, squash | orchestrator | `plans/roadmap.md`, `plans/ts-parity-dashboard/{README,decision-journal}.md`, `.agent-notes/ts-parity-dashboard.md` | T7 | [x] |
