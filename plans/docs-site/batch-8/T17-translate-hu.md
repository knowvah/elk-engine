<!-- SPDX-License-Identifier: EPL-2.0 -->

# T17 — Translate the docs site into Hungarian (`hu`, `hu-HU`)

**Commit:** `feat(docs): translate the docs site into hungarian` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `hu`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/hu.ts` and `site/hu/`, and
`../dot-engine/docs-site/.vitepress/locales/hu.ts`, for tone and formality.

## Write-set
`docs-site/hu/**`, `docs-site/.vitepress/locales/hu.ts`,
`docs-site/.vitepress/locales/goldens/hu.json`.

## Acceptance criteria
- Given T17, when `npm test` runs, then translation lint passes for `hu`.
- Given T17, when `npm run docs:build` runs, then `dist/hu/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `hu`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
