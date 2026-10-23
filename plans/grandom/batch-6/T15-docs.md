<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Docs, runbook, roadmap revision

**Agent:** documentation-engineer · **Commit:** `docs(T15): document the grandom port and its runbook`

## Context
Precedents: `docs/architecture/elk-text.md` and `elk-json-text.md` (file map, evidence, runbook sections). Phase 4's
failure modes and runbook ([decisions.md](../decisions.md#operational-readiness-phase-4)) belong in the new doc.
`docs/translation-rules.md` §3 still says `Collections.shuffle` has 0 in-scope uses and `nextGaussian` 0 sites; both
change with this mission (D7, `RandVal`). `port-map.md:578` maps grandom to roadmap 4d; the brief is labelled 4f.

## Task
1. `docs/architecture/grandom.md`: scope (ported / not ported: empty `ScopeProvider`, `RuntimeModule`,
   `StandaloneSetup`, `src-gen` serializer, `.ide`, `.ui`), file map (Java → TS), D1–D8 in brief, evidence (row counts
   per vector file, exact / presence / invariant split, 9/9 corpus), the unseeded paths and what is masked, and a
   **runbook**: regenerating vectors (`tools/vectors/elkr-vectors.sh`, `ELK_VECTORS_CACHE=off`), the three failure
   modes with how to localise each (first diverging row or corpus byte; dump both draw sequences; missing `fround`;
   lexer rows), and why `vector-cache.sh` must not be edited casually.
2. `docs/architecture/overview.md`, `port-map.md`, `inventory.md`: grandom rows/sections now "ported", links to
   `grandom.md`; port-map notes that `src/core/debug/grandom` is an Xtext client bundle and that the brief label is
   4f (roadmap row 4d).
3. `docs/conformance.md`: the grandom evidence and exit (D1); any upstream typo corrected (or "none").
4. `docs/translation-rules.md` §3 (and the hazards line near §9): `Collections.shuffle(list)` now has one in-scope
   caller (`RandomGraphGenerator.sample`, unseeded); `nextGaussian` is used by `RandVal`; `new Random()` sites in
   grandom are unseeded by contract.
5. `plans/roadmap.md`: append a revision (2026-10-xx) for row 4d: done as mission 4f, exit met, follow-ups. Append
   only; never rewrite earlier text.
6. `.agent-notes/grandom.md`: observations journaled during the mission (factual entries per the template).

## Write-set
`docs/architecture/{grandom,overview,port-map,inventory}.md`, `docs/conformance.md`, `docs/translation-rules.md`,
`plans/roadmap.md`, `.agent-notes/grandom.md`.

## Read-set
`docs/architecture/{elk-text,elk-json-text}.md` (structure), `plans/grandom/{README,decisions,decision-journal}.md`,
the replay test files (row counts), `docs/translation-rules.md` §3 and §9, `plans/roadmap.md` (revision format).

## Interface contracts (outputs)
None (terminal task).

## Acceptance criteria
- Given `npm run docs:build`, when run, then exit 0 with no dead links.
- Given `grandom.md`, when read, then it states the row counts that the replay tests assert and the 9/9 corpus result.
- Given `docs/translation-rules.md` §3, when read, then no sentence claims `Collections.shuffle` or `nextGaussian`
  has no in-scope use.
- Given `git diff plans/roadmap.md`, when read, then it only appends.

## Observability / Rollback
N/A — no new observable operations. Reversible: revert the commit.
