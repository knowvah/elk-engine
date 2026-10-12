<!-- SPDX-License-Identifier: EPL-2.0 -->

# T5 — Showcase: goldens gallery

**Agent:** typescript-pro · **Commit:** `feat(docs): add the oracle goldens showcase`

## Context
dot-engine's showcase renders goldens client-side per layout engine; here the goldens are ELK
JSON oracle outputs grouped by algorithm (D6, D7). Pages and data are generated at build time,
per locale, from an English description map plus per-locale overrides.

## Task
1. `docs-site/.vitepress/locales/goldens/en.json`: `{ "$showcase": {...}, "<id>": "<description>" }`
   for every `golden[].id` in `test/corpus/manifest.json`, English text seeded from each `note`.
   `$showcase` keys: `indexTitle`, `indexHeading`, `indexIntro` (`{total}`), `indexRowCount`
   (`{count}`), `indexOutro` (`{conformance}`), `conformanceLabel`, `algorithmTitle` (`{algorithm}`),
   `algorithmHeading` (`{algorithm}`, `{count}`), `algorithmIntro`, `blurbs` (one line per
   algorithm id present in the manifest).
2. `docs-site/copy-goldens.mjs` (adapt dot-engine's): read the manifest and
   `test/golden/refs/elk/<id>.json`; write `.vitepress/goldens.json`
   (`{ byAlgorithm: { "<algorithm>": [{ id, description, algorithm, graph }] } }`),
   `docs-site/showcase/{index,<algorithm>}.md`; for every `.vitepress/locales/<p>.ts` also
   `.vitepress/goldens.<p>.json` (descriptions from `locales/goldens/<p>.json`, English fallback
   per id) and `docs-site/<p>/showcase/*.md` with `/<p>/`-prefixed links. Export `localizeGoldens`
   and `listLocalePrefixes` (consumed by T7). No side effects on import.
3. `theme/GoldenGallery.vue` (adapt dot-engine's): prop `algorithm`; cards render lazily with
   `ElkDiagram`; lightbox; strings via `pickStrings`; per-locale data via `import.meta.glob` of
   `../goldens.*.json` (client code — the glob is fine here, unlike `config.ts`).
4. `theme/index.ts`: register `GoldenGallery` and `ElkDiagram`.
5. `package.json`: scripts `docs:copy-goldens` (`node docs-site/copy-goldens.mjs`) and
   `docs:copy-reports` (`node docs-site/copy-reports.mjs`, T6's file) chained into `docs:dev` and
   `docs:build` after `docs:brand`. `.gitignore`: `docs-site/showcase/`, `docs-site/*/showcase/`,
   `docs-site/.vitepress/goldens.json`, `docs-site/.vitepress/goldens.*.json`, `docs-site/parity.md`,
   `docs-site/.vitepress/i18n-hashes.json`.
6. `test/docs/goldens-i18n.test.ts`: every manifest id has an English description; a fixture
   locale file with one missing id falls back to English; `$showcase` keys are complete in `en.json`.

## Write-set
`docs-site/copy-goldens.mjs`, `docs-site/.vitepress/theme/GoldenGallery.vue`,
`docs-site/.vitepress/theme/index.ts`, `docs-site/.vitepress/locales/goldens/en.json`,
`.gitignore`, `package.json`, `test/docs/goldens-i18n.test.ts`.

## Read-set
- `../decisions.md#goldens`, `#renderer`
- `../dot-engine/docs-site/copy-goldens.mjs` (all), `theme/GoldenGallery.vue` (all),
  `../dot-engine/test/docs/goldens-i18n.test.ts`, `../dot-engine/.gitignore:49-85`
- `test/corpus/manifest.json` (`golden[]`), `docs-site/.vitepress/theme/{strings.ts,elkSvg.ts}` (contracts)

## Interface contract (outputs, consumed by T7, T10+)
`localizeGoldens(prefix) → { missingIds: string[] }`, `listLocalePrefixes() → string[]`,
`EN_SHOWCASE` keys above; locale file shape `{ "$showcase"?: Partial<EN_SHOWCASE>, [id]: string }`.

## Acceptance criteria
- Given the manifest's goldens, when `docs:copy-goldens` runs, then `showcase/index.md` and one
  page per distinct `algorithm` exist and `goldens.json` carries every golden's graph.
- Given a fixture locale `xx` with `goldens/xx.json` lacking one id, then `goldens.xx.json` carries
  the English description for that id and `localizeGoldens('xx').missingIds` names it.
- Given `npm run docs:build`, then `dist/showcase/index.html` and the algorithm pages exist.
- Given `GoldenGallery`, then it reads strings through `pickStrings` only (no hard-coded English).

## Quality bar
README gates; functions ≤ 30 NLOC; SPDX headers; no `any`.

## Observability
N/A.

## Rollback
Reversible — revert the commit.

## Boundaries
Never edit `test/corpus/manifest.json` or anything under `test/golden/`. Do not write
`copy-reports.mjs` (T6).
