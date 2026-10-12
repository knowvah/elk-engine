<!-- SPDX-License-Identifier: EPL-2.0 -->

# T21 — Translate the docs site into Korean (`ko`, `ko-KR`)

**Commit:** `feat(docs): translate the docs site into korean` — glossary terms in the body.

Follow [T10](../batch-6/T10-translate-de.md)'s procedure and
[translation-spec.md](../translation-spec.md) exactly, with `<p>` = `ko`. Agents read the reviewed
German page alongside the English source. Unlike German, a lint failure that survives one
re-dispatch **quarantines this locale** (no module written, no commit; journal entry) and the batch
continues.

Register: match `~/git/knowvah/dot-atlassian/site/.vitepress/locales/ko.ts` and `site/ko/`, and
`../dot-engine/docs-site/.vitepress/locales/ko.ts`, for tone and formality.

## Write-set
`docs-site/ko/**`, `docs-site/.vitepress/locales/ko.ts`,
`docs-site/.vitepress/locales/goldens/ko.json`.

## Acceptance criteria
- Given T21, when `npm test` runs, then translation lint passes for `ko`.
- Given T21, when `npm run docs:build` runs, then `dist/ko/` has the 6 pages plus `showcase/`.
- `npm run docs:i18n-status` reports `ko`: 0 missing, 0 stale, 0 missing golden ids.

## Observability / Rollback
N/A. Reversible — revert de-registers the locale.
