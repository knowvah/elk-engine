<!-- SPDX-License-Identifier: EPL-2.0 -->

# T21 — Docs, collections inventory, roadmap revision, notes

**Agent:** typescript-pro (sonnet) · **Commit:** `docs(T21): document the core remainder and record the roadmap revision`

## Context
Mission 5b (README). Every code task has landed. The docs must describe what exists. The roadmap must record that row
5b's exit is met. The collections inventory must gain the identity-hashed sites that tasks journaled. Never rewrite
earlier `plans/` text: append only.

## Task
1. **`docs/architecture/core-engine.md`**: add a 5b section, or a new page linked from it if the file would pass 500
   lines. Cover:
   - the processor pipeline: `AlgorithmAssembler`, `LayoutProcessorConfiguration`, and their order rule (ordinal
     within a slot; `Set` insertion order only for equal factories). This is the on-call note for missions 6 and 7.
   - `LayoutConfigurator` and `ElkSpacings`;
   - the ElkMath sections;
   - the comments pipeline;
   - the JDK shims;
   - a **runbook**: re-recording `CoreJdkVectors` and `comment-vectors.sh`, and the procedure when a JDK upgrade
     changes `character.json` (journal it, add it to the known-divergences list, never patch the shim around it).
2. **`docs/architecture/{port-map,component-map,overview}.md`**: mark the 5b classes as ported and remove the
   "pending (5b)" notes. In `component-map.md`, mention the new `src/java/awt/geom` and `src/java/util/regex` shims.
3. **`docs/conformance.md`**: add an upstream-quirks list for this mission's verbatim oddities, journaled by T1–T20.
   For example: `ElkSpacings` `DOUBLE_EQ_EPSILON = 10e-5`, the `getDependendSpacingOptions` identifier, the
   `IDataProvider.cached()` quirks, `Triple`/`Quadruple` `equals` casts, `NodeReferenceMatcher`'s untrimmed buffer
   size. Also record the comments evidence (R6: scenario count, all equal) and any known divergences.
4. **`docs/translation-rules.md`**: rows for `Rectangle2D`, `Pattern` (the supported grammar), `JavaCharacter`,
   `JavaString.equalsIgnoreCase`, the `*l` `bigint` rule as applied to `ElkMath`, and the default-method-to-abstract-
   class pattern (R5) under §6.2.
5. **`docs/translation-rules-collections.md`**: add the new I-rows from the journal: comments caches and maps,
   `AggregatedMatchDecider`, `LayoutProcessorConfiguration` sets, `AlgorithmAssembler.cache`,
   `DefaultSelectionIterator.visited`, `NodeReferenceMatcher.foundAttachments`. Mark lookup-only sites as such.
6. **`plans/roadmap.md`**: append `## Revision 2026-10-24 (core-remainder)`. Cover:
   - row 5b done, with exit evidence;
   - scope changes: R1–R7, plus the R2 extension for `equalsIgnoreCase`;
   - follow-ups by mission: e.g. 7a `LayeredSpacings` builds on `AbstractSpacingsBuilder`; every algorithm mission
     uses `AlgorithmAssembler`; widen nullable signatures; the `devAssert` helper.
7. **`.agent-notes/core-remainder.md`**: the execution observations collected during the mission, in the template
   from `~/.claude/rules/memory.md`.
8. **README "Mission summary" section**, in 5a's format: tasks, exit evidence, decisions, quality gates, follow-ups.
9. Run `npm run docs:build` and the translation lint, which must be green. Avoid fenced blocks inside list items in
   `docs/` pages that the 24 locales track (5a `fix(T19)` lesson).

## Write-set
`docs/architecture/{core-engine,port-map,component-map,overview}.md` (plus a new linked page if needed),
`docs/conformance.md`, `docs/translation-rules.md`, `docs/translation-rules-collections.md`, `plans/roadmap.md`
(append only), `.agent-notes/core-remainder.md`, `plans/core-remainder/README.md` (summary section only).

## Read-set
- `plans/core-remainder/{decisions,decision-journal}.md`.
- `plans/core-engine/README.md` (summary format).
- The docs files above; `docs-site` i18n status (`npm run docs:i18n-status`).

## Acceptance criteria
- Given `npm run docs:build`, when run, then it exits 0, and the translation lint is green.
- Given the roadmap, when read, then the 2026-10-24 revision records row 5b's exit as met, with evidence and
  follow-ups, and no earlier line is edited.
- Given `docs/translation-rules-collections.md`, when read, then every identity-hashed site journaled in this
  mission has an I-row.

## Observability / Rollback
N/A — docs only. Reversible: revert the commit.
