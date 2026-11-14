<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2: the deferred-bundles ADR (Proposed)

## Context

T1's `plans/deferred-bundles-adr/evidence.md` holds the evidence. This task turns it into a one-page ADR with a go/no-go per
bundle. Read [decisions.md](../decisions.md) DB1-DB6 and [stop-conditions.md](../stop-conditions.md) 4 and 5.

## Task

1. Create `docs/architecture/deferred-bundles-adr.md` (SPDX `<!-- -->` header):
   - `# ADR: deferred bundles (alg.libavoid, alg.graphviz.dot, alg.graphviz.layouter)`
   - **Status:** `Proposed (2026-11-13). Acceptance: #<N>` (T3 files #<N>; write a placeholder `#TBD` and T3 fills it in).
   - **Context:** roadmap row 11, CLAUDE.md "Deferred", the constraints (AD-1, AD-3, AD-14, zero runtime dependencies,
     browser-safe `src/`), the pin.
   - **Decision:** a table `| Bundle | Recommendation (go / no-go) | Option chosen (skip / port / delegate) | Deciding evidence |`
     with one row per bundle, then one short paragraph per bundle. Every recommendation cites `evidence.md` rows. A
     recommendation that needs a locked rule amended names the rule (stop 5). An undecidable bundle says "no recommendation"
     (stop 4).
   - **Consequences:** what changes on acceptance (CLAUDE.md "Deferred" list → out of scope or adopted; an AD-17 row; for a
     "go": the DB3 follow-up steps and a roadmap row), what stays enforced now (DB4's three tests), and the revisit trigger
     (e.g. a pin move that changes a bundle, a consumer request, or dot-engine API changes).
   - A compact evidence summary table (one row per DB5 row, three bundle columns) and a link to `evidence.md`.
   - Keep it to about one page plus the two tables.
2. `docs/architecture/inventory.md` rows 38-40: append to each notes cell "decision proposed:
   [ADR](deferred-bundles-adr.md)"; keep `Deferred`. Keep the table aligned (`npx prettier --write`).
3. `docs/architecture/port-map.md` near line 625: one sentence linking the ADR for the three deferred algorithm bundles.

## Write-set

`docs/architecture/deferred-bundles-adr.md` (create), `docs/architecture/inventory.md`, `docs/architecture/port-map.md`.

## Read-set

`plans/deferred-bundles-adr/evidence.md`, `decisions.md` DB1-DB6, CLAUDE.md § Boundaries and § ELK Source Map,
`plans/elk-engine-skeleton/decisions.md` AD-1, AD-3, AD-14 (lines 28-56, 138-144), `docs/architecture/inventory.md:30-45`,
`docs/architecture/port-map.md:615-630`, `docs-site/.vitepress/config.ts:57-120` (link rewriting).

## Acceptance criteria

- Given the ADR, when read, then it has Status Proposed and exactly one recommendation row per bundle, each citing evidence.
- Given the inventory and port map, when rendered by `npm run docs:build`, then the build passes and the ADR links resolve
  (rewritten to GitHub blob URLs for included pages).
- Given `git diff --stat`, then only the three write-set files changed in this task; nothing under `src/`, `test/`, `tools/`.
- Given `npm run format:check`, then it is clean.

## Observability / rollback

N/A — no new observable operations. Reversible (docs only).
