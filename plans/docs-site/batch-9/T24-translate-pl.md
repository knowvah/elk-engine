<!-- SPDX-License-Identifier: EPL-2.0 -->

# T24 — Translate the docs site into Polish (`pl`, `pl-PL`)

**Commit:** `feat(docs): translate the docs site into polish` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `pl`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/pl.ts` and `site/pl/`, and
`../dot-engine/docs-site/.vitepress/locales/pl.ts`, for tone and formality.

## Write-set
`docs-site/pl/**`, `docs-site/.vitepress/locales/pl.ts`,
`docs-site/.vitepress/locales/goldens/pl.json`.

## Acceptance criteria
- Given T24, when `npm test` runs, then translation lint passes for `pl`.
- Given T24, when `npm run docs:build` runs, then `dist/pl/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `pl`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
