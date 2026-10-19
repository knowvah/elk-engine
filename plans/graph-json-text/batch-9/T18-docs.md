<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Docs, roadmap revision, mission summary

**Agent:** technical-writer · **Commit:** `docs(T18): document the elkj port, runbook and follow-ups`

## Context
4b precedent: `docs/architecture/elk-text.md` (design, the Xtext subset, evidence table, runbook, deferrals and
quirks), `docs/conformance.md` §7, the overview index row, `docs/translation-rules.md` additions, the roadmap revision
and the README mission summary (all appended where `plans/` is concerned).

## Task
1. `docs/architecture/elk-json-text.md`: what `.elkj` is (grammar facts, ELK-native files via `ConvertGraphHandler`),
   the port layout, D1's shared runtime, D11's eager-with-lazy-results linking and its evidence, the writer, the
   evidence table (vectors, curated refs, sweep with counts from T17), the runbook (`elkj-vectors.sh`,
   `regen-elkj-refs.sh`, `elkj-sweep.sh`, D12 seed, rebuild after the `0002` patch), deferrals and quirks.
2. `docs/conformance.md`: a section "ELK Textual JSON (`.elkj`)" with the T17 table and accepted divergences (syntax
   presence only). `docs/architecture/overview.md`: index row and the text-adapter paragraph. `docs/translation-
   rules.md`: the lazy-linking equivalence rule (D11) and any new translation rows the mission added.
3. `plans/roadmap.md`: append "Revision 2026-10-xx (graph-json-text)" restating the 4c exit (D2 = A′) and its
   results. `plans/graph-json-text/README.md`: append the mission summary (counts, open flags, follow-ups).
4. `.agent-notes/graph-json-text.md`: the mission's observations (template from the rules).

## Write-set
The seven files in the batch table.

## Read-set
`docs/architecture/elk-text.md`, `docs/conformance.md` §7, the journal, T17's counts.

## Acceptance criteria
- Given `npm run docs:build`, when run, then it is green with no dead link.
- Given `plans/`, when diffed, then only appends (no line rewritten).
- Given the conformance table, when compared with T17's journal row, then the counts are identical.

## Observability / Rollback
N/A — docs only. Reversible: revert the commit.
