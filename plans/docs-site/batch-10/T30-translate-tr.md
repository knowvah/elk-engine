<!-- SPDX-License-Identifier: EPL-2.0 -->

# T30 — Translate the docs site into Turkish (`tr`, `tr-TR`)

**Commit:** `feat(docs): translate the docs site into turkish` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `tr`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/tr.ts` and `site/tr/`, and
`../dot-engine/docs-site/.vitepress/locales/tr.ts`, for tone and formality.

## Write-set
`docs-site/tr/**`, `docs-site/.vitepress/locales/tr.ts`,
`docs-site/.vitepress/locales/goldens/tr.json`.

## Acceptance criteria
- Given T30, when `npm test` runs, then translation lint passes for `tr`.
- Given T30, when `npm run docs:build` runs, then `dist/tr/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `tr`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
