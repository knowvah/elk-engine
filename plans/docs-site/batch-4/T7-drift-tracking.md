<!-- SPDX-License-Identifier: EPL-2.0 -->

# T7 — Drift tracking: sourceHash, stale banner, status report

**Agent:** typescript-pro · **Commit:** `feat(docs): flag translations that lag their english source`

## Context
D9: translated pages carry the SHA-256 of their English source; a mismatch shows a localized
banner and is listed by `npm run docs:i18n-status`. The build never fails on staleness.

## Task
1. `scripts/i18n-hash.mjs` (adapt dot-engine's): `INCLUDED_SOURCES` per decisions.md#canonical
   (`conformance.md` → `docs/conformance.md`; `guide/architecture.md` → `[docs/architecture/overview.md,
   docs/architecture/component-map.md]`), `englishSourceFor(localePagePath) → string[]`,
   `hashSource(paths) → sha256 hex of the concatenated bytes in order`, `parseSourceHash(md)`,
   `LOCALE_PREFIX_PATTERN`, CLI `node scripts/i18n-hash.mjs <path>` (accepts an English path or a
   locale page path).
2. `scripts/docs-i18n-status.mjs` (adapt): per locale list missing pages, stale pages, unhashed
   pages, pages whose source is gone, missing golden ids (via T5's `localizeGoldens`); `--write-hashes`
   writes `.vitepress/i18n-hashes.json` (`{ "<locale page>": "<English URL>" }`) and prints nothing;
   always exit 0. Page sets mirror `assertLocaleComplete` (duplicate the exclude list; a test pins
   it to `i18n.ts`).
3. `theme/StaleBanner.vue` (adapt) reading `i18n-hashes.json` via a `?raw`-free import with a
   fallback when the file is absent; `theme/index.ts` adds the `doc-before` layout slot.
4. `package.json`: `docs:i18n-status`, `docs:i18n-hashes`; chain `docs:i18n-hashes` into `docs:dev`
   and `docs:build` before `vitepress`.
5. `test/docs/i18n-status.test.ts`: fixtures for fresh, stale, unhashed; the exclude-list pin.

## Write-set
`scripts/i18n-hash.mjs`, `scripts/docs-i18n-status.mjs`,
`docs-site/.vitepress/theme/StaleBanner.vue`, `docs-site/.vitepress/theme/index.ts`,
`package.json`, `test/docs/i18n-status.test.ts`.

## Read-set
- `../decisions.md#drift`, `#canonical`
- `../dot-engine/scripts/i18n-hash.mjs` (all), `scripts/docs-i18n-status.mjs` (all),
  `docs-site/.vitepress/theme/StaleBanner.vue`, `theme/index.ts`, `test/docs/i18n-status.test.ts`
- `docs-site/.vitepress/i18n.ts` (T2: `TRANSLATABLE_EXCLUDES`), `docs-site/copy-goldens.mjs` (T5 exports)

## Interface contract (outputs, consumed by T9 and the translation agents)
`hashSource(paths: string | string[]): string` (64 lowercase hex), `englishSourceFor(localePath): string[]`,
`parseSourceHash(md): string | null`, `INCLUDED_SOURCES`.

## Acceptance criteria
- Given a fixture page whose `sourceHash` equals `hashSource(english)`, when status runs, then it is
  not stale; after editing the English fixture, it is.
- Given `docs-site/xx/guide/architecture.md`, then `englishSourceFor` returns the two
  `docs/architecture/` paths in order.
- Given a stale page on a registered fixture locale, when the site builds, then the HTML contains
  the locale's `staleNotice` and a link to the English URL.
- `npm run docs:i18n-status` exits 0 with stale pages present.

## Quality bar
README gates; SPDX; functions ≤ 30 NLOC.

## Observability
N/A — the status script is the signal.

## Rollback
Reversible — revert the commit.

## Boundaries
Do not edit `i18n.ts` or `config.ts` (T2). `.gitignore` already covers `i18n-hashes.json` (T5).
