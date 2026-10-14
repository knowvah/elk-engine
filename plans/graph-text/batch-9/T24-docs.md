<!-- SPDX-License-Identifier: EPL-2.0 -->

# T24 — Architecture, port map, translation rules and roadmap follow-up

**Agent:** typescript-pro · **Commit:** `docs(T24): document the elkt port and its runbook`

## Context
Closes the mission's documentation: design and evidence for the port-local entry point, the Xtext subset, the
runbook for regenerating evidence, and the follow-ups missions 5 and 7 inherit. Pattern: mission 4's
`docs/architecture/elk-json.md` (sections with `{#anchors}`, linked from port-map and translation-rules).

## Task
1. `docs/architecture/elk-text.md` (SPDX `<!-- -->` header, ≤ 300 lines), sections: (1) file map
   `src/graph/text/{parser,conversion,naming,scoping,linking,validation,serializer,formatting2}` + `ElkGraphText.ts`,
   `ElkGraphTextUtil.ts`, and `src/xtext/**` (what Xtext EPL subset is ported: util, conversion, naming, scoping,
   linking, validation, formatting2; one line each; the split rule: `src/xtext` knows only `xtext/java/emf`, graph.text
   depends on core, graph, `src/xtext`, enforced by `test/architecture/bundle-deps.json`); (2) a PlantUML component diagram
   (`~/.claude/rules/diagrams.md`: read it; render via the project's diagram convention, see `plans/*/diagrams/`) and a
   runtime-flow sequence diagram for `load`/`serialize`; (3) G1–G8 summary table; (4) the port-local entry point (G4:
   `load`, `validate`, `serialize`, not exported, AD-14) with the Xtext services each mirrors; (5) evidence (vectors, curated
   refs, sweep) and how to run each; (6) **runbook**: regenerate vectors (`tools/vectors/elkt-vectors.sh`), regenerate
   curated refs (`tools/oracle/regen-elkt-refs.sh`), registry modes (`ORACLE_REGISTRY=core`, default full registry),
   `elkt-sweep.sh`; byte-identical rerun rule; (7) the deferral list (G3 `MISSION5_ALGORITHMS`, D8 #1, `isQuotingNecessary`
   quirk G1, D3 upstream differences from T22/T23); (8) **maintenance failure modes** (Phase 4): elk-models pin move ->
   diagnose against the oracle first; registry growth in missions 5/7 -> regenerate core-only refs by script, journal,
   drop `MISSION5_ALGORITHMS`; ELK/Xtext pin change -> regenerate vectors by script (AD-13), no hand edits; scope-cache
   performance budget (largest model < 1 s). No `// on-call` comments.
2. `docs/architecture/port-map.md`: replace the `graph.text` "deferred/not ported" status with a `## graph.text → src/graph/text/`
   section modelled on the `graph.json` one (`:179-205`): counts (17 Xtend + 1 xtext, 1,232 + 120 LOC), mapping rule
   (Xtend -> hand port, `.xtext` -> hand parser D8, src-gen not ported D8), the `src/xtext` third-party row, status
   "ported (mission 4b)", link to `elk-text.md`; adjust the summary table rows `:17`-style and `:515` row/mission mapping.
3. `docs/translation-rules.md`: new `## 10. Xtend and Xtext in graph.text` (before or after §9 — keep §9's number stable
   and add as §10), table modelled on §8 (`:450-476`) with rows: `dispatch` methods -> `instanceof` ladder keeping Java method
   names; `@Check` -> registered check methods in registration order (T11); `@Inject` -> constructor parameters / plain
   construction, no DI framework; `extension` imports (`extension ElkGraphTextUtil`) -> explicit calls; `switch` with type
   guards incl. `switch x { A: .. B: .. }` falling off -> null; `static val` sets -> module `const`/`ReadonlySet`; `override
   protected` hooks -> protected methods; an Xtend expression whose unused result the compiler drops (G1 quirk; check `xtend-gen`) -> keep the compiled behaviour, comment; `Procedure1`/closures ->
   arrow functions. Add the row examples with real `file:line`s (`ElkGraphFormatter.xtend:40`, `ElkGraphValidator.xtend:52`,
   `ElkGraphLinker.xtend:27-30`) and a link to `architecture/elk-text.md`.
4. `docs/architecture/overview.md`: add the link to `elk-text.md` where `elk-json.md` is referenced (grep), plus one sentence in
   the component list if the bundle is listed.
5. `plans/roadmap.md` (CLAUDE.md: plans are append-only): append a dated section "Revision 2026-10-14 (graph-text)" after the
   last revision: 4b done criteria met (with the counts from T23), follow-ups: **mission 5** (and each later algorithm
   mission) regenerates the core-only graph.text refs/vectors when the TS registry grows (`tools/vectors/elkt-vectors.sh`,
   `tools/oracle/regen-elkt-refs.sh`, journal the regeneration) and drops the `MISSION5_ALGORITHMS` filter whose test then
   fails; **mission 7** repeats for the layered registry (the ~177 models that use layered keys); mission 4c reuses
   `src/xtext` (note its API surface). Do not edit existing text.
6. Docs site: `npm run docs:build` must stay green. The site wraps `docs/conformance.md`, `docs/architecture/{overview,
   component-map,port-map,inventory}.md`, `docs/translation-rules*.md`, `plans/roadmap.md` (`docs-site/.vitepress/config.ts:60-84`,
   `INCLUDE_SOURCE_DIR`/`CANONICAL_PAGES`); `elk-text.md` is not a site page, so links to it from included pages become GitHub
   blob links via `rewriteIncludedHref` (`:92-103`): no sidebar or locale entry is needed (mission 4 added `elk-json.md` the same
   way: `git log --stat -1 -- docs/architecture/elk-json.md`; verify by building). `npm run docs:i18n-hashes` is part of
   the build; translated pages go stale by hash, which is reported, not an error. Run the build and the markdown link check
   used by the repo (`npm run format:check` covers markdown if prettier is configured for it).

## Write-set
`docs/architecture/elk-text.md`, `docs/architecture/port-map.md`, `docs/architecture/overview.md`,
`docs/translation-rules.md`, `plans/roadmap.md` (append only). Diagram sources if the diagram convention stores them
in-repo: under `docs/architecture/` only, named in the PR.

## Read-set
- `docs/architecture/{elk-json,overview,port-map}.md`, `docs/translation-rules.md:450-480`, `docs/conformance.md` (T23's section)
- `plans/graph-text/decisions.md`, `plans/graph-text/decision-journal.md`, `plans/roadmap.md` (tail), `~/.claude/rules/diagrams.md`
- `docs-site/.vitepress/config.ts:60-103`, `package.json` scripts `docs:*`
- Source maps for accuracy: `src/graph/text/**`, `src/xtext/**` listings, `test/architecture/bundle-deps.json`

## Decisions
- [G1–G8](../decisions.md), [Phase 4](../decisions.md#operational-readiness-phase-4), D3, D8, D10, AD-14.

## Interface contract
None. Anchors other docs link to: `elk-text.md#entry-point`, `#runbook`, `#maintenance`, `#deferrals` (give headings explicit `{#...}` ids).

## Acceptance criteria
- Given the runbook, when a maintainer follows it, then every command exists and every named file is real (checked by running `--help`/`ls`, not assumed).
- Given `npm run docs:build`, then it succeeds with no dead link caused by the new pages.
- Given `plans/roadmap.md`, then `git diff` shows only added lines.
- Given the docs, then the G1–G8, deferral and quirk lists agree with `docs/conformance.md`.

## Quality bar
README gates (`npm run format:check`), `npm run docs:build` green, `git diff --stat` limited to the write-set, diagrams follow
`diagrams.md` (PlantUML, type chosen by rubric).

## Observability
N/A — no new observable operations.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not rewrite existing roadmap or plan text; do not touch `docs-site/` (only verify), parity-report, or other missions'
docs beyond the lines named. No claims about numbers T23 has not produced. Do not commit.
