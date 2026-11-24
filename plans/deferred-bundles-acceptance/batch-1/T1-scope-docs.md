<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1: the ruling in the ADR, AD-17, CLAUDE.md, inventory and port-map

**Owner:** orchestrator. **Budget:** 45 min.

## Context

The maintainer accepted the deferred-bundles ADR amended on 2026-11-14 (quoted in [decisions.md](../decisions.md)). Every place
that states bundle scope still says the three bundles are "Deferred" with a decision "proposed". This task makes them say the
ruling.

## Write-set

- `docs/architecture/deferred-bundles-adr.md` ([D1](../decisions.md#d1-the-adr-keeps-its-analysis-and-gains-a-ruling))
- `plans/elk-engine-skeleton/decisions.md`: append `## AD-17` only ([D2](../decisions.md#d2-ad-17-records-the-ruling-verbatim-in-substance))
- `CLAUDE.md`, `docs/architecture/inventory.md`, `docs/architecture/port-map.md` ([D4](../decisions.md#d4-claudemd-inventory-and-port-map))
- `plans/deferred-bundles-adr/decision-journal.md`: one appended row, "accepted amended under #88; see
  `plans/deferred-bundles-acceptance/`"
- this mission's journal

## Read-set

- `gh issue view 88 --comments`, `gh issue view 95`
- `docs/architecture/deferred-bundles-adr.md` (whole, 120 lines)
- `plans/elk-engine-skeleton/decisions.md:170-180` (Bundle scope), `:244-end` (the AD-4 amendment, the shape to follow)
- `CLAUDE.md:15`, `:42-63`, `:141-185`
- `docs/architecture/inventory.md:14-56`, `docs/architecture/port-map.md:610-635`
- `test/architecture/module-boundaries.fitness.test.ts:317-370` for the ADR's refreshed line numbers (take them after T2 if T2
  runs first)

## Steps

1. Edit the ADR per D1. Check: `git -C ../elk log --oneline 8aaa3c14..8bca22f4 -- plugins/org.eclipse.elk.alg.libavoid
   plugins/org.eclipse.elk.alg.graphviz.dot plugins/org.eclipse.elk.alg.graphviz.layouter` is empty, and say so in the ADR.
2. Append AD-17 per D2's five points.
3. Edit CLAUDE.md, inventory and port-map per D4. Recount the inventory classes from the table rows.
4. Append the closing row to the ADR mission's journal.
5. `npx prettier --write` then `--check` on the changed files; `npm run docs:build`. Commit
   `docs(adr): accept the deferred-bundles adr as amended`.

## Acceptance criteria

- Given the ADR, when read, then its status line says Accepted, amended, and a `## Ruling` section names libavoid out of scope
  and both Graphviz bundles in scope via #95, with the end-to-end AD-4 exception; `## Decision` is unchanged apart from a note.
- Given `plans/elk-engine-skeleton/decisions.md`, when diffed against the base, then only appended lines appear and they hold
  AD-17's five points.
- Given CLAUDE.md, when `grep -n 'graphviz\|libavoid' CLAUDE.md` runs, then the Graphviz bundles sit under "In scope",
  `alg.libavoid` under "Out of scope", and "Deferred" names only the three `.ide` bundles.
- Given inventory.md, when its Scope column is tallied, then it equals the counts line (18 / 3 / 2 / 9 = 32).
- Given `npm run docs:build`, then it exits 0.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: doc and plan text only; revert the commit.
