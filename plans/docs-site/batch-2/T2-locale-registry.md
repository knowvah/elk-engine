<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2 — Locale registry, config locales, completeness gate

**Agent:** typescript-pro · **Commit:** `feat(docs): add the locale registry and completeness gate`

## Context
Port dot-engine's registry (D2) so that adding a language is adding one module under
`docs-site/.vitepress/locales/`, with no config edit. No locale module exists after this task.

## Task
1. `theme/strings.ts` (client-safe): `ComponentStrings` and `EN_COMPONENTS` for the gallery and
   stale banner (fields in the contract below), `pickStrings(lang, componentsByLang)`.
2. `i18n.ts`: `DocsLocale`, `NavLabels`, `LOCALES` discovered via `readdirSync` + dynamic
   `import()` of `locales/*.ts` (copy the mechanism and the header rationale — no
   `import.meta.glob`), tolerate a missing `locales/` dir, `ALL_LOCALE_PREFIXES` (the 23 prefixes
   in translation-spec.md), `TRANSLATABLE_EXCLUDES` per decisions.md#english-only, `EN` labels,
   `navFor(prefix, ui)`, `sidebarFor(prefix, ui)`, `assertLocaleComplete(root, prefix, excludes)`
   as a pure function.
3. `config.ts`: replace the literal nav/sidebar with `navFor('', EN)` / `sidebarFor('', EN)`, add
   the `locales:` block (root + registry), call `assertLocaleComplete` for every registered prefix
   at load, publish `themeConfig.componentsByLang`. Keep everything else from T1.
4. Nav/sidebar for English: Guide (Overview, Architecture, Java foundations, Contributing),
   Reference (Translation rules, Collections rules, Port map, Inventory, Roadmap),
   Conformance, Parity, Showcase. English-only targets stay unprefixed in every locale and append
   `ui.englishOnly` to their label for non-root locales.
5. `test/docs/locale-complete.test.ts` with a fixture tree under `test/docs/fixtures/site/`.

## Write-set
`docs-site/.vitepress/i18n.ts`, `docs-site/.vitepress/config.ts`,
`docs-site/.vitepress/theme/strings.ts`, `test/docs/locale-complete.test.ts`,
`test/docs/fixtures/site/**`.

## Read-set
- `../decisions.md#english-only`, `#process`
- `../dot-engine/docs-site/.vitepress/i18n.ts` (all), `theme/strings.ts` (all),
  `config.ts:1-60` (locales block), `../dot-engine/test/docs/locale-complete.test.ts`
- `docs-site/.vitepress/config.ts` (T1's)

## Interface contract (outputs)
```ts
// theme/strings.ts
export interface ComponentStrings { elkSource: string; renderFailed: string; clickToEnlarge: string;
  rendering: string; close: string; staleNotice: string; staleLink: string }
export const EN_COMPONENTS: ComponentStrings;
export function pickStrings(lang: string, byLang?: Record<string, ComponentStrings>): ComponentStrings;
// i18n.ts
export interface NavLabels { overview: string; guide: string; reference: string; showcase: string;
  conformance: string; parity: string; architecture: string; javaFoundations: string;
  contributing: string; translationRules: string; collectionsRules: string; portMap: string;
  inventory: string; roadmap: string; goldenCorpus: string; englishOnly: string }
export interface DocsLocale { label: string; lang: string; ui: NavLabels; components: ComponentStrings }
export const LOCALES: Record<string, DocsLocale>;   // key = URL prefix
export const ALL_LOCALE_PREFIXES: readonly string[];
export const TRANSLATABLE_EXCLUDES: readonly string[];
export const EN: NavLabels;
export function navFor(prefix: string, ui: NavLabels): DefaultTheme.NavItem[];
export function sidebarFor(prefix: string, ui: NavLabels): DefaultTheme.Sidebar;
export function assertLocaleComplete(root: string, prefix: string, excludes: readonly string[]): void;
```

## Acceptance criteria
- Given no `locales/*.ts`, when `npm run docs:build` runs, then it passes and the emitted `.html`
  set equals T1's plus T3's pages (compare `find dist -name '*.html'`).
- Given a fixture tree where locale `xx` lacks `guide/overview.md`, when `assertLocaleComplete`
  runs, then it throws naming `xx/guide/overview.md`.
- Given a fixture tree where `xx` lacks only `parity.md`, `guide/roadmap.md` and `showcase/x.md`,
  then it does not throw.
- Given `navFor('/xx', ui)`, then `/xx/guide/overview` is prefixed, `/parity` is not, and the
  parity item's text ends with `ui.englishOnly`.
- `pickStrings('zz-ZZ')` returns `EN_COMPONENTS`.

## Quality bar
README gates; `test/docs/locale-complete.test.ts` green; SPDX headers; 30-NLOC functions; no `any`.

## Observability
N/A.

## Rollback
Reversible — revert the commit.

## Boundaries
No locale modules. Do not touch `theme/index.ts` (T5/T7) or the content pages (T3).
