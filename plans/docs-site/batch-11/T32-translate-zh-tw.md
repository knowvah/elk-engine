<!-- SPDX-License-Identifier: EPL-2.0 -->

# T32 — Translate the docs site into Traditional Chinese (`zh-tw`, `zh-TW`)

**Commit:** `feat(docs): translate the docs site into traditional chinese` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `zh-tw`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/zh-tw.ts` and `site/zh-tw/`, and
`../dot-engine/docs-site/.vitepress/locales/zh-tw.ts`, for tone and formality.

## Write-set
`docs-site/zh-tw/**`, `docs-site/.vitepress/locales/zh-tw.ts`,
`docs-site/.vitepress/locales/goldens/zh-tw.json`.

## Acceptance criteria
- Given T32, when `npm test` runs, then translation lint passes for `zh-tw`.
- Given T32, when `npm run docs:build` runs, then `dist/zh-tw/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `zh-tw`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
