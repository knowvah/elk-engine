<!-- SPDX-License-Identifier: EPL-2.0 -->

# T26 — Translate the docs site into Romanian (`ro`, `ro-RO`)

**Commit:** `feat(docs): translate the docs site into romanian` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `ro`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/ro.ts` and `site/ro/`, and
`../dot-engine/docs-site/.vitepress/locales/ro.ts`, for tone and formality.

## Write-set
`docs-site/ro/**`, `docs-site/.vitepress/locales/ro.ts`,
`docs-site/.vitepress/locales/goldens/ro.json`.

## Acceptance criteria
- Given T26, when `npm test` runs, then translation lint passes for `ro`.
- Given T26, when `npm run docs:build` runs, then `dist/ro/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `ro`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
