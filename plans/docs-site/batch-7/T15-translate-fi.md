<!-- SPDX-License-Identifier: EPL-2.0 -->

# T15 — Translate the docs site into Finnish (`fi`, `fi-FI`)

**Commit:** `feat(docs): translate the docs site into finnish` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `fi`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/fi.ts` and `site/fi/`, and
`../dot-engine/docs-site/.vitepress/locales/fi.ts`, for tone and formality.

## Write-set
`docs-site/fi/**`, `docs-site/.vitepress/locales/fi.ts`,
`docs-site/.vitepress/locales/goldens/fi.json`.

## Acceptance criteria
- Given T15, when `npm test` runs, then translation lint passes for `fi`.
- Given T15, when `npm run docs:build` runs, then `dist/fi/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `fi`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
