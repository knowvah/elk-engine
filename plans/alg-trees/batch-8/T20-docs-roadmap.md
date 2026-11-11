<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — Docs, roadmap revision, notes, mission summary

**Agent:** documentation-engineer (sonnet) · **Commit:** `docs(T20): document the tree algorithms and append the roadmap revision`

## Context

Mission 8a. Earlier missions each added an architecture page (`docs/architecture/alg-layered-compound.md` is the latest), a
`docs/conformance.md` section with counts and kept quirks, a line in `docs/architecture/overview.md`, and a `## Revision` in
`plans/roadmap.md` (never edit an earlier line).

## Task

1. `docs/architecture/alg-trees.md`: the three bundles' structure (link `plans/alg-trees/diagrams/*`), the evidence (row counts per
   group from the journal, goldens, sweep numbers, JUnit), the hashed-container table of TR3 with the I30 twin result, the recursion
   probe, the runbook (re-record, regenerate, re-sweep). Link it from `overview.md` (replace "No other layout algorithm runs yet …"
   by appending a sentence; do not rewrite earlier sentences) and from `conformance.md`.
2. `docs/conformance.md`: a section for the three algorithms with counts, the kept upstream quirks of TR9 and any found during the
   run, known divergences (none unless a `needs-ruling` names one), and the `NodeMicroLayoutTest` row updated to "needs force, stress,
   rectpacking: 8x".
3. `plans/roadmap.md`: append `## Revision <date> (alg-trees)` in the earlier revisions' shape: row 8a done, evidence, decisions taken
   during the run, divergences fixed at origin, hand-offs (TR9: 8b, 8c, 8x, row 9's registration of the rest), flags for the
   maintainer (open `needs-ruling` and `follow-up` issues).
4. `.agent-notes/alg-trees.md`: novel observations only (memory rule template).
5. `plans/alg-trees/README.md`: tick batch boxes, write the "Mission summary" (exit evidence item by item, decisions, divergences,
   gates; leave placeholders for the orchestrator's mission-end gate results).

## Write-set

`docs/architecture/alg-trees.md`, `docs/architecture/overview.md`, `docs/conformance.md`, `plans/roadmap.md` (append only),
`.agent-notes/alg-trees.md`, `plans/alg-trees/README.md`.

## Read-set

`plans/alg-trees/decision-journal.md`, `plans/alg-trees/unreached.md`, `docs/architecture/alg-layered-compound.md` (shape),
`plans/roadmap.md` § Revision 2026-11-10 (layered-compound) (shape), `docs/conformance.md`.

## Acceptance criteria

- Given `npm run docs:build` and `npm run format:check`, then both pass.
- Given `git diff <base> -- plans/roadmap.md`, then only appended lines.
- Given the README summary, then each exit item cites its evidence (journal row, file, count).

## Observability / Rollback

N/A — no new observable operations. Reversible.
