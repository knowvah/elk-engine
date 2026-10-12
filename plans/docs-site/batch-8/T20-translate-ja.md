<!-- SPDX-License-Identifier: EPL-2.0 -->

# T20 — Translate the docs site into Japanese (`ja`, `ja-JP`)

**Commit:** `feat(docs): translate the docs site into japanese` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `ja`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/ja.ts` and `site/ja/`, and
`../dot-engine/docs-site/.vitepress/locales/ja.ts`, for tone and formality.

## Write-set
`docs-site/ja/**`, `docs-site/.vitepress/locales/ja.ts`,
`docs-site/.vitepress/locales/goldens/ja.json`.

## Acceptance criteria
- Given T20, when `npm test` runs, then translation lint passes for `ja`.
- Given T20, when `npm run docs:build` runs, then `dist/ja/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `ja`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
