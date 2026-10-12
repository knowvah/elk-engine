<!-- SPDX-License-Identifier: EPL-2.0 -->

# T16 — Translate the docs site into French (`fr`, `fr-FR`)

**Commit:** `feat(docs): translate the docs site into french` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `fr`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/fr.ts` and `site/fr/`, and
`../dot-engine/docs-site/.vitepress/locales/fr.ts`, for tone and formality.

## Write-set
`docs-site/fr/**`, `docs-site/.vitepress/locales/fr.ts`,
`docs-site/.vitepress/locales/goldens/fr.json`.

## Acceptance criteria
- Given T16, when `npm test` runs, then translation lint passes for `fr`.
- Given T16, when `npm run docs:build` runs, then `dist/fr/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `fr`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
