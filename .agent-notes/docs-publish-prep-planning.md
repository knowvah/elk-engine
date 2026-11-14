<!-- SPDX-License-Identifier: EPL-2.0 -->

# Planning observations — docs-publish-prep (2026-11-13, unattended)

## Observation: typedoc cannot take a TS 6 alias beside TS 7 at the root

- **Context**: Probing AD-6's "TS 6 alias" for typedoc 0.28.20 in `$TMPDIR/tdprobe*`.
- **Finding**: typedoc's peer is `typescript` `5.0.x … 6.0.x` (no TS 7 release; latest 0.28.20, 2026-07-05). With root
  `typescript@7.0.2`, `overrides: {typedoc: {typescript: "npm:@typescript/typescript6@6.0.2"}}` fails `npm install` with
  ERESOLVE. The reverse alias works (`"typescript": "npm:@typescript/typescript6@6.0.2"` plus TS 7 under another name:
  `.bin/tsc` → 7.0.2, typedoc resolves 6.0.3 through `@typescript/old`), but repoints the root `typescript`. An isolated
  package with `typescript@6.0.3` runs typedoc over a 12-export sample of `src/` with 0 errors, 35 link warnings, 2.9 s.
- **Impact**: DP3 uses the isolated `tools/typedoc/` package. The warnings come from Java-side `{@link}` targets in
  generated option comments (`TopdownNodeTypes`, `nodeSize.fixedGraphSize`, …); they are not fixable at the comment.
- **Confidence**: High

## Observation: the language switcher 404s on every English-only page

- **Context**: linkinator 8.1.0 over the planning-time `docs-site/.vitepress/dist`.
- **Finding**: 138 broken links = 6 English-only pages × 23 locales. `useLangs({ correspondingLink: true })`
  (`vitepress/dist/client/theme-default/composables/langs.js:15`) appends the page path to each locale prefix unless
  `themeConfig.i18nRouting === false`; there is no per-page switch. Without `--clean-urls` linkinator reports 528 false
  404s because the site uses `cleanUrls: true`.
- **Impact**: DP5 sets `i18nRouting: false`. Any link check of this site needs `--clean-urls`. The docs-site mission's
  intent (no switcher 404s, `i18n.ts:38`) missed English-only pages.
- **Confidence**: High (count and pattern measured; the fix is to be confirmed by T5's rebuild)

## Observation: nav and sidebar are pinned exactly by tests

- **Context**: Planning where new pages go.
- **Finding**: `test/docs/locale-complete.test.ts:107-119` pins `navFor('', EN)` and `sidebarFor('', EN)` with `toEqual`;
  `:91-105` pins the English-only sidebar links. Any new nav item changes a frozen expectation (AD-13).
- **Impact**: New pages stay out of the nav until a ruling (DP6).
- **Confidence**: High

## Observation: the port has no ServiceLoader; layout needs explicit provider registration

- **Context**: Deciding the export surface.
- **Finding**: `LayoutMetaDataService.getInstance()` registers only `CoreOptions` (`src/core/data/LayoutMetaDataService.ts:221-231`);
  every algorithm's `*MetaDataProvider` must be registered by the caller (`tools/corpus/ts-layout-pipeline.ts:75-94`).
  `CoreOptions` and `TopdownSizeApproximator` import each other; `CoreOptions` must be evaluated first
  (`ts-layout-pipeline.ts:6-7`).
- **Impact**: The candidate entry imports `CoreOptions` first and exports the providers; the pack rehearsal checks the
  order survives esbuild bundling.
- **Confidence**: High

## Observation: a plain `npm publish` here would target GitHub Packages

- **Context**: Comparing `package.json` with dot-engine's.
- **Finding**: `.npmrc` maps `@knowvah` to `npm.pkg.github.com`; `publishConfig` holds only `access`. dot-engine pins
  `publishConfig.registry` and `publishConfig["@knowvah:registry"]` to npmjs for this reason.
- **Impact**: DP7 adds both pins before anyone publishes.
- **Confidence**: High (config read; no publish attempted)
