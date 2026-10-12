<!-- SPDX-License-Identifier: EPL-2.0 -->

# T13 — Translate the docs site into Spanish (`es`, `es-ES`)

**Commit:** `feat(docs): translate the docs site into spanish` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `es`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/es.ts` and `site/es/`, and
`../dot-engine/docs-site/.vitepress/locales/es.ts`, for tone and formality.

## Write-set
`docs-site/es/**`, `docs-site/.vitepress/locales/es.ts`,
`docs-site/.vitepress/locales/goldens/es.json`.

## Acceptance criteria
- Given T13, when `npm test` runs, then translation lint passes for `es`.
- Given T13, when `npm run docs:build` runs, then `dist/es/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `es`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
