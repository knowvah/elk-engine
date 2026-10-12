<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architecture decisions — docs-site

Confirmed by the user 2026-10-11. Locked: contradicting one is stop condition 3.

| ID | Decision |
|----|----------|
| D1 | VitePress 1.6.4 line (not 2.0 alpha); `@knowvah/theme` 0.3.0; `@fontsource/jetbrains-mono` 5.3 |
| D2 | i18n machinery is copied and adapted from `../dot-engine`, same file names |
| D3 | `docs/*.md` stays canonical; site pages are `@include` wrappers; translations are full pages |
| D4 | PlantUML diagrams rendered once locally, SVGs committed under `docs-site/public/diagrams/` |
| D5 | English-only: parity, translation rules (both), port map, inventory, roadmap, showcase (generated) |
| D6 | `ElkDiagram.vue` + pure `elkSvg.ts` render ELK JSON goldens client-side |
| D7 | Golden descriptions live in `docs-site/.vitepress/locales/goldens/en.json`; `test/` untouched |
| D8 | German first with a review stop; 5 locales per batch; 2 technical-writer agents per locale |
| D9 | Drift = `sourceHash` + localized banner + status script; never build-failing |
| D10 | `feature/docs-site`, PR, user merges with a merge commit and admin bypass for signatures |
| D11 | `npm run docs:build` is a PR gate in `ci.yml` (needs `packages: read` + Packages auth) |

## D1 — Toolchain {#toolchain}

VitePress `^1.6.4` (registry latest 1.6.4; `next` is 2.0.0-alpha.20). `@knowvah/theme@0.3.0`
targets 1.x and is reachable from GitHub Packages. Node 26 (volta) is required: locale modules are
loaded by Node's native type stripping (no `import.meta.glob`, see dot-engine `i18n.ts` header).

## D2 — Provenance {#provenance}

Copy `i18n.ts`, `theme/strings.ts`, `StaleBanner.vue`, `copy-brand-assets.mjs`,
`copy-reports.mjs`, `copy-goldens.mjs`, `scripts/i18n-hash.mjs`, `scripts/docs-i18n-status.mjs`,
`test/helpers/docs.ts`, and the `test/docs` suites from `../dot-engine`, keeping names and the
header rationales; adapt labels, excludes, golden source, and the included-sources map. Same owner,
same license (EPL-2.0, SPDX line 1). Record the dot-engine commit copied from in the journal.

## D3 — Canonical docs {#canonical}

English `docs-site/conformance.md` = `<!--@include: ../docs/conformance.md-->` (plus front matter);
`guide/architecture.md` includes `docs/architecture/overview.md` and `component-map.md` with the
four PlantUML fences replaced by `/diagrams/*.svg` images (D4); `guide/translation-rules.md`,
`guide/collections-rules.md`, `guide/port-map.md`, `guide/inventory.md`, `guide/roadmap.md` include
their sources. Translated pages are full pages whose `sourceHash` is the hash of the included
source file(s) (`INCLUDED_SOURCES` in `scripts/i18n-hash.mjs`; for a page with two sources the
hash is over their concatenation in order).

## D4 — Diagrams {#diagrams}

`plantuml -tsvg` (local CLI 1.2026.8) renders each fence once; the SVGs are committed. No Java,
jar download, or plantuml.com call in CI. Re-render when the source diagram changes (journal it).

## D5 — English-only set {#english-only}

`TRANSLATABLE_EXCLUDES = ['parity.md', 'guide/translation-rules.md', 'guide/collections-rules.md',
'guide/port-map.md', 'guide/inventory.md', 'guide/roadmap.md', 'showcase/']`. Locale nav entries
for these carry `ui.englishOnly` and link unprefixed. Translated set per locale: `index.md`,
`guide/{overview,architecture,java-foundations,contributing}.md`, `conformance.md`, plus
`locales/goldens/<p>.json` (`$showcase` block + 5 descriptions).

## D6 — Renderer {#renderer}

`elkSvg.ts` is a pure function `renderElkSvg(graph, options?) → string` (testable under vitest from
`test/docs/elk-svg.test.ts`); `ElkDiagram.vue` is a thin wrapper that sets `innerHTML`. Geometry
(x, y, width, height, ports, labels, edge `sections` start/bend/end points) comes from the JSON;
styling is the component's. Unknown keys are ignored. The same component will show TypeScript
output in later missions.

## D7 — Golden descriptions {#goldens}

`docs-site/.vitepress/locales/goldens/en.json` = `{ "$showcase": {...}, "<id>": "<description>" }`
for every `golden[].id` in `test/corpus/manifest.json` (5 today); the manifest's `note` seeds the
English text. Locale files use the same shape with English fallback per missing id; `copy-goldens`
writes `showcase/{index,<algorithm>}.md` per locale and `.vitepress/goldens[.<p>].json`, all gitignored.

## D8 — Translation process {#process}

Shared [translation-spec.md](translation-spec.md). German first; the user reviews before batch 7.
Two technical-writer agents per locale (parts a/b), 5 locales per batch (10 agents, one message);
the orchestrator alone writes `locales/<p>.ts` (registration, last) and commits one commit per
locale. Register and labels cross-checked against dot-atlassian's locale module and pages.

## D9 — Drift {#drift}

As dot-engine decision 1: `sourceHash` front matter, `StaleBanner.vue` via the `doc-before` layout
slot reading `.vitepress/i18n-hashes.json` (written by `docs:i18n-hashes` during `docs:build`),
`npm run docs:i18n-status` always exits 0.

## D10 — Landing {#landing}

The ruleset requires signed commits and PRs with merge commits only. Mission commits are unsigned.
The user pushes the branch, opens the PR, and merges with "Create a merge commit" using the admin
bypass. The mission never pushes.

## D11 — CI gate {#ci}

`ci.yml` gains `permissions.packages: read`, `registry-url`/`scope` on `setup-node`,
`NODE_AUTH_TOKEN` on `npm ci`, and `npm run docs:build` after coverage. `docs.yml` (push to main,
`workflow_dispatch`) builds and deploys `docs-site/.vitepress/dist` with `pages: write` +
`id-token: write`, concurrency group `pages`.

## Rollback classification

All tasks **Reversible**: revert the commit. A locale's revert de-registers it with its pages.
Reverting the whole merge restores the English-only repository with unchanged URLs.
