<!-- SPDX-License-Identifier: EPL-2.0 -->

# T12 — Docs, roadmap, summary

**Agent:** main session · **Commit:** `docs(T12): document the layered framework and its staged classes`

## Context

Mission 7a (README). Later sub-missions (7b–7h) start from these docs: which classes are staged and when they fill
in, how to re-record the framework vectors, how to regenerate the layered options.

## Task

1. **`docs/architecture/alg-layered.md`** (new): package map of what 7a ported; LGraph model notes; transform
   design (importer/transferrer sections, hash sites); L1 staged-class lifecycle (marker, registry, fitness test,
   how a mission replaces a staged file and removes its row); L5 registration; evidence (row counts, coverage).
   **Runbook:** re-recording `layered-framework.json`/`layered-sites.json` (and why it is an AD-13 stop),
   regenerating the options (`melk:generate Layered`, S4 check), what an `UnsupportedOperationException` naming a
   mission means. Link it from `docs/architecture/overview.md`.
2. **`docs/conformance.md`:** a 7a paragraph (vector files, row counts per group, AD-10 sites, unreachable branches,
   any upstream prose typo).
3. **`docs/architecture/port-map-alg-layered.md`:** mark 7a classes ported/staged; **`docs/architecture/inventory.md`**
   counts.
4. **`plans/roadmap.md`:** append a dated revision (never rewrite): L2 (orchestrators and debug utilities → 7f,
   ~3,100 lines), S1 (full-layout follow-ups → 7f), S2 (`TreeSet` promotion → 7c), S3
   (`IntermediateProcessorStrategy` → 7b), `TestGraphCreator` → 7b (L6), the staged-class list with missions, and
   follow-ups found during the run.
5. **`.agent-notes/layered-framework.md`:** observations per `~/.claude/rules/memory.md`.
6. **README:** append a "Mission summary" section (6c format: tasks and agents, stops, exit evidence, decisions,
   gates, follow-ups); mark batch 9 `[x]`.

## Write-set

`docs/architecture/{alg-layered,overview,port-map-alg-layered,inventory}.md`, `docs/conformance.md`,
`plans/roadmap.md`, `.agent-notes/layered-framework.md`, `plans/layered-framework/{README,decision-journal}.md`.

## Read-set

`docs/architecture/alg-common.md` (structure to mirror), `plans/ad13-rederivation/README.md` § Mission summary,
the decision journal, `unreached.md`, gate outputs.

## Acceptance criteria

- Given `npm run docs:build`, then it is green with the new page linked.
- Given `alg-layered.md`, then its staged-class table equals `test/architecture/staged-classes.json`.
- Given `plans/roadmap.md`, then the new revision records L2, L6 and S1–S3 and no earlier text changed.
- Given the mission-end gates, then both `regen-goldens.sh` sets leave `test/golden/refs/` byte-identical.

## Observability / Rollback

N/A — docs only. Reversible: revert the commit.
