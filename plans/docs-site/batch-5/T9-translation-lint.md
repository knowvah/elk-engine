<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9 — Translation lint

**Agent:** typescript-pro · **Commit:** `test(docs): lint translated pages against their english source`

## Context
The mechanical half of translation review (translation-spec.md "Hard rules"): what can be verified
without reading the language. Runs against every registered locale and against fixtures that
plant one defect per check.

## Task
1. `test/helpers/docs.ts` (adapt dot-engine's): `splitFrontMatter`, `scanFences`, `parsePage`,
   `extractInternalLinks`, `loadPage`, `listTranslatedPages`, `englishPathFor`, `staticAssetsOf`,
   `englishOnlyMatcher`, `checkFences` (byte-identical, same order), `checkLinks` (prefixed except
   English-only; static assets and external URLs allowed), `checkComponents` (locale control
   strings used where English used `EN_COMPONENTS` ones), `checkFrontMatter` (`sourceHash` present,
   64 hex, equals `hashSource(englishSourceFor(page))` → otherwise reported as stale, not failing),
   `checkComponentTags` (same `<GoldenGallery>`/`<ElkDiagram>` tags), `CHECKS`, `lintPage`.
2. `test/docs/translation-lint.test.ts`: for every registered locale, every page passes with zero
   violations; the `locales/*.ts` set equals `Object.keys(LOCALES)`; golden descriptions complete
   per `localizeGoldens`. Fixtures under `test/docs/fixtures/lint/` plant one defect per check.

## Write-set
`test/helpers/docs.ts`, `test/docs/translation-lint.test.ts`, `test/docs/fixtures/lint/**`.

## Read-set
- `../translation-spec.md#hard-rules`
- `../dot-engine/test/helpers/docs.ts` (all), `../dot-engine/test/docs/translation-lint.test.ts` (all),
  `../dot-engine/test/docs/fixtures/lint/` (layout)
- `docs-site/.vitepress/i18n.ts` (T2), `scripts/i18n-hash.mjs` (T7), `docs-site/copy-goldens.mjs` (T5)

## Acceptance criteria
- Given fixtures planting one defect each (fence, link, component string, front matter, tag), then
  each is reported by exactly its check and no other.
- Given zero registered locales, then the suite passes.
- Given a translated fixture page with a correct `sourceHash`, then `lintPage` returns `[]`.

## Quality bar
README gates; functions ≤ 30 NLOC in `test/helpers/docs.ts` (the hook skips `test/`, the gate
does not); SPDX; no `any`.

## Observability
N/A.

## Rollback
Reversible — revert the commit.

## Boundaries
Only the three paths above. No locale content.
