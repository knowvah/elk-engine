<!-- SPDX-License-Identifier: EPL-2.0 -->

# T19 — Translate the docs site into Italian (`it`, `it-IT`)

**Commit:** `feat(docs): translate the docs site into italian` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `it`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/it.ts` and `site/it/`, and
`../dot-engine/docs-site/.vitepress/locales/it.ts`, for tone and formality.

## Write-set
`docs-site/it/**`, `docs-site/.vitepress/locales/it.ts`,
`docs-site/.vitepress/locales/goldens/it.json`.

## Acceptance criteria
- Given T19, when `npm test` runs, then translation lint passes for `it`.
- Given T19, when `npm run docs:build` runs, then `dist/it/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `it`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
