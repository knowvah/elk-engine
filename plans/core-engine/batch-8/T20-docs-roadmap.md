<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — Architecture doc, overview, component map, roadmap revision

**Agent:** typescript-pro (sonnet) · **Commit:** `docs(T20): document the core engine and record mission 5b`

## Context
Previous missions documented each port in `docs/architecture/<topic>.md` and appended a dated revision to
`plans/roadmap.md` (never editing earlier lines). M1: roadmap row 5 is split; 5a is done here, 5b (`core-remainder`)
is the next `/plan-mission` input.

## Task
1. `docs/architecture/core-engine.md` (new): what 5a ported, the engine flow (PlantUML sequence, as
   `plans/core-engine/diagrams/data-flow.md`), decisions M1–M9 in one line each, the codegen un-hold procedure, the
   golden sets and how to regenerate them (`regen-goldens.sh --set algorithms`), the corpus comparison runbook (link
   to the `docs/conformance.md` section `## Core layouts (fixed, box, random)`), deferrals (testEmptyAlgorithmId → 7a;
   5b list) and the dropped `elkjs-exclude` blocks.
2. `docs/architecture/overview.md`: add the document row; replace "no layout algorithm is ported yet" with the current
   state; add the engine to "Key flows" if not already accurate.
3. `docs/architecture/component-map.md` and `port-map.md`: mark the ported core classes.
4. `plans/roadmap.md`: append `## Revision 2026-10-2x (core-engine)` — 5a done (exit evidence: goldens, JUnit ports,
   T19 counts), the 5b row (scope from `plans/core-engine/decisions.md#m1--split`, ≈7.5k Java lines, ~13 tasks,
   depends on 5a, exit: listed tests ported and green), follow-ups (showcase entries for the algorithm goldens;
   `testEmptyAlgorithmId` in 7a).

## Write-set
`docs/architecture/{core-engine,overview,component-map,port-map}.md`, `plans/roadmap.md`.

## Read-set
`plans/core-engine/{README,decisions,decision-journal}.md`, `plans/core-engine/diagrams/*`,
`docs/architecture/{overview,grandom,component-map,port-map}.md`, `plans/roadmap.md` (last revision for format),
`docs/conformance.md` (T19 section heading only).

## Acceptance criteria
- `npm run docs:build` passes (link check included); `npm run format:check` clean.
- `plans/roadmap.md` has no edited earlier line (`git diff main -- plans/roadmap.md` shows only additions).
- `core-engine.md` diagrams are PlantUML; every claim cites a task id or decision id.

## Observability / Rollback
N/A — docs only. Reversible: revert the commit.

## Amendment (orchestrator, 2026-10-23 — follows M12/M16)
Add `docs/architecture/melk-codegen.md` to the write-set: record the final pending state (`PENDING_TYPES = []`, nothing
held back, retired scaffolding) and a "Lazy constants (M12, M16)" subsection; doc text proposed by the T8/T10/T12/T14
agents is in the decision journal. `core-engine.md` lists M1–M17 (amendments included).
