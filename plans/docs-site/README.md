<!-- SPDX-License-Identifier: EPL-2.0 -->

# Docs Site + Localization — Mission Brief

## Objective

Build `https://elk-engine.knowvah.com`: a VitePress site in `docs-site/` mirroring
`../dot-engine`'s setup and features where elk-engine has the content to back them, then localize
it into the 23 non-English locales the Knowvah docs sites ship. Features: `@knowvah/theme`
branding, a showcase that renders the oracle goldens client-side from ELK JSON, the conformance
and parity pages, `@include` wrappers over the canonical `docs/*.md`, a locale registry with a
build-time completeness gate, drift tracking with a stale banner, translation lint, and a
GitHub Pages deploy workflow. **No `src/` file changes. No vector, golden, or corpus file changes.**
Omitted on purpose: playground (no engine yet), TypeDoc (nothing exported; `@typescript/typescript6`
bridge at first publish), `release.yml` (roadmap §12), ESLint (typescript-eslint needs the TS 7.1 API).

## Mission start

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read [decisions.md](decisions.md), [translation-spec.md](translation-spec.md),
   [decision-journal.md](decision-journal.md).
3. If the branch does not exist: `git switch -c feature/docs-site` from `main`, then
   `git add plans/docs-site && git commit -m "docs(plans): add docs-site mission brief"`.
   Otherwise `git switch feature/docs-site`.
4. Find the first batch below with `[ ]`, read its `overview.md`, resume at its first incomplete task.

## Branch and landing

`feature/docs-site` off `main`. One commit per task (Conventional Commits, no attribution; body
carries `Task: TN (docs-site batch N)`). **Never push `main`, never merge the PR.** At mission end
the mission does not push the branch either: it reports, and the user pushes, opens the PR, and
merges with a merge commit using admin bypass for the signature rule (decisions.md D10).
`plans/` is committed in this repo (CLAUDE.md archaeology), not gitignored.

## Inputs (read-only)

| What | Where |
|------|-------|
| Reference implementation | `../dot-engine/docs-site/**`, `scripts/{i18n-hash,docs-i18n-status}.mjs`, `test/docs/**`, `test/helpers/docs.ts`, `.github/workflows/docs.yml` |
| Register reference per locale | `~/git/knowvah/dot-atlassian/site/.vitepress/locales/<p>.ts` and `site/<p>/` |
| Canonical docs | `docs/conformance.md`, `docs/architecture/*.md`, `docs/translation-rules*.md`, `docs/parity-report.md`, `plans/roadmap.md` |
| Goldens | `test/corpus/manifest.json` (`golden[]`), `test/golden/refs/elk/*.json` |
| Theme | `@knowvah/theme` 0.3.0 on GitHub Packages (auth: `~/.npmrc` locally, `GITHUB_TOKEN` in CI) |
| PlantUML (T3 only) | `/opt/homebrew/bin/plantuml` 1.2026.8 |

## Quality gates

Agents run their own tests + `npm run typecheck`. The orchestrator runs, after every batch:

```bash
npm run format:check                                # exit 0
npm run typecheck                                   # exit 0
npm test                                            # exit 0 (includes test/docs)
npm run coverage                                    # exit 0; src/** thresholds unchanged
npm run docs:build                                  # exit 0; assertLocaleComplete passes
git show --name-only --format= HEAD                 # ⊆ the task's write-set
git diff --exit-code --stat src test/golden test/corpus  # empty
lizard -C 10 -a 5 -T nloc=30 -w <changed .ts/.mjs files>
```

Locale batches also: `npm run docs:i18n-status` shows 0 missing / 0 stale / 0 missing golden ids for
each locale landed, and the journal records `docs:build` wall time vs the T1 baseline.

## Stop conditions — halt, journal, wait for the user

1. A file outside the current task's write-set needs changing.
2. The same gate check fails twice in a row.
3. A change would contradict D1–D11 ([decisions.md](decisions.md)) or AD-1…AD-15.
4. **German (T10) is committed** — mandatory review before batch 7.
5. Any `src/**`, `test/golden/**`, or `test/corpus/**` file would change.
6. An English page would need editing to make a translation read naturally.
7. A translation would need to alter a code fence, an ELK option id, a Java/TypeScript identifier,
   a golden id, or a file path.
8. `docs:build` exceeds 3× the T1 baseline, or a locale's search-index chunk exceeds 3× English's.
9. `npm ci` cannot resolve `@knowvah/theme`, or `deploy-pages` fails for a non-build reason.
10. `@knowvah/theme`'s VitePress export does not work with VitePress 1.6.4 as installed.
11. Anything would push `main` or merge the PR.

A locale whose lint fails twice is **quarantined** (unregistered, uncommitted, journaled); the batch
continues. German quarantined = mission stops.

## Push-forward — decide and journal

English wording and structure within the Phase 5 page set; translation wording per the spec;
glossary additions (append to the spec, note in the commit body); `elkSvg.ts` styling (geometry
always from JSON); nav/sidebar order within the agreed groups; `$showcase` prose; gate fixes inside
the task's write-set; one re-dispatch of a translation agent with the failing assertions; tests the
criteria imply; patch/minor versions within D1; fix commits to satisfy a gate.

## Batch progress

| Batch | Name | Tasks | Depends on | Status |
|-------|------|-------|------------|--------|
| 1 | VitePress scaffold | T1 | — | [x] |
| 2 | Registry, English content, ELK renderer | T2–T4 | 1 | [x] |
| 3 | Showcase + reports | T5–T6 | 2 | [x] |
| 4 | Drift tracking + workflows | T7–T8 | 3 | [ ] |
| 5 | Translation lint | T9 | 4 | [ ] |
| 6 | German (review stop) | T10 | 5 | [ ] |
| 7 | cs da es et fi | T11–T15 | 6 + review | [ ] |
| 8 | fr hu is it ja | T16–T20 | 7 | [ ] |
| 9 | ko nl no pl pt-br | T21–T25 | 8 | [ ] |
| 10 | ro ru sk sv tr | T26–T30 | 9 | [ ] |
| 11 | zh-cn zh-tw | T31–T32 | 10 | [ ] |
| 12 | Close-out | T33 | 11 | [ ] |

Locale batches run 2 technical-writer agents per locale (parts a/b, [translation-spec.md](translation-spec.md#page-split)),
all dispatched in one message; the orchestrator writes each locale module and commits per locale.
Parallel agents never run `npm run coverage` or `npm run docs:build` (shared output dirs).

## Document index

- [decisions.md](decisions.md) · [translation-spec.md](translation-spec.md) · [decision-journal.md](decision-journal.md)
- [diagrams/component-map.md](diagrams/component-map.md) · [diagrams/data-flow.md](diagrams/data-flow.md)
- Batches: [1](batch-1/overview.md) · [2](batch-2/overview.md) · [3](batch-3/overview.md) ·
  [4](batch-4/overview.md) · [5](batch-5/overview.md) · [6](batch-6/overview.md) ·
  [7](batch-7/overview.md) · [8](batch-8/overview.md) · [9](batch-9/overview.md) ·
  [10](batch-10/overview.md) · [11](batch-11/overview.md) · [12](batch-12/overview.md)

## Mission end

All batches `[x]`; gates green; `.agent-notes/docs-site.md` holds novel observations; final
commit body carries the one-line stop summary; summary at the bottom of this file (tasks, decisions,
gates, quarantines, build-time and index-size measurements). Report to the user with the PR
instructions (push `feature/docs-site`, open PR, merge commit + admin bypass), the first-deploy
follow-ups (enable HTTPS enforcement after `docs.yml` runs), and anything journaled as needing them.

## Startup sequence (after compaction)

1. Re-read this file. 2. Re-read `decision-journal.md`. 3. First batch with `[ ]` → its
`overview.md` → first incomplete task.
