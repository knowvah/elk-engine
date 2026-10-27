<!-- SPDX-License-Identifier: EPL-2.0 -->

# T4 — Docs, journal closure, roadmap

**Agent:** main session · **Commit:** `docs(T4): record the nodespacing site vectors and close the 6b flags`

## Task

1. `docs/conformance.md#alg-common-nodespacing`: add an "AD-13 re-derivation (mission 6c)" paragraph with the
   `nodespacing-sites.json` row count per site, the D4 outcomes per flag (restored cases, confirmed values), and any
   divergence found (none expected; if one was fixed, name the mechanism and the commit's task id).
2. `docs/architecture/alg-common.md` §7.5–7.6: the site recorder in the evidence list and the runbook
   (`tools/vectors/nodespacing-site-vectors.sh`, no model directory needed).
3. `plans/alg-common-nodespacing/decision-journal.md`: append one dated `resolved` row per `flag` row (T2, T3, T4, T5,
   T6), citing the oracle row ids and the mission-6c task that re-anchored it. Never edit the original rows.
4. `plans/roadmap.md`: append "Revision 2026-MM-DD (ad13-rederivation)": row 6b evidence strengthened, the recorder,
   follow-ups (the four hand-derivation rules now pinned by rows).
5. `.agent-notes/ad13-rederivation.md`: observations in the memory-rule template (or say in the journal there are none).
6. README: "Mission summary" (tasks, exit evidence, decisions, gates, follow-ups), as in 6b.
7. `npm run docs:build`, `npx vitest run test/architecture`, then the README mission-end gates including
   `regen-goldens.sh` (both sets) byte-identical.

## Write-set

`docs/conformance.md`, `docs/architecture/alg-common.md`, `plans/alg-common-nodespacing/decision-journal.md`
(append), `plans/roadmap.md` (append), `.agent-notes/ad13-rederivation.md`, `plans/ad13-rederivation/README.md`
(summary and batch status only).

## Read-set

`decision-journal.md` (all rows), `decisions.md`, the T2 header comment, `plans/alg-common-nodespacing/README.md`
"Mission summary" (format). `docs/architecture/overview.md` and `component-map.md` are included by line range in the
docs site: do not change their line counts if touched (prefer not touching them).

## Acceptance criteria

- Given `npm run docs:build`, when it runs, then it exits 0.
- Given `plans/roadmap.md` and the 6b journal, when diffed against `main`, then only appended lines appear.
- Given `docs/conformance.md`, when read, then the per-site counts match `rowCounts` in `nodespacing-sites.json`.
- Given the 6b journal, when read, then every `flag` row has a `resolved` row.

## Observability / Rollback

N/A — docs only. Reversible: revert the commit.
