<!-- SPDX-License-Identifier: EPL-2.0 -->

# Docs site: localization and maintenance

English is served at the root (`/guide/...`); every other language lives under its prefix
(`/de/guide/...`). This file is for maintainers. It sits in `.vitepress/` so that VitePress does not
publish it and the completeness check does not treat it as a page every locale must translate.

## How a language is registered

A language exists when `docs-site/.vitepress/locales/<prefix>.ts` exists. `i18n.ts` discovers those
modules at build time (`readdirSync` + native `import()`, never `import.meta.glob`; see the header
of `i18n.ts`), and `config.ts` generates that language's nav, sidebar and switcher entry from the
module's `ui` labels. A locale module is data only, and default-exports one `DocsLocale`:

- `label`: the name in the language switcher, written in that language.
- `lang`: the `<html lang>` value, for example `de-DE`.
- `ui`: every `NavLabels` field, including `verification` (the sidebar group holding Conformance and
  Parity) and `englishOnly` (appended to the label of each English-only page).
- `components`: every `ComponentStrings` field (diagram viewer and stale-banner strings; see
  `theme/strings.ts`).

Import nothing from the module but types (`import type`): Node loads it directly with type
stripping.

## Adding a language

The translated set per language (the full spec is `plans/docs-site/translation-spec.md`):

| Page                        | Source                                                                        |
| --------------------------- | ----------------------------------------------------------------------------- |
| `index.md`                  | `docs-site/index.md`                                                          |
| `conformance.md`            | a full translation of `docs/conformance.md`, not an `@include` wrapper        |
| `guide/overview.md`         | `docs-site/guide/overview.md`                                                 |
| `guide/architecture.md`     | a full translation of `docs/architecture/overview.md` plus `component-map.md` |
| `guide/java-foundations.md` | `docs-site/guide/java-foundations.md`                                         |
| `guide/contributing.md`     | `docs-site/guide/contributing.md`                                             |

1. Translate those pages into `docs-site/<prefix>/...` (same relative paths).
   `guide/architecture.md` keeps the `/diagrams/*.svg` image references.
2. Write `docs-site/.vitepress/locales/goldens/<prefix>.json`: a `"$showcase"` block (titles, intro
   and algorithm blurbs; see the key list in `docs-site/copy-goldens.mjs`) plus one translated
   description for every golden id in `test/corpus/manifest.json`.
3. Write `docs-site/.vitepress/locales/<prefix>.ts` **last**. Any file in `locales/` is registered
   immediately, so it must not exist before the pages and the goldens file do.
4. `npm test` runs the translation lint over every registered locale (byte-identical code fences,
   prefixed internal links, a well-formed `sourceHash`, the same component tags).

The prefix must be one of `ALL_LOCALE_PREFIXES` in `i18n.ts`.

## Adding or removing an English page

The English page set is the `docs-site/` tree minus dot-directories, `public/`, the locale
directories and `TRANSLATABLE_EXCLUDES`. A new hand-written English page therefore **fails the build
for every registered locale** (`assertLocaleComplete`) until it is translated, because VitePress
does not fall back to English for a missing page: the language switcher would link to a 404. Either
translate the page into every locale in the same change, or de-register a locale (delete its module)
until it catches up. Removing an English page removes it from the required set.

## English-only pages

These stay English and are listed in `TRANSLATABLE_EXCLUDES`:

- `parity.md`
- `guide/translation-rules.md`, `guide/collections-rules.md`, `guide/port-map.md`,
  `guide/inventory.md`, `guide/roadmap.md`
- `showcase/`, which is generated per locale by `docs-site/copy-goldens.mjs`

Every locale links to the English-only pages unprefixed, and the nav marks them with the locale's
`englishOnly` label. The generated `<prefix>/showcase/` pages link with the locale prefix.

## Keeping translations current

Each translated page carries front matter `sourceHash: <sha256 of its English source>`. For
`conformance.md` and `guide/architecture.md` the source is the file(s) under `docs/`. Compute the
hash with:

```bash
node scripts/i18n-hash.mjs <english path>
```

When the English source changes, the hash no longer matches: the build still passes, and the page
shows a `StaleBanner` linking to the current English page. `npm run docs:i18n-status` lists, per
locale, missing and stale pages, and always exits 0. To refresh a page, re-translate it and update
its `sourceHash`.

Pages that are `<!--@include: ../docs/...-->` wrappers take their text from the repository `docs/`
tree. Relative links inside the included text would resolve against the wrapper's URL and go dead,
so `config.ts` rewrites them (`rewriteIncludedHref`) to the site's canonical pages.

## On-call

A Pages deploy failure leaves the previous deployment live; nothing is torn down. Re-run the
`deploy` job (or dispatch the `Docs` workflow) once the cause is fixed.

### GitHub Packages auth

- **Detection:** `npm ci` fails in the `ci` or `Docs` workflow with `E401` or `E404` on
  `@knowvah/theme`.
- **Mitigation:** check, in order: the workflow's `permissions` has `packages: read`; the `npm ci`
  step sets `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`; the `setup-node` step has
  `registry-url: https://npm.pkg.github.com` and `scope: '@knowvah'`; `.npmrc` still maps
  `@knowvah:registry` to `https://npm.pkg.github.com`. Locally, `~/.npmrc` needs an
  `//npm.pkg.github.com/:_authToken=...` line with a token that has `read:packages`.

### Stale translation

- **Detection:** a locale page shows the stale banner, or `npm run docs:i18n-status` lists it. This
  never fails the build.
- **Mitigation:** re-translate the page from the current English source, then refresh its
  `sourceHash` with `node scripts/i18n-hash.mjs <english path>`.

### Completeness gate

- **Detection:** `npm run docs:build` throws
  `Locale "<p>" is registered ... missing N of M pages`, listing each missing path.
- **Mitigation:** write the missing pages, or delete `docs-site/.vitepress/locales/<p>.ts` to
  de-register the locale until they exist.
