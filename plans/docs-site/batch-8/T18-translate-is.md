<!-- SPDX-License-Identifier: EPL-2.0 -->

# T18 — Translate the docs site into Icelandic (`is`, `is-IS`)

**Commit:** `feat(docs): translate the docs site into icelandic` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `is`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/is.ts` and `site/is/`, and
`../dot-engine/docs-site/.vitepress/locales/is.ts`, for tone and formality.

## Write-set
`docs-site/is/**`, `docs-site/.vitepress/locales/is.ts`,
`docs-site/.vitepress/locales/goldens/is.json`.

## Acceptance criteria
- Given T18, when `npm test` runs, then translation lint passes for `is`.
- Given T18, when `npm run docs:build` runs, then `dist/is/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `is`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
