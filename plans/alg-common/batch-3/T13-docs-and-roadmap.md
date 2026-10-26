<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Docs, collections inventory, roadmap revision, notes

**Agent:** typescript-pro (sonnet) · **Commit:** `docs(T13): document alg.common part a and record the roadmap revision`

## Context
Mission 6a (README). Every code task has landed. The docs must describe what exists, the roadmap must record the
split (AC1) and the deferred tests (P5), and the collections inventory must gain the journaled identity sites. Never
rewrite earlier `plans/` text: append only.

## Task
1. **`docs/architecture/alg-common.md`** (new page, linked from `overview.md`):
   - the package map of what 6a ported and what 6b will add;
   - the evidence per package (JUnit ports, `alg-common.json` sections);
   - the V6–V8 ordering story;
   - the `PolyominoOptions` codegen;
   - a **runbook**:
     - re-recording `alg-common-vectors.sh`;
     - regenerating `PolyominoOptions` (`npm run melk:generate Polyomino`, never by changing `DEFAULT_BUNDLES`);
     - the three likely failure modes from planning: HashSet tie order, `PolyominoOptions`↔`CoreOptions` TDZ, `Int32`
       bit maths in the grids, each with how it is detected and fixed.
2. **`docs/architecture/{port-map,component-map,overview}.md`**: mark the 6a classes as ported and name 6b's remainder.
3. **`docs/conformance.md`**:
   - the 6a evidence (scenario counts per section, all equal);
   - the AC4 known divergence (no debug file output);
   - the upstream quirks the tasks journaled, verbatim;
   - the 4 deferred JUnit files with their target missions.
4. **`docs/translation-rules.md`**: rows for value-hashed sets with ported strategies (`TEdge`/`TTriangle`), the stable
   sort for tie preservation (`NaiveMinST`), and `BiFunction` → function types.
5. **`docs/translation-rules-collections.md`**: I-rows from I38 for every identity-hashed site journaled in this
   mission (lookup-only sites marked as such), plus a note on V6–V8 that the ordering is now implemented and proven.
6. **`plans/roadmap.md`**: append `## Revision <date> (alg-common)`, covering:
   - row 6 split into 6a (done, with exit evidence) and 6b (nodespacing + `NodeMicroLayout`, AC2 evidence plan);
   - the deferred JUnit files: 3 → 7a, `NodeMicroLayoutTest` → 8x;
   - follow-ups by mission, from the journal.
7. **`.agent-notes/alg-common.md`**: execution observations collected during the mission, in the template from
   `~/.claude/rules/memory.md`. Keep orchestrator entries already there.
8. **README "Mission summary" section**, in 5b's format: tasks, exit evidence, decisions, quality gates, follow-ups.
9. Run `npm run docs:build` (green) and `npm run docs:i18n-status`. Report any tracked file the build rewrites. Avoid
   fenced blocks inside list items in `docs/` pages tracked by the locales.

## Write-set
`docs/architecture/{alg-common,port-map,component-map,overview}.md`, `docs/conformance.md`, `docs/translation-rules.md`,
`docs/translation-rules-collections.md`, `plans/roadmap.md` (append only), `.agent-notes/alg-common.md`,
`plans/alg-common/README.md` (summary section only).

## Read-set
- `plans/alg-common/{decisions,decision-journal}.md`.
- `plans/core-remainder/README.md` (summary format).
- The docs files above; `docs/architecture/core-engine.md` §7 (5b's runbook style).

## Acceptance criteria
- Given `npm run docs:build`, when run, then it exits 0.
- Given the roadmap, when read, then the new revision records 6a's exit as met with evidence, the 6b scope and the
  deferred tests, and no earlier line is edited.
- Given `docs/translation-rules-collections.md`, when read, then every identity-hashed site journaled in this mission
  has an I-row.

## Observability / Rollback
N/A — docs only. Reversible: revert the commit.
